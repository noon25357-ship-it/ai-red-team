// REVIEW: final campaign aggregator, not a creative skill. It never regenerates anything.
// It collects the real outputs of the creative skills, validates them, and builds the one state JEV judges the campaign on.
import { writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { assetPath, finalizeAsset, ROOT } from "../assets.mjs";
import { fileFacts, pngSize, checks } from "../evidence.mjs";

export const CREATIVE = ["IMAGE", "COPY", "MOTION", "FRONTEND"];
const size = async (rel) => stat(path.join(ROOT, rel)).then((s) => s.size, () => 0);

/** The facts about one produced output that JEV needs, without the noise. */
function deliverable(skill, out, state) {
  const ev = out.asset.evidence;
  const d = {
    status: state,
    present: true,
    version: out.asset.version,
    file: out.asset.file,
    files: ev.files,
    validation: { passed: ev.validation.passed, failed: ev.validation.failed },
    failed_checks: ev.validation.results.filter((r) => !r.pass).map((r) => (r.detail ? `${r.check} (${r.detail})` : r.check)),
    skill_review: out.asset.jevReview && { review_action: out.asset.jevReview.review_action, quality_score: out.asset.jevReview.quality_score, acceptable: out.asset.jevReview.acceptable },
  };
  if (ev.dimensions) d.dimensions = ev.dimensions;
  if (ev.duration) d.duration = ev.duration;
  if (ev.screenshots) d.screenshots = ev.screenshots;
  if (ev.kind) d.kind = ev.kind;
  if (skill === "COPY") d.copy_text = ev.generated_content;
  if (skill === "IMAGE") d.text_in_image = ev.svg_text;
  if (skill === "FRONTEND") { d.headline = ev.content_summary?.h1; d.viewports = ev.viewports; }
  return d;
}

export const review = {
  name: "REVIEW",
  label: "FINAL CAMPAIGN REVIEW",
  description: "Final aggregator: collects every creative output with its evidence and validation, then JEV judges the whole campaign. Never regenerates itself.",
  engine: "file validation + JEV final review",
  status: "CONNECTED",
  aggregator: true,
  costEstimate: { usd: 0, billing: "local" },
  inputSchema: { context: "run state with all creative outputs and failures" },
  outputSchema: { file: "json report", state: "final JEV review state" },
  async execute({ runId, brief, version, context }) {
    const brand = brief.brand.toUpperCase();
    const deliverables = {};
    const list = [];
    const skipped = [];

    for (const skill of CREATIVE) {
      const state = context.skillState[skill] ?? "NOT RUN";
      const out = context.assets[skill];
      if (out && state !== "EXECUTION_FAILED") {
        deliverables[skill] = deliverable(skill, out, state);
        for (const f of out.asset.evidence.files ?? []) {
          const bytes = await size(f.path);
          list.push([`${skill}: ${path.basename(f.path)} exists and non-empty`, bytes > 0, `${bytes} bytes`]);
        }
      } else if (state === "EXECUTION_FAILED") {
        deliverables[skill] = { status: "EXECUTION_FAILED", present: false, reason: context.failures?.[skill]?.reason ?? "execution failed", technical_error: context.failures?.[skill]?.error };
        skipped.push(`${skill}: not produced (EXECUTION_FAILED)`);
      } else {
        deliverables[skill] = { status: state, present: false };
        skipped.push(`${skill}: not produced (${state})`);
      }
    }
    for (const [skill, state] of Object.entries(context.skillState)) {
      if (state === "NOT CONNECTED") deliverables[skill] = { status: "NOT CONNECTED", present: false, note: "No provider configured; declared before the run and not part of this campaign's scope." };
    }

    // Cross-asset checks run only when every asset they need exists; otherwise they are listed as skipped, never as passed.
    const img = context.assets.IMAGE?.asset, mot = context.assets.MOTION?.asset, fe = context.assets.FRONTEND?.asset, cp = context.assets.COPY?.data;
    const has = (s) => deliverables[s]?.present;
    const feHtml = has("FRONTEND") ? await readFile(path.join(ROOT, fe.file), "utf8") : "";
    const cross = [
      [["IMAGE"], "IMAGE PNG is 1600x900", async () => [(await pngSize(path.join(ROOT, img.file))).width === 1600]],
      [["MOTION"], "MOTION WebM larger than 10 KB", async () => { const b = await size(mot.file); return [b > 10_240, `${b} bytes`]; }],
      [["COPY"], "brand name in COPY", async () => [JSON.stringify(cp).toUpperCase().includes(brand)]],
      [["IMAGE"], "brand name in IMAGE text", async () => [(img.evidence.svg_text ?? []).some((t) => t.toUpperCase().includes(brand))]],
      [["FRONTEND"], "brand name in FRONTEND", async () => [feHtml.toUpperCase().includes(brand)]],
      [["FRONTEND", "IMAGE"], "FRONTEND uses the IMAGE", async () => [feHtml.includes(path.basename(img.file))]],
      [["FRONTEND", "COPY"], "FRONTEND uses the COPY headline", async () => [feHtml.includes(cp.headline_en) || feHtml.includes(cp.headline_ar)]],
    ];
    for (const [needs, name, run] of cross) {
      const missing = needs.filter((s) => !has(s));
      if (missing.length) { skipped.push(`${name}: skipped, ${missing.join(" + ")} not produced`); continue; }
      const [pass, detail] = await run();
      list.push([name, pass, detail]);
    }
    const validation = checks(list);

    const state = {
      review_type: "FINAL CAMPAIGN REVIEW — judge the whole campaign, not this report",
      brief: brief.text,
      brand: brief.brand,
      product: brief.product,
      deliverables,
      produced: CREATIVE.filter(has),
      execution_failed: CREATIVE.filter((s) => deliverables[s].status === "EXECUTION_FAILED"),
      not_produced: CREATIVE.filter((s) => !has(s)),
      local_validation: {
        passed: validation.passed,
        failed: validation.failed,
        failed_checks: validation.results.filter((r) => !r.pass).map((r) => r.check),
        skipped_checks: skipped,
      },
      notes: [
        "IMAGE is a vector illustration authored by an LLM (not a photographic image model).",
        "MOTION is motion graphics recorded from HTML/CSS/SVG (not a video model).",
        "A technical EXECUTION_FAILED is an infrastructure problem, not a quality judgement on the other outputs.",
      ],
    };

    const file = assetPath(runId, "REVIEW", version, "json");
    await writeFile(file, JSON.stringify({ state, validation }, null, 2));
    const asset = await finalizeAsset({ runId, skill: "REVIEW", version, file, evidence: {
      files: [await fileFacts(file)],
      validation,
      jev_final_state: state,
      generator: { tool: "local aggregator", model: null },
    } });
    return { asset, state };
  },
};
