// IMAGE: local SVG key-visual composer (no model, no API, $0).
import { writeAsset } from "../assets.mjs";
import { esc, palette } from "./brand.mjs";

export const image = {
  name: "IMAGE",
  description: "Hero key visual for the campaign (1600x900 SVG composed locally from a brand template).",
  engine: "local-svg-template",
  status: "CONNECTED",
  costEstimate: { usd: 0, note: "local" },
  inputSchema: { brief: "object", brand: "string", product: "string", version: "number" },
  outputSchema: { file: "string (svg)", width: "number", height: "number", palette: "string", layers: "string[]" },
  async execute({ runId, brief, version }) {
    const p = palette(version);
    const centered = version % 2 === 1;
    const bx = centered ? 800 : 1080;
    const tx = centered ? 800 : 140;
    const anchor = centered ? "middle" : "start";
    const ty = centered ? 760 : 420;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
<defs>
<radialGradient id="glow" cx="${bx / 16}%" cy="42%" r="45%"><stop offset="0" stop-color="${p.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${p.bg}" stop-opacity="0"/></radialGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.accent}"/><stop offset=".55" stop-color="${p.soft}"/><stop offset="1" stop-color="${p.accent}"/></linearGradient>
</defs>
<rect width="1600" height="900" fill="${p.bg}"/><rect width="1600" height="900" fill="url(#glow)"/>
<g transform="translate(${bx} 380)">
<rect x="-26" y="-250" width="52" height="60" rx="6" fill="${p.accent}"/>
<rect x="-14" y="-192" width="28" height="30" fill="${p.soft}"/>
<path d="M-120 -160 H120 Q150 -160 150 -120 V170 Q150 210 110 210 H-110 Q-150 210 -150 170 V-120 Q-150 -160 -120 -160Z" fill="url(#glass)" opacity=".92"/>
<path d="M-110 -130 V180" stroke="${p.text}" stroke-opacity=".25" stroke-width="6"/>
<text y="40" text-anchor="middle" font-family="Georgia,serif" font-size="30" letter-spacing="8" fill="${p.bg}">${esc(brief.brand)}</text>
</g>
<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="Georgia,serif" font-size="84" letter-spacing="14" fill="${p.text}">${esc(brief.brand)}</text>
<text x="${tx}" y="${ty + 56}" text-anchor="${anchor}" font-family="Helvetica,Arial,sans-serif" font-size="28" letter-spacing="6" fill="${p.accent}">${esc(brief.product.toUpperCase())}</text>
</svg>`;
    const asset = await writeAsset({ runId, skill: "IMAGE", version, ext: "svg", content: svg });
    return {
      asset,
      evidence: {
        format: "SVG", width: 1600, height: 900, palette: p.name,
        layout: centered ? "centered bottle, title below" : "title left, bottle right",
        layers: ["background gradient", "radial glow", "perfume bottle with cap and brand label", "brand wordmark", "product line"],
        text: [brief.brand, brief.product.toUpperCase()],
        bytes: Buffer.byteLength(svg),
        generator: "local SVG template (not an image model)",
      },
    };
  },
};
