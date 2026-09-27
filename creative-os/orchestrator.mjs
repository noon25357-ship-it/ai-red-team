// JEV Orchestrator: JEV is the decision layer; skills only execute.
// Flow: brief -> JEV picks skill -> real output + evidence -> JEV review -> APPROVE / RETRY / HUMAN_REVIEW -> next -> final state.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";
import { decide, describeError } from "./jev.mjs";
import { nextSkillQuestions, reviewQuestions, costGuardQuestions, qualityToPercent, reviewOutcome } from "./decisions.mjs";
import { SKILLS, getSkill, describeSkills } from "./skills/registry.mjs";
import { ensureOutputDirs, writeMeta, OUTPUTS, ROOT } from "./assets.mjs";
import { closeBrowser } from "./browser.mjs";

const FINAL = new Set(["APPROVED", "HUMAN_REVIEW", "NOT CONNECTED", "BLOCKED"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** DONE only when every connected skill is APPROVED (by JEV, or by a human after HUMAN_REVIEW). */
export function finalStatus(skillState) {
  const connected = SKILLS.filter((s) => s.status === "CONNECTED").map((s) => s.name);
  if (connected.every((n) => skillState[n] === "APPROVED")) return "DONE";
  if (connected.some((n) => !FINAL.has(skillState[n]))) return "INCOMPLETE";
  return "AWAITING_HUMAN_REVIEW";
}

export async function runCreativeOS({ brief, emit = () => {}, paceMs = config.paceMs } = {}) {
  await ensureOutputDirs();
  const runId = `run-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-")}`;
  const t0 = performance.now();
  const events = [];
  const ev = (type, data = {}) => {
    const e = { t: Math.round(performance.now() - t0), type, ...data };
    events.push(e);
    emit(e);
    return e;
  };
  const pace = () => (paceMs > 0 ? sleep(paceMs) : undefined);

  const skillState = {};
  const attempts = {};
  const quality = {};
  const executions = {};
  const context = { assets: {}, skillState };
  const jevCalls = [];
  let steps = 0;
  let budgetRemaining = config.budgetUsd;
  let status = "RUNNING";

  const ask = async (kind, state, questions, extra = {}) => {
    ev("jev_thinking", { kind, ...extra });
    const d = await decide(state, questions);
    jevCalls.push({ kind, latencyMs: d.latencyMs, model: d.model, usage: d.usage });
    ev("jev_decision", { kind, ...extra, ...d });
    await pace();
    return d;
  };

  ev("run_started", { runId, brief, skills: describeSkills(), limits: {
    maxSteps: config.maxSteps, maxRetriesPerSkill: config.maxRetriesPerSkill,
    confidenceFloor: config.confidenceFloor, budgetUsd: config.budgetUsd, paceMs,
  } });
  // Skills without a provider are declared up front and never offered to JEV.
  for (const s of SKILLS.filter((s) => s.status !== "CONNECTED")) {
    skillState[s.name] = "NOT CONNECTED";
    ev("skill_not_connected", { skill: s.name, reason: `${s.name} has no provider configured; excluded from this run.` });
  }
  await pace();

  try {
    while (true) {
      const eligible = SKILLS.filter((s) => !FINAL.has(skillState[s.name]));
      if (eligible.length === 0) break;
      if (steps >= config.maxSteps) { ev("guard", { reason: `Max ${config.maxSteps} orchestration steps reached` }); status = "STOPPED_MAX_STEPS"; break; }

      let skill;
      if (eligible.length === 1) {
        // One skill left: nothing to decide, so no JEV call is spent on a forced choice.
        skill = eligible[0];
        ev("only_option", { skill: skill.name });
      } else {
        const pick = await ask("next_skill", {
          brief: brief.text,
          brand: brief.brand,
          step: steps + 1,
          max_steps: config.maxSteps,
          skills: SKILLS.map((s) => ({ skill: s.name, description: s.description, state: skillState[s.name] ?? "NOT RUN", quality: quality[s.name] ?? null })),
        }, nextSkillQuestions(eligible));
        const next = pick.answers.next_skill;
        if (next.confidence < config.confidenceFloor) {
          ev("guard", { reason: `Next-skill confidence ${next.confidence.toFixed(2)} is below ${config.confidenceFloor}` });
          status = "HUMAN_REVIEW";
          break;
        }
        skill = getSkill(next.decision);
      }
      steps++;

      // Cost guard: unknown or over-budget cost goes to a human without running; an affordable paid skill asks JEV first.
      const usd = skill.costEstimate?.usd;
      if (usd !== 0) {
        if (usd == null || usd > budgetRemaining) {
          skillState[skill.name] = "HUMAN_REVIEW";
          ev("guard", { skill: skill.name, reason: usd == null ? "Cost unknown" : `Estimated $${usd} exceeds remaining budget $${budgetRemaining}` });
          continue;
        }
        const g = await ask("cost_guard", { brief: brief.text, skill: skill.name, estimated_usd: usd, remaining_usd: budgetRemaining },
          costGuardQuestions(skill.name, usd, budgetRemaining), { skill: skill.name });
        if (!g.answers.worth_it.decision || g.answers.worth_it.confidence < config.confidenceFloor) {
          skillState[skill.name] = "BLOCKED";
          ev("guard", { skill: skill.name, reason: "Cost guard did not approve the spend" });
          continue;
        }
        budgetRemaining -= usd;
      }

      let feedback;
      while (true) {
        attempts[skill.name] = (attempts[skill.name] ?? 0) + 1;
        const version = attempts[skill.name];
        skillState[skill.name] = "RUNNING";
        ev("skill_started", { skill: skill.name, version, engine: skill.engine });
        await pace();

        let out;
        try {
          out = await skill.execute({ runId, brief, version, context, feedback });
        } catch (err) {
          // A failed execution has nothing to review; it goes to a human, never to an automatic retry.
          skillState[skill.name] = "HUMAN_REVIEW";
          executions[skill.name] = [...(executions[skill.name] ?? []), { version, outcome: "HUMAN_REVIEW", reason: `execution failed: ${err.message}` }];
          ev("skill_failed", { skill: skill.name, version, error: describeError(err) });
          await pace();
          break;
        }
        context.assets[skill.name] = out;
        ev("skill_completed", { skill: skill.name, version, asset: out.asset });
        await pace();

        const failedChecks = (out.asset.evidence.validation?.results ?? []).filter((r) => !r.pass).map((r) => r.check);
        const r = await ask("review", {
          brief: brief.text,
          skill: skill.name,
          skill_description: skill.description,
          attempt: version,
          retries_left: config.maxRetriesPerSkill - (version - 1),
          evidence: out.asset.evidence,
        }, reviewQuestions(), { skill: skill.name, version });

        const { review_action: action, quality_score: q, acceptable } = r.answers;
        quality[skill.name] = qualityToPercent(q.decision);
        const { outcome, reason } = reviewOutcome({ action, quality: quality[skill.name], acceptable, version, stepsLeft: config.maxSteps - steps, failedChecks });
        executions[skill.name] = [...(executions[skill.name] ?? []), { version, outcome, reason }];

        out.asset.status = outcome;
        out.asset.jevReview = {
          review_action: action.decision, quality_score: quality[skill.name], acceptable: acceptable.decision,
          confidence: { review_action: action.confidence, quality_score: q.confidence, acceptable: acceptable.confidence },
          probabilities: { review_action: action.probabilities, quality_score: q.probabilities, acceptable: acceptable.probabilities },
          latencyMs: r.latencyMs, model: r.model, outcome, reason,
        };
        await writeMeta(out.asset);
        skillState[skill.name] = outcome;
        ev("review_outcome", { skill: skill.name, version, outcome, reason, action: action.decision, qualityPercent: quality[skill.name], acceptable: acceptable.decision });
        await pace();

        if (outcome !== "RETRY") break;
        steps++;
        feedback = `JEV rated it ${quality[skill.name]}/100${failedChecks.length ? ` and these checks failed: ${failedChecks.join("; ")}` : ""}.`;
      }
    }
    if (status === "RUNNING") status = finalStatus(skillState);
  } catch (err) {
    status = "FAILED";
    ev("error", { error: describeError(err) });
  } finally {
    await closeBrowser();
  }

  const summary = {
    runId, status, steps, maxSteps: config.maxSteps, skillState, executions,
    assets: Object.fromEntries(Object.entries(context.assets).map(([k, v]) => [k, v.asset])),
    jevCalls: jevCalls.length,
    jevLatencyMs: jevCalls.reduce((s, c) => s + c.latencyMs, 0),
    models: [...new Set(jevCalls.map((c) => c.model))],
  };
  ev("run_finished", summary);
  const logFile = runLogPath(runId);
  await writeFile(logFile, JSON.stringify({ ...summary, brief, events }, null, 2));
  return { ...summary, log: path.relative(ROOT, logFile), events };
}

export const runLogPath = (runId) => path.join(OUTPUTS, "runs", `${path.basename(runId)}.json`);

/** Record a person's decision on a HUMAN_REVIEW skill and recompute the run status. */
export async function resolveHumanReview(runId, skill, decision) {
  const file = runLogPath(runId);
  const run = JSON.parse(await readFile(file, "utf8"));
  if (run.skillState[skill] !== "HUMAN_REVIEW") throw new Error(`${skill} is not waiting for human review`);
  run.skillState[skill] = decision === "approve" ? "APPROVED" : "REJECTED";
  const asset = run.assets[skill];
  if (asset) { asset.status = run.skillState[skill]; asset.humanReview = { decision, at: new Date().toISOString() }; await writeMeta(asset); }
  run.status = Object.values(run.skillState).includes("REJECTED") ? "INCOMPLETE" : finalStatus(run.skillState);
  run.events.push({ t: run.events.at(-1)?.t ?? 0, type: "human_review", skill, decision, status: run.status });
  await writeFile(file, JSON.stringify(run, null, 2));
  return { skill, decision, status: run.status, skillState: run.skillState };
}
