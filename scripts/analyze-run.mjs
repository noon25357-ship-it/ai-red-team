// Explain a saved run: every JEV decision in order, model check, and why it ended.
// Usage: npm run analyze-run                 (latest run in outputs/runs/)
//        npm run analyze-run -- <file.json>
//        EXPECT_MODEL=jev-1.13.0 npm run analyze-run
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { OUTPUTS } from "../creative-os/assets.mjs";

const expectModel = process.env.EXPECT_MODEL ?? "jev-1.13.0";
let file = process.argv[2];
if (!file) {
  const runs = (await readdir(path.join(OUTPUTS, "runs"))).filter((f) => f.endsWith(".json")).sort();
  if (!runs.length) { console.error("No runs in outputs/runs/"); process.exit(1); }
  file = path.join(OUTPUTS, "runs", runs.at(-1));
}
const run = JSON.parse(await readFile(file, "utf8"));
const mmss = (t) => `${String(Math.floor(t / 60000)).padStart(2, "0")}:${String(Math.floor(t / 1000) % 60).padStart(2, "0")}`;
const pct = (x) => `${Math.round(x * 100)}%`;

console.log(`run ${run.runId}  status ${run.status}  steps ${run.steps}/${run.maxSteps ?? "?"}  JEV calls ${run.jevCalls}\n`);
console.log("#   time   kind        skill     decision                         confidence  latency  model");
let n = 0;
const picks = [];
for (const e of run.events) {
  if (e.type === "jev_decision") {
    n++;
    let skill = e.skill ?? "", decision, conf;
    if (e.kind === "next_skill") {
      const a = e.answers.next_skill;
      skill = a.decision; decision = `next → ${a.decision}`; conf = a.confidence;
      picks.push(a.decision);
    } else if (e.kind === "review") {
      const { quality, acceptable, action } = e.answers;
      decision = `${action.decision} (q ${Math.round((quality.decision / 4) * 100)}, ok ${acceptable.decision ? "yes" : "no"} ${pct(acceptable.confidence)})`;
      conf = action.confidence;
      skill += ` v${e.version}`;
    } else {
      decision = `worth_it ${e.answers.worth_it.decision}`; conf = e.answers.worth_it.confidence;
    }
    console.log(`${String(n).padEnd(3)} ${mmss(e.t)}  ${e.kind.padEnd(11)} ${skill.padEnd(9)} ${decision.padEnd(32)} ${pct(conf).padStart(10)}  ${String(e.latencyMs).padStart(5)}ms  ${e.model}`);
  } else if (e.type === "review_outcome") {
    console.log(`           → ${e.skill} v${e.version} ${e.outcome}: ${e.reason}`);
  } else if (e.type === "skill_not_connected" || e.type === "guard" || e.type === "error") {
    console.log(`           ! ${e.type}${e.skill ? " " + e.skill : ""}: ${e.reason ?? e.error?.message}`);
  }
}

console.log("\n== Model check");
const models = [...new Set(run.events.filter((e) => e.type === "jev_decision").map((e) => e.model))];
for (const m of models) console.log(`  ${m}  ${m === expectModel ? "OK" : /stub/i.test(m) ? "STUB — NOT JEV" : `≠ expected ${expectModel}`}`);
if (!models.length) console.log("  no JEV decisions in this run");

console.log("\n== Executions per skill");
const execs = {};
for (const e of run.events) if (e.type === "skill_started") (execs[e.skill] ??= []).push(e.version);
const reasons = {};
for (const e of run.events) if (e.type === "review_outcome") (reasons[e.skill] ??= []).push(`v${e.version} ${e.outcome}: ${e.reason}`);
for (const [s, v] of Object.entries(execs)) console.log(`  ${s.padEnd(9)} ran ${v.length}x  ${reasons[s]?.join(" | ") ?? ""}`);

console.log("\n== Diagnosis");
const findings = [];
const forced = run.events.filter((e) => e.type === "review_outcome" && e.reason === "JEV marked it not acceptable");
if (forced.length) findings.push(`${forced.length} retr${forced.length > 1 ? "ies were" : "y was"} forced by the orchestrator although JEV answered CONTINUE (old logic): ${forced.map((e) => `${e.skill} v${e.version}`).join(", ")}`);
const retries = run.events.filter((e) => e.type === "review_outcome" && e.outcome === "RETRY").length;
if (retries) findings.push(`${retries} retry execution(s) consumed steps`);
const repicked = picks.filter((p, i) => p !== "DONE" && picks.indexOf(p) !== i);
if (repicked.length) findings.push(`next_skill picked an already-chosen skill again: ${[...new Set(repicked)].join(", ")}`);
for (let i = 2; i < picks.length; i++) if (picks[i] === picks[i - 1] && picks[i] === picks[i - 2]) { findings.push(`loop: ${picks[i]} picked 3 times in a row`); break; }
if (run.status === "STOPPED_MAX_STEPS") {
  const open = Object.keys(execs).length + run.events.filter((e) => e.type === "skill_not_connected").length;
  const total = run.events.find((e) => e.type === "run_started")?.skills.length ?? 6;
  findings.push(`stopped at the step cap with ${total - open} skill(s) never started; ${run.steps} steps = ${run.steps - retries} first runs/picks + ${retries} retries`);
}
console.log(findings.length ? findings.map((f) => `  - ${f}`).join("\n") : "  - nothing abnormal");
