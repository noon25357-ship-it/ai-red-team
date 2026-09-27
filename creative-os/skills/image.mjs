// IMAGE: Claude authors a real SVG, Playwright rasterizes it to PNG. A vector illustration, not an image model.
import { writeFile } from "node:fs/promises";
import { claude, unfence } from "../llm.mjs";
import { assetPath, finalizeAsset } from "../assets.mjs";
import { getBrowser, watchPage } from "../browser.mjs";
import { fileFacts, pngSize, checks } from "../evidence.mjs";

const W = 1600, H = 900;

export const image = {
  name: "IMAGE",
  label: "VECTOR IMAGE · LLM AUTHORED",
  description: `Hero key visual: a ${W}x${H} SVG illustration written by Claude and rasterized to PNG. Vector art, not a photographic image model.`,
  engine: "claude -p → SVG → Playwright PNG",
  status: "CONNECTED",
  costEstimate: { usd: 0, billing: "Claude plan usage via claude -p (approved); rasterizing is local" },
  inputSchema: { brief: "object", feedback: "string?" },
  outputSchema: { svg: "file", png: `file ${W}x${H}` },
  async execute({ runId, brief, version, feedback }) {
    const prompt = `Create the hero key visual for this campaign as a single standalone SVG.
Brief: ${brief.text}
Brand name: ${brief.brand}. Product: ${brief.product}.
Requirements: <svg> root with width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"; premium, dark, luxurious art direction; a perfume bottle as the hero; the brand name as text; no <script>, no <image>, no external references or fonts (use generic font families); gradients and filters are fine.
Return ONLY the SVG markup.${feedback ? `\nThe previous version was rejected. Fix this: ${feedback}` : ""}`;
    const r = await claude(prompt);
    const svg = unfence(r.text);
    const svgFile = assetPath(runId, "IMAGE", version, "svg");
    const pngFile = assetPath(runId, "IMAGE", version, "png");
    await writeFile(svgFile, svg);

    const page = await (await getBrowser()).newPage({ viewport: { width: W, height: H } });
    const w = watchPage(page);
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">${svg}</body></html>`);
    const info = await page.evaluate(() => {
      const el = document.querySelector("svg");
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { renderedWidth: Math.round(b.width), renderedHeight: Math.round(b.height), elements: el.querySelectorAll("*").length,
        texts: [...el.querySelectorAll("text")].map((t) => t.textContent.trim()).filter(Boolean).slice(0, 12) };
    });
    await page.screenshot({ path: pngFile, clip: { x: 0, y: 0, width: W, height: H } });
    await page.close();

    const png = await pngSize(pngFile);
    const validation = checks([
      ["SVG root present", Boolean(info)],
      [`rendered at ${W}x${H}`, info?.renderedWidth === W && info?.renderedHeight === H, info && `${info.renderedWidth}x${info.renderedHeight}`],
      ["no <script>", !/<script/i.test(svg)],
      ["no external references", !/(href|src)\s*=\s*["']https?:/i.test(svg)],
      ["brand name in SVG text", (info?.texts ?? []).some((t) => t.toUpperCase().includes(brief.brand.toUpperCase())), info?.texts.join(" | ")],
      ["no console/page errors", !w.consoleErrors.length && !w.pageErrors.length, [...w.consoleErrors, ...w.pageErrors].join("; ") || undefined],
      [`PNG is ${W}x${H}`, png.width === W && png.height === H, `${png.width}x${png.height}`],
    ]);
    const asset = await finalizeAsset({ runId, skill: "IMAGE", version, file: pngFile, evidence: {
      kind: "vector illustration authored by an LLM (not an AI image model)",
      files: [await fileFacts(pngFile), await fileFacts(svgFile)],
      dimensions: png,
      svg_elements: info?.elements ?? 0,
      svg_text: info?.texts ?? [],
      screenshots: [(await fileFacts(pngFile)).path],
      console_errors: [...w.consoleErrors, ...w.pageErrors],
      validation,
      generator: { tool: "claude -p", model: r.model, durationMs: r.durationMs, outputTokens: r.outputTokens, reportedCostUsdListPrice: r.reportedCostUsd },
    } });
    return { asset };
  },
};
