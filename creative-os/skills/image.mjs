// IMAGE: Claude authors a cinematic SVG key visual in two passes (draft, then an art-director revision made
// after looking at the rendered draft); Playwright rasterizes it to a 1600x900 PNG. Vector art, not an image model.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { claude, unfence } from "../llm.mjs";
import { assetPath, finalizeAsset } from "../assets.mjs";
import { getBrowser, watchPage } from "../browser.mjs";
import { fileFacts, pngSize, checks } from "../evidence.mjs";

const W = 1600, H = 900;
const MAX_TEXT_ELEMENTS = 3, MAX_TEXT_CHARS = 40;

const artDirection = (brief) => `ART DIRECTION — cinematic luxury fragrance key visual, rendered in SVG as if it were a high-end studio still-life photograph.
Brand: ${brief.brand}. Product: ${brief.product}. Market: Saudi Arabia, premium oud perfume launch.

COMPOSITION
- The bottle is the undisputed hero: it fills 50-65% of the frame height, placed on the right third or dead center, with generous negative space.
- Slightly low camera angle. The bottle stands on a dark polished stone/obsidian surface and casts a real mirrored reflection: reuse the bottle with <use href="#hero" transform="translate(0, …) scale(1,-1)"> under a <mask> whose gradient fades from ~35% to 0% opacity. The reflection must be clearly visible.
- Three depth planes: far background (deep night gradient, very soft desert dune silhouettes or a faint Najdi geometric arch, blurred); midground (visible wisps of oud smoke curling up behind the bottle, made with feTurbulence + feDisplacementMap, 15-30% opacity); foreground (a few out-of-focus bokeh particles or the blurred edge of an oud wood piece, feGaussianBlur for depth of field).
- The light beam supports the bottle; it must not wash out the frame or compete with the hero.

LIGHT
- One strong warm key light from the upper left: a soft volumetric beam (blurred gradient polygon, low opacity).
- Warm rim light tracing the bottle edges, crisp specular highlights on the glass shoulders and the metal cap.
- Amber glow cast onto the surface below the bottle by light passing through the liquid.
- Color grade: rich blacks, warm amber/gold highlights, a hint of deep burgundy in the shadows. Real contrast: true highlights and true shadows.

PRODUCT (this is where premium is won or lost)
- Faceted, heavy glass flacon with a sculpted silhouette (not a plain rounded rectangle).
- Glass above the liquid is CLEAR: near-transparent dark fill that shows the background through it, defined only by thin bright edge highlights. Never an opaque grey or brown block.
- The amber liquid follows the inner shape of the glass (same path, inset), is backlit (brightest glowing core toward the center-back, deep cognac at the edges), with a curved bright meniscus line. Never a flat rectangle.
- Thick glass base: a visibly heavier bottom slab with its own highlight and inner refraction.
- Specular highlights: several crisp near-white (#fff8e8 to #ffffff) highlight shapes at 80-100% opacity on the glass shoulders, one long vertical glint on the glass edge, and bright points on the cap bevel, each with a tiny blurred halo. These must be clearly visible.
- Heavy brushed-gold cap: multi-stop metallic gradient (dark bronze → bright gold → pale highlight → bronze), bevel highlight, fine vertical brushed lines. A subtle geometric (Najdi-inspired) engraving on the glass or cap is welcome.

TYPOGRAPHY — minimal
- At most ${MAX_TEXT_ELEMENTS} <text> elements and ${MAX_TEXT_CHARS} characters in total: the brand wordmark once (small, elegant, widely letter-spaced) and optionally the product name even smaller. No taglines, no city names, no labels beyond that.

FINISH
- Film grain (feTurbulence noise overlay at 4-7% opacity) and a vignette. Avoid flat fills anywhere: every large area uses a gradient.
- Avoid clichés: no flags, camels, crescents, or clip-art shapes. It must not look like a flat vector illustration.

TECHNICAL
- One <svg> root with width="${W}" height="${H}" viewBox="0 0 ${W} ${H}". Put the whole bottle (glass, liquid, cap) in <g id="hero">. Its reflection goes outside #hero.
- Only SVG: no <script>, no <image>, no foreignObject, no external references or web fonts (generic font families only). Keep it under about 60 KB.`;

