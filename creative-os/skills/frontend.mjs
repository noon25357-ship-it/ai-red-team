// FRONTEND: local landing page composed from the campaign's current IMAGE and COPY assets ($0).
import path from "node:path";
import { writeAsset, ROOT, OUTPUTS, DIRS } from "../assets.mjs";
import { esc, palette } from "./brand.mjs";

export const frontend = {
  name: "FRONTEND",
  description: "Launch landing page (static HTML) that reuses the hero image and copy when they exist.",
  engine: "local-html-template",
  status: "CONNECTED",
  costEstimate: { usd: 0, note: "local" },
  inputSchema: { brief: "object", heroImage: "asset?", copy: "asset?", version: "number" },
  outputSchema: { file: "string (html)", sections: "string[]", usesHeroImage: "boolean", usesCopy: "boolean" },
  async execute({ runId, brief, version, context }) {
    const p = palette(version);
    const img = context.assets.IMAGE;
    const cp = context.assets.COPY?.data;
    const heroSrc = img ? path.relative(path.join(OUTPUTS, DIRS.FRONTEND), path.join(ROOT, img.asset.file)) : null;
    const headline = cp?.headline ?? brief.brand;
    const tagline = cp?.tagline ?? brief.product;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(brief.brand)} — ${esc(brief.product)}</title><style>
body{margin:0;background:${p.bg};color:${p.text};font-family:Georgia,serif}
header{display:flex;justify-content:space-between;padding:24px 6vw;letter-spacing:.4em;font-size:14px}
.hero{padding:4vh 6vw;text-align:center}.hero img{width:100%;max-width:1100px;border-radius:18px}
h1{font-size:clamp(32px,6vw,72px);margin:.4em 0 .2em;font-weight:400}p{color:${p.accent};font:18px/1.6 Helvetica,Arial,sans-serif}
.cta{display:inline-block;margin-top:24px;padding:14px 36px;border:1px solid ${p.accent};color:${p.text};text-decoration:none;letter-spacing:.3em}
footer{padding:40px 6vw;opacity:.5;font:13px Helvetica,Arial,sans-serif}
</style></head><body>
<header><span>${esc(brief.brand)}</span><span>SHOP</span></header>
<section class="hero">${heroSrc ? `<img src="${esc(heroSrc)}" alt="${esc(brief.product)}">` : ""}<h1>${esc(headline)}</h1><p>${esc(tagline)}</p><a class="cta" href="#">DISCOVER</a></section>
<footer>${esc(brief.brand)} · ${esc(brief.product)}</footer>
</body></html>`;
    const asset = await writeAsset({ runId, skill: "FRONTEND", version, ext: "html", content: html });
    return {
      asset,
      evidence: {
        format: "static HTML", sections: ["header", "hero", "headline + tagline", "CTA", "footer"],
        usesHeroImage: Boolean(img), usesCopy: Boolean(cp), headline, tagline, responsive: true, palette: p.name,
        generator: "local HTML template",
      },
    };
  },
};
