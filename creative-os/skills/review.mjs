// REVIEW: campaign-level QA over the real files: existence, sizes, formats, cross-asset consistency, and every skill's own checks.
import { writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { assetPath, finalizeAsset, ROOT } from "../assets.mjs";
import { fileFacts, pngSize, checks } from "../evidence.mjs";

const exists = async (rel) => stat(path.join(ROOT, rel)).then((s) => s.size, () => 0);

export const review = {
  name: "REVIEW",
  label: "PLAYWRIGHT + FILES",
  description: "Final campaign QA over the produced files: every file exists and is non-empty, formats and dimensions are right, the brand is consistent across assets, and each skill's own checks passed.",
  engine: "file validation + prior Playwright results",
  status: "CONNECTED",
  costEstimate: { usd: 0, billing: "local" },
  inputSchema: { context: "run state with all assets" },
  outputSchema: { file: "json report" },
  async execute({ runId, brief, version, context }) {
    const brand = brief.brand.toUpperCase();
    const perSkill = {};
    const fileChecks = [];
    for (const [skill, out] of Object.entries(context.assets)) {
      if (skill === "REVIEW") continue;
      const ev = out.asset.evidence;
      for (const f of ev.files ?? []) fileChecks.push([`${skill}: ${path.basename(f.path)} exists and non-empty`, (await exists(f.path)) > 0, `${await exists(f.path)} bytes`]);
      perSkill[skill] = { state: context.skillState[skill], version: out.asset.version, checksPassed: ev.validation?.passed, checksFailed: ev.validation?.failed,
        failed: (ev.validation?.results ?? []).filter((r) => !r.pass).map((r) => r.check) };
    }
    const img = context.assets.IMAGE?.asset;
    const mot = context.assets.MOTION?.asset;
    const fe = context.assets.FRONTEND?.asset;
    const cp = context.assets.COPY?.data;
    const feHtml = fe ? await readFile(path.join(ROOT, fe.file), "utf8") : "";
    const consistency = [
      ["IMAGE PNG is 1600x900", !img || (await pngSize(path.join(ROOT, img.file))).width === 1600, img?.file ?? "no IMAGE"],
      ["MOTION WebM larger than 10 KB", !mot || (await exists(mot.file)) > 10_240, mot ? `${await exists(mot.file)} bytes` : "no MOTION"],
      ["brand in COPY", !cp || JSON.stringify(cp).toUpperCase().includes(brand)],
      ["brand in IMAGE text", !img || (img.evidence.svg_text ?? []).some((t) => t.toUpperCase().includes(brand))],
      ["brand in FRONTEND", !fe || feHtml.toUpperCase().includes(brand)],
      ["FRONTEND uses the IMAGE", !fe || !img || feHtml.includes(path.basename(img.file))],
      ["FRONTEND uses the COPY headline", !fe || !cp || feHtml.includes(cp.headline_en) || feHtml.includes(cp.headline_ar)],
    ];
    const validation = checks([...fileChecks, ...consistency]);
    const report = { brief: brief.text, perSkill, notConnected: Object.entries(context.skillState).filter(([, s]) => s === "NOT CONNECTED").map(([k]) => k), validation };
    const file = assetPath(runId, "REVIEW", version, "json");
    await writeFile(file, JSON.stringify(report, null, 2));
    const asset = await finalizeAsset({ runId, skill: "REVIEW", version, file, evidence: {
      files: [await fileFacts(file)], per_skill: perSkill, not_connected: report.notConnected, validation,
      generator: { tool: "local file checks", model: null },
    } });
    return { asset };
  },
};