/** Render an SVG to PNG and measure what it actually shows. */
async function renderAndMeasure(svg, pngFile) {
  const page = await (await getBrowser()).newPage({ viewport: { width: W, height: H } });
  const w = watchPage(page);
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">${svg}</body></html>`);
  const info = await page.evaluate(() => {
    const el = document.querySelector("svg");
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const hero = document.getElementById("hero");
    const hb = hero?.getBoundingClientRect();
    const texts = [...el.querySelectorAll("text")].map((t) => t.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
    return {
      renderedWidth: Math.round(b.width), renderedHeight: Math.round(b.height),
      elements: el.querySelectorAll("*").length,
      filters: el.querySelectorAll("filter").length,
      gradients: el.querySelectorAll("linearGradient, radialGradient").length,
      turbulence: el.querySelectorAll("feTurbulence").length,
      blurs: el.querySelectorAll("feGaussianBlur").length,
      hero: hb && { heightRatio: +(hb.height / b.height).toFixed(3), widthRatio: +(hb.width / b.width).toFixed(3), centerXRatio: +((hb.left + hb.width / 2) / b.width).toFixed(3) },
      texts, textChars: texts.join("").length,
    };
  });
  await page.screenshot({ path: pngFile, clip: { x: 0, y: 0, width: W, height: H } });
  // Tonal measurements on the rendered pixels (downscaled 400x225).
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
  const tone = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 400; c.height = 225;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, 400, 225);
    const d = x.getImageData(0, 0, 400, 225).data;
    let sum = 0, sq = 0, hi = 0, black = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      sum += l; sq += l * l;
      if (l > 0.8) hi++;
      if (l < 0.04) black++;
    }
    const mean = sum / n;
    return { meanLuma: +mean.toFixed(3), lumaStd: +Math.sqrt(sq / n - mean * mean).toFixed(3), highlightPct: +((hi / n) * 100).toFixed(2), nearBlackPct: +((black / n) * 100).toFixed(1) };
  }, png.toString("base64"));
  await page.close();
  return { info, tone, errors: [...w.consoleErrors, ...w.pageErrors] };
}

