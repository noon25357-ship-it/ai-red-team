// JEV Orchestrator: JEV is the decision layer; skills only execute.
// Flow: brief -> JEV picks skill -> execute -> evidence -> JEV review -> APPROVE / RETRY / HUMAN_REVIEW -> next -> DONE.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";
import { decide, describeError } from "./jev.mjs";
import { nextSkillQuestions, reviewQuestions, costGuardQuestions, qualityToPercent } from "./decisions.mjs";
import { SKILLS, getSkill, describeSkills } from "./skills/registry.mjs";
import { ensureOutputDirs, writeMeta, OUTPUTS, ROOT } from "./assets.mjs";

const FINAL = new Set(["APPROVED", "HUMAN_REVIEW", "NOT CONNECTED", "BLOCKED"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Map one JEV review to an outcome. The orchestrator never invents a retry:
 * RETRY happens only when JEV chose RETRY and its own answers give a clear reason
 * (not acceptable, or quality below RETRY_QUALITY_BELOW).
 */
const RETRY_QUALITY_BELOW = 50;
export function reviewOutcome({ q, acceptable, action, low, version, steps }) {
  if (low) return { outcome: "HUMAN_REVIEW", reason: `Low JEV confidence on review (< ${config.confidenceFloor})` };
  if (action.decision === "HUMAN_REVIEW") return { outcome: "HUMAN_REVIEW", reason: "JEV requested human review" };
  if (action.decision === "CONTINUE") {
    return acceptable.decision
      ? { outcome: "APPROVED", reason: `JEV approved (quality ${q}/100)` }
      : { outcome: "HUMAN_REVIEW", reason: "JEV said CONTINUE but not acceptable; conflicting, needs a human" };
  }
  // action === RETRY
  const why = [!acceptable.decision && "not acceptable", q < RETRY_QUALITY_BELOW && `quality ${q}/100`].filter(Boolean);
  if (why.length === 0) return { outcome: "APPROVED", reason: `JEV asked RETRY but rated it acceptable at ${q}/100; no clear reason to regenerate` };
  if (version - 1 >= config.maxRetriesPerSkill) return { outcome: "HUMAN_REVIEW", reason: `Retry limit (${config.maxRetriesPerSkill}) reached: ${why.join(", ")}` };
  if (steps >= config.maxSteps) return { outcome: "HUMAN_REVIEW", reason: `Step limit reached: ${why.join(", ")}` };
  return { outcome: "RETRY", reason: `JEV chose RETRY: ${why.join(", ")}` };
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
  const context = { assets: {}, skillState };
  const jevCalls = [];
  const executions = {};
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
  const lowConfidence = (d) => Object.values(d.answers).some((a) => a.confidence < config.confidenceFloor);

  ev("run_started", { runId, brief, skills: describeSkills(), limits: {
    maxSteps: config.maxSteps, maxRetriesPerSkill: config.maxRetriesPerSkill,
    confidenceFloor: config.confidenceFloor, budgetUsd: config.budgetUsd, paceMs,
  } });
  await pace();

  try {
    while (true) {
      const eligible = SKILLS.filter((s) => !FINAL.has(skillState[s.name]));
      if (eligible.length === 0) { status = "DONE"; break; }
      if (steps >= config.maxSteps) { ev("guard", { reason: `Max ${config.maxSteps} orchestration steps reached` }); status = "STOPPED_MAX_STEPS"; break; }

      const pick = await ask("next_skill", {
        brief: brief.text,
        brand: brief.brand,
        step: steps + 1,
        max_steps: config.maxSteps,
        skills: SKILLS.map((s) => ({
          skill: s.name, description: s.description, connected: s.status === "CONNECTED",
          state: skillState[s.name] ?? "NOT RUN", quality: quality[s.name] ?? null,
        })),
      }, nextSkillQuestions(eligible));
      const next = pick.answers.next_skill;

      if (next.confidence < config.confidenceFloor) {
        ev("guard", { reason: `Next-skill confidence ${next.confidence.toFixed(2)} is below ${config.confidenceFloor}` });
        status = "HUMAN_REVIEW";
        break;
      }
      if (next.decision === "DONE") { status = "DONE"; break; }

      const skill = getSkill(next.decision);
      // A skill in a final state is never re-run from next_skill; only an explicit JEV RETRY re-runs it (below).
      if (FINAL.has(skillState[skill.name])) {
        ev("guard", { skill: skill.name, reason: `${skill.name} is already ${skillState[skill.name]}; not re-running` });
        continue;
      }
      steps++;

      if (skill.status !== "CONNECTED") {
        skillState[skill.name] = "NOT CONNECTED";
        ev("skill_not_connected", { skill: skill.name, reason: `${skill.name} has no provider configured; nothing was executed.` });
        await pace();
        continue;
      }

      // Cost guard: only paid skills reach JEV; unknown or over-budget cost goes straight to a human.
      const usd = skill.costEstimate?.usd;
      if (usd !== 0) {
        if (usd == null || usd > budgetRemaining) {
          skillState[skill.name] = "HUMAN_REVIEW";
          ev("guard", { skill: skill.name, reason: usd == null ? "Cost unknown" : `Estimated $${usd} exceeds remaining budget $${budgetRemaining}` });
          await pace();
          continue;
        }
        const g = await ask("cost_guard", { brief: brief.text, skill: skill.name, estimated_usd: usd, remaining_usd: budgetRemaining },
          costGuardQuestions(skill.name, usd, budgetRemaining), { skill: skill.name });
        if (!g.answers.worth_it.decision || lowConfidence(g)) {
          skillState[skill.name] = g.answers.worth_it.decision ? "HUMAN_REVIEW" : "BLOCKED";
          ev("guard", { skill: skill.name, reason: "Cost guard did not approve the spend" });
          continue;
        }
        budgetRemaining -= usd;
      }

      // Execute, review, and retry at most maxRetriesPerSkill times.
      while (true) {
        attempts[skill.name] = (attempts[skill.name] ?? 0) + 1;
        const version = attempts[skill.name];
        skillState[skill.name] = "RUNNING";
        ev("skill_started", { skill: skill.name, version, engine: skill.engine });
        await pace();
        const out = await skill.execute({ runId, brief, version, context });
        context.assets[skill.name] = out;
        ev("skill_completed", { skill: skill.name, version, asset: out.asset, evidence: out.evidence });
        await pace();

        const r = await ask("review", {
          brief: brief.text,
          skill: skill.name,
          skill_description: skill.description,
          engine: skill.engine,
          attempt: version,
          retries_left: config.maxRetriesPerSkill - (version - 1),
          evidence: out.evidence,
        }, reviewQuestions(), { skill: skill.name, version });

        const { quality: q, acceptable, action } = r.answers;
        quality[skill.name] = qualityToPercent(q.decision);
        const { outcome, reason } = reviewOutcome({ q: quality[skill.name], acceptable, action, low: lowConfidence(r), version, steps });
        executions[skill.name] = [...(executions[skill.name] ?? []), { version, outcome, reason }];

        out.asset.status = outcome;
        out.asset.jevReview = {
          qualityPercent: quality[skill.name], acceptable: acceptable.decision, action: action.decision,
          confidence: { quality: q.confidence, acceptable: acceptable.confidence, action: action.confidence },
          latencyMs: r.latencyMs, model: r.model, outcome, reason,
        };
        await writeMeta(out.asset);
        skillState[skill.name] = outcome;
        ev("review_outcome", { skill: skill.name, version, outcome, reason, qualityPercent: quality[skill.name] });
        await pace();

        if (outcome !== "RETRY") break;
        steps++;
      }
    }
  } catch (err) {
    status = "FAILED";
    ev("error", { error: describeError(err) });
  }

  const summary = {
    runId, status, steps, maxSteps: config.maxSteps, skillState, executions,
    assets: Object.fromEntries(Object.entries(context.assets).map(([k, v]) => [k, v.asset])),
    jevCalls: jevCalls.length,
    jevLatencyMs: jevCalls.reduce((s, c) => s + c.latencyMs, 0),
    models: [...new Set(jevCalls.map((c) => c.model))],
  };
  ev("run_finished", summary);
  const logFile = path.join(OUTPUTS, "runs", `${runId}.json`);
  await writeFile(logFile, JSON.stringify({ ...summary, brief, events }, null, 2));
  return { ...summary, log: path.relative(ROOT, logFile), events };
}
