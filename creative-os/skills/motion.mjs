// MOTION: local CSS keyframe teaser (HTML, loops; no API, $0).
import { writeAsset } from "../assets.mjs";
import { esc, palette } from "./brand.mjs";

export const motion = {
  name: "MOTION",
  description: "6-second animated teaser (CSS keyframes in HTML, generated locally).",
  engine: "local-css-animation",
  status: "CONNECTED",
  costEstimate: { usd: 0, note: "local" },
  inputSchema: { brief: "object", version: "number" },
  outputSchema: { file: "string (html)", durationSec: "number", keyframes: "string[]" },
  async execute({ runId, brief, version }) {
    const p = palette(version);
    const dur = 6;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(brief.brand)} teaser</title><style>
html,body{margin:0;height:100%;background:${p.bg};overflow:hidden;font-family:Georgia,serif}
.stage{position:absolute;inset:0;display:grid;place-items:center}
.glow{position:absolute;width:60vmin;height:60vmin;border-radius:50%;background:radial-gradient(${p.accent}55,transparent 70%);animation:pulse ${dur}s ease-in-out infinite}
.bottle{width:16vmin;height:24vmin;border-radius:2vmin;background:linear-gradient(135deg,${p.accent},${p.soft},${p.accent});animation:rise ${dur}s cubic-bezier(.2,.8,.2,1) infinite}
.name{position:absolute;bottom:18%;color:${p.text};font-size:7vmin;letter-spacing:1.4vmin;animation:reveal ${dur}s ease infinite}
.sub{position:absolute;bottom:12%;color:${p.accent};font:2.2vmin/1 Helvetica,Arial,sans-serif;letter-spacing:.8vmin;animation:reveal ${dur}s ease .4s infinite both}
@keyframes rise{0%{transform:translateY(20vmin);opacity:0}25%,85%{transform:none;opacity:1}100%{opacity:0}}
@keyframes pulse{0%,100%{transform:scale(.6);opacity:0}40%{transform:scale(1.1);opacity:1}}
@keyframes reveal{0%,30%{opacity:0;letter-spacing:3vmin}50%,85%{opacity:1}100%{opacity:0}}
</style></head><body><div class="stage"><div class="glow"></div><div class="bottle"></div><div class="name">${esc(brief.brand)}</div><div class="sub">${esc(brief.product.toUpperCase())}</div></div></body></html>`;
    const asset = await writeAsset({ runId, skill: "MOTION", version, ext: "html", content: html });
    return {
      asset,
      evidence: {
        format: "HTML + CSS keyframes", durationSec: dur, loop: true, palette: p.name,
        keyframes: ["bottle rises and fades in (0-25%)", "gold glow pulse (0-40%)", "wordmark letter-spacing reveal (30-50%)", "fade out (85-100%)"],
        text: [brief.brand, brief.product.toUpperCase()],
        generator: "local CSS animation template (not a video model)",
      },
    };
  },
};
