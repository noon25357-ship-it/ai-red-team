// MOTION: Claude writes an HTML/CSS/SVG animation; Playwright records it to a real WebM. Motion graphics, not a video model.
import { writeFile, rename, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { claude, unfence } from "../llm.mjs";
import { assetPath, finalizeAsset } from "../assets.mjs";
import { getBrowser, watchPage } from "../browser.mjs";
import { fileFacts, pngSize, checks } from "../evidence.mjs";

const W = 1280, H = 720, TARGET_MS = 6000, MAX_MS = 10000;

export const motion = {
  name: "MOTION",
  label: "CLAUDE CLI → WEBM",
  description: `A ${TARGET_MS / 1000}s motion-graphics teaser: HTML/CSS/SVG animation written by Claude, recorded to a ${W}x${H} WebM by Playwright.`,
  engine: "claude -p → HTML animation → Playwright WebM",
  status: "CONNECTED",
  costEstimate: { usd: 0, billing: "Claude plan usage via claude -p (approved); recording is local" },
  inputSchema: { brief: "object", feedback: "string?" },
  outputSchema: { html: "file", webm: `file ${W}x${H}`, poster: "png" },
  async execute({ runId, brief, version, feedback }) {
    const prompt = `Create a ${TARGET_MS / 1000}-second motion-graphics teaser for this launch as ONE standalone HTML file.
Brief: ${brief.text}
Brand name: ${brief.brand}. Product: ${brief.product}.
Requirements: fills a ${W}x${H} viewport exactly, no scrollbars; animation with CSS keyframes and/or SVG (SMIL allowed), starts on load, total ${TARGET_MS / 1000}s then holds the final frame; shows the brand name; premium dark luxury art direction; no external resources, no web fonts, no JavaScript required.
Return ONLY the HTML.${feedback ? `\nThe previous version was rejected. Fix this: ${feedback}` : ""}`;
    const r = await claude(prompt);
    const html = unfence(r.text);
    const htmlFile = assetPath(runId, "MOTION", version, "html");
    const webmFile = assetPath(runId, "MOTION", version, "webm");
    const posterFile = assetPath(runId, "MOTION", version, "png", "-poster");
    await writeFile(htmlFile, html);

    const ctx = await (await getBrowser()).newContext({ viewport: { width: W, height: H }, recordVideo: { dir: `${webmFile}.tmp`, size: { width: W, height: H } } });
    const page = await ctx.newPage();
    const w = watchPage(page);
    const t0 = performance.now();
    await page.goto(pathToFileURL(htmlFile).href);
    const anim = await page.evaluate(() => {
      const list = document.getAnimations();
      const ends = list.map((a) => a.effect?.getComputedTiming().endTime).filter((x) => Number.isFinite(x));
      const smil = document.querySelectorAll("animate, animateTransform, animateMotion, set").length;
      const de = document.documentElement;
      return { cssAnimations: list.length, smilElements: smil, longestFiniteMs: ends.length ? Math.max(...ends) : null,
        overflowX: de.scrollWidth > innerWidth + 1, overflowY: de.scrollHeight > innerHeight + 1,
        text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 200) };
    });
    const playMs = Math.min(Math.max(anim.longestFiniteMs ?? TARGET_MS, 3000), MAX_MS);
    await page.waitForTimeout(playMs / 2);
    await page.screenshot({ path: posterFile });
    await page.waitForTimeout(playMs / 2 + 500);
    const video = page.video();
    await ctx.close();
    const recordedMs = Math.round(performance.now() - t0);
    await rename(await video.path(), webmFile);
    await rm(`${webmFile}.tmp`, { recursive: true, force: true });

    const poster = await pngSize(posterFile);
    const validation = checks([
      ["has animation (CSS or SMIL)", anim.cssAnimations + anim.smilElements > 0, `${anim.cssAnimations} CSS, ${anim.smilElements} SMIL`],
      ["animation length 3-10s", anim.longestFiniteMs == null || (anim.longestFiniteMs >= 3000 && anim.longestFiniteMs <= MAX_MS), anim.longestFiniteMs == null ? "infinite or SMIL-only" : `${Math.round(anim.longestFiniteMs)} ms`],
      ["brand name in the animation", (anim.text + html).toUpperCase().includes(brief.brand.toUpperCase()), anim.text || undefined],
      ["no scrollbars", !anim.overflowX && !anim.overflowY],
      ["no external requests", w.externalRequests.length === 0, w.externalRequests.join(", ") || undefined],
      ["no console/page errors", !w.consoleErrors.length && !w.pageErrors.length, [...w.consoleErrors, ...w.pageErrors].join("; ") || undefined],
    ]);
    const asset = await finalizeAsset({ runId, skill: "MOTION", version, file: webmFile, evidence: {
      kind: "motion graphics (LLM-authored HTML/CSS/SVG recorded by Playwright), not a video model",
      files: [await fileFacts(webmFile), await fileFacts(htmlFile), await fileFacts(posterFile)],
      dimensions: { width: W, height: H },
      duration: { animationMs: anim.longestFiniteMs, recordedMs },
      screenshots: [(await fileFacts(posterFile)).path],
      poster_dimensions: poster,
      console_errors: [...w.consoleErrors, ...w.pageErrors],
      validation,
      generator: { tool: "claude -p", model: r.model, durationMs: r.durationMs, outputTokens: r.outputTokens, reportedCostUsdListPrice: r.reportedCostUsd },
    } });
    return { asset };
  },
};