const valid = (svg) => /<svg[\s>]/i.test(svg) && !/<script|<image|<foreignObject/i.test(svg) && !/(href|src)\s*=\s*["']https?:/i.test(svg);

export const image = {
  name: "IMAGE",
  label: "VECTOR IMAGE · LLM AUTHORED",
  description: `Hero key visual: a cinematic ${W}x${H} SVG written by Claude in two passes (draft, then an art-director revision after seeing the render), rasterized to PNG. Vector art, not a photographic image model.`,
  engine: "claude -p → SVG draft → render → claude -p art-director revision → Playwright PNG",
  status: "CONNECTED",
  costEstimate: { usd: 0, billing: "Claude plan usage via claude -p (approved, 2 calls); rasterizing is local" },
  inputSchema: { brief: "object", feedback: "string?" },
  outputSchema: { svg: "file", png: `file ${W}x${H}`, draft: "svg + png" },
  async execute({ runId, brief, version, feedback }) {
    const dir = path.dirname(assetPath(runId, "IMAGE", version, "png"));
    const draftSvgFile = assetPath(runId, "IMAGE", version, "svg", "-draft");
    const draftPngFile = assetPath(runId, "IMAGE", version, "png", "-draft");
    const svgFile = assetPath(runId, "IMAGE", version, "svg");
    const pngFile = assetPath(runId, "IMAGE", version, "png");

    // Pass 1: draft.
    const r1 = await claude(`${artDirection(brief)}
${feedback ? `\nA previous version was rejected. Fix this: ${feedback}\n` : ""}
Return ONLY the SVG markup.`);
    const draft = unfence(r1.text);
    await writeFile(draftSvgFile, draft);
    const draftRender = await renderAndMeasure(draft, draftPngFile);

    // Pass 2: art director looks at the rendered draft and returns a revised SVG.
    const r2 = await claude(`You are the art director. Below is the SVG source of a key visual and its rendered PNG at ${draftPngFile}. Open the PNG and look at it.
Judge it against the art direction, then return a revised, complete SVG that fixes what is weak: hero dominance and scale, lighting and depth, glass and metal realism, reflection, atmosphere, and minimal typography. Keep what already works.
Measured on the draft: ${JSON.stringify({ hero: draftRender.info?.hero, texts: draftRender.info?.texts, tone: draftRender.tone, blurs: draftRender.info?.blurs, turbulence: draftRender.info?.turbulence })}
Targets the final render is checked against: hero height 45-80% of the frame; at most ${MAX_TEXT_ELEMENTS} text elements and ${MAX_TEXT_CHARS} characters; ≥ 2 blur filters and ≥ 1 feTurbulence; luma std ≥ 0.10; ≥ 0.2% of pixels brighter than luma 0.8 (visible specular highlights); ≤ 85% near-black pixels.
Check the PNG specifically for: clear (not opaque) glass above the liquid, liquid following the bottle shape, visible reflection, visible smoke, crisp bright highlights.

${artDirection(brief)}

<draft_svg>
${draft}
</draft_svg>

Start the SVG with one XML comment <!-- AD: ... --> listing your main changes in one line, then the <svg>. Return ONLY that.`, { readDirs: [dir] });
    let revised = unfence(r2.text);
    const adNote = revised.match(/<!--\s*AD:\s*([\s\S]*?)-->/)?.[1].trim() ?? null;
    revised = revised.slice(revised.search(/<svg[\s>]/i) >= 0 ? revised.search(/<svg[\s>]/i) : 0);
    const revisionOk = valid(revised);
    // A revision that is not valid SVG is not used; the draft is kept and the evidence says so.
    const svg = revisionOk ? revised : draft;
    await writeFile(svgFile, svg);
    const { info, tone, errors } = await renderAndMeasure(svg, pngFile);

    const png = await pngSize(pngFile);
    const brandUp = brief.brand.toUpperCase();
    const validation = checks([
      ["SVG root present", Boolean(info)],
      [`rendered at ${W}x${H}`, info?.renderedWidth === W && info?.renderedHeight === H, info && `${info.renderedWidth}x${info.renderedHeight}`],
      ["only safe SVG (no script, image, foreignObject, external refs)", valid(svg)],
      ["art-director revision used", revisionOk, revisionOk ? adNote ?? "revised" : "revision was not valid SVG; draft kept"],
      ["hero product group #hero present", Boolean(info?.hero)],
      ["hero fills 45-80% of frame height", info?.hero && info.hero.heightRatio >= 0.45 && info.hero.heightRatio <= 0.8, info?.hero && `${Math.round(info.hero.heightRatio * 100)}%`],
      [`typography minimal (≤ ${MAX_TEXT_ELEMENTS} text elements, ≤ ${MAX_TEXT_CHARS} chars)`, (info?.texts.length ?? 0) <= MAX_TEXT_ELEMENTS && (info?.textChars ?? 0) <= MAX_TEXT_CHARS, info && `${info.texts.length} elements, ${info.textChars} chars`],
      ["brand name present", (info?.texts ?? []).some((t) => t.toUpperCase().includes(brandUp)), info?.texts.join(" | ")],
      ["depth effects (≥ 2 blur filters, grain or smoke turbulence)", (info?.blurs ?? 0) >= 2 && (info?.turbulence ?? 0) >= 1, info && `${info.blurs} blurs, ${info.turbulence} turbulence`],
      ["tonal contrast (luma std ≥ 0.10)", tone.lumaStd >= 0.1, `std ${tone.lumaStd}`],
      ["specular highlights present (≥ 0.2% pixels luma > 0.8)", tone.highlightPct >= 0.2, `${tone.highlightPct}%`],
      ["not crushed to black (≤ 85% pixels luma < 0.04)", tone.nearBlackPct <= 85, `${tone.nearBlackPct}%`],
      ["no console/page errors", errors.length === 0, errors.join("; ") || undefined],
      [`PNG is ${W}x${H}`, png.width === W && png.height === H, `${png.width}x${png.height}`],
    ]);

    const gen = (r) => ({ model: r.model, durationMs: r.durationMs, outputTokens: r.outputTokens, reportedCostUsdListPrice: r.reportedCostUsd });
    const asset = await finalizeAsset({ runId, skill: "IMAGE", version, file: pngFile, evidence: {
      kind: "cinematic vector key visual authored by an LLM (not an AI image model)",
      files: [await fileFacts(pngFile), await fileFacts(svgFile), await fileFacts(draftPngFile)],
      dimensions: png,
      composition: { hero: info?.hero ?? null, text_elements: info?.texts.length ?? 0, text_chars: info?.textChars ?? 0 },
      rendering: { svg_elements: info?.elements ?? 0, filters: info?.filters ?? 0, gradients: info?.gradients ?? 0, blurs: info?.blurs ?? 0, turbulence: info?.turbulence ?? 0 },
      tone,
      svg_text: info?.texts ?? [],
      art_director_changes: revisionOk ? adNote : null,
      draft_measurements: { hero: draftRender.info?.hero ?? null, tone: draftRender.tone, text_elements: draftRender.info?.texts.length ?? 0 },
      screenshots: [(await fileFacts(pngFile)).path, (await fileFacts(draftPngFile)).path],
      console_errors: errors,
      validation,
      generator: { tool: "claude -p (2 passes)", model: r2.model, draft: gen(r1), art_director: gen(r2) },
    } });
    return { asset };
  },
};
