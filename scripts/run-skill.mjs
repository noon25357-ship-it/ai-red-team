// Run skills for real without JEV, to test execution and evidence in isolation.
// Usage: npm run skill -- COPY IMAGE FRONTEND   (in order; later skills see earlier outputs)
import { DEMO_BRIEF } from "../creative-os/config.mjs";
import { getSkill } from "../creative-os/skills/registry.mjs";
import { ensureOutputDirs } from "../creative-os/assets.mjs";
import { closeBrowser } from "../creative-os/browser.mjs";

const names = process.argv.slice(2).map((s) => s.toUpperCase());
if (!names.length) { console.error("Usage: npm run skill -- <SKILL> [SKILL...]"); process.exit(1); }
await ensureOutputDirs();
const runId = `skilltest-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-")}`;
const context = { assets: {}, skillState: {} };
let failed = false;
try {
  for (const name of names) {
    const skill = getSkill(name);
    if (!skill) throw new Error(`Unknown skill ${name}`);
    const t0 = performance.now();
    try {
      const out = await skill.execute({ runId, brief: DEMO_BRIEF, version: 1, context });
      context.assets[name] = out;
      context.skillState[name] = "APPROVED";
      const ev = out.asset.evidence;
      console.log(`\n== ${name} (${Math.round(performance.now() - t0)} ms)  ${out.asset.file}`);
      console.log(`generator: ${JSON.stringify(ev.generator)}`);
      console.log(`files: ${ev.files.map((f) => `${f.path} (${f.bytes} B)`).join(", ")}`);
      if (ev.dimensions) console.log(`dimensions: ${JSON.stringify(ev.dimensions)}`);
      if (ev.duration) console.log(`duration: ${JSON.stringify(ev.duration)}`);
      if (ev.screenshots) console.log(`screenshots: ${ev.screenshots.join(", ")}`);
      if (ev.generated_content) console.log(`content: ${JSON.stringify(ev.generated_content, null, 1)}`);
      console.log(`validation: ${ev.validation.passed} passed, ${ev.validation.failed} failed`);
      for (const r of ev.validation.results) console.log(`  ${r.pass ? "✓" : "✗"} ${r.check}${r.detail ? `  (${r.detail})` : ""}`);
    } catch (err) {
      failed = true;
      console.log(`\n== ${name} FAILED: ${err.message}`);
    }
  }
} finally {
  await closeBrowser();
}
process.exit(failed ? 1 : 0);
