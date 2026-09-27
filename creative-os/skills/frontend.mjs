// FRONTEND: Claude writes the landing page following the installed frontend-design skill; Playwright tests it on desktop and mobile.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { claude, unfence, findSkill } from "../llm.mjs";
import { assetPath, finalizeAsset, ROOT } from "../assets.mjs";
import { getBrowser, watchPage } from "../browser.mjs";
import { fileFacts, checks } from "../evidence.mjs";

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

export const frontend = {
  name: "FRONTEND",
  label: "CLAUDE CLI + PLAYWRIGHT",
  description: "Launch landing page written by Claude with the frontend-design skill, then tested in a real browser on desktop and mobile. Uses the IMAGE and COPY outputs when they already exist.",
  engine: "claude -p + frontend-design → Playwright tests",
  status: "CONNECTED",
  costEstimate: { usd: 0, billing: "Claude plan usage via claude -p (approved); browser tests are local" },
  inputSchema: { brief: "object", heroImage: "asset?", copy: "asset?", feedback: "string?" },
  outputSchema: { html: "file", screenshots: "desktop + mobile png" },
  async execute({ runId, brief, version, context, feedback }) {
    const htmlFile = assetPath(runId, "FRONTEND", version, "html");
    const img = context.assets.IMAGE?.asset;
    const heroRel = img ? path.relative(path.dirname(htmlFile), path.join(ROOT, img.file)) : null;
    const cp = context.assets.COPY?.data;
    const skill = await findSkill("frontend-design");
    const prompt = `${skill ? `Follow this design guidance:\n<frontend-design>\n${skill.body}\n</frontend-design>\n\n` : ""}Build the launch landing page for this campaign as ONE standalone HTML file with inline CSS.
Brief: ${brief.text}
Brand name: ${brief.brand}. Product: ${brief.product}.
${heroRel ? `Use this hero image exactly as the src: "${heroRel}" (1600x900 PNG).` : "No hero image exists yet; use CSS/SVG art instead."}
${cp ? `Use this approved copy verbatim where it fits: ${JSON.stringify(cp)}` : "No copy exists yet; write concise premium copy."}
Requirements: the <h1> headline must be visible in the first screen on desktop (1440x900) and mobile (390x844); responsive from 390px to 1440px with no horizontal scroll; an <h1>; a clear call to action; support Arabic text with dir="rtl" where Arabic appears; no external requests (no web fonts, CDNs, or remote images); no JavaScript frameworks.
Return ONLY the HTML.${feedback ? `\nThe previous version was rejected. Fix this: ${feedback}` : ""}`;
    const r = await claude(prompt);
    const html = unfence(r.text);
    await writeFile(htmlFile, html);

    const browser = await getBrowser();
    const results = {};
    const screenshots = [];
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: vp });
      const w = watchPage(page);
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
      const m = await page.evaluate(() => {
        const de = document.documentElement;
        const imgs = [...document.images];
        return {
          overflowX: de.scrollWidth > innerWidth + 1, scrollWidth: de.scrollWidth, pageHeight: de.scrollHeight,
          h1: document.querySelector("h1")?.innerText.trim() ?? null,
          h1Top: document.querySelector("h1") ? Math.round(document.querySelector("h1").getBoundingClientRect().top) : null,
          images: imgs.length, brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")),
          links: document.querySelectorAll("a, button").length,
          text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 400),
        };
      });
      const shot = assetPath(runId, "FRONTEND", version, "png", `-${name}`);
      await page.screenshot({ path: shot });
      screenshots.push((await fileFacts(shot)).path);
      results[name] = { viewport: vp, ...m, consoleErrors: [...w.consoleErrors, ...w.pageErrors], failedRequests: w.failedRequests, externalRequests: w.externalRequests };
      await page.close();
    }
    const d = results.desktop, mo = results.mobile;
    const validation = checks([
      ["has <h1>", Boolean(d.h1), d.h1 ?? undefined],
      ["headline visible in first desktop viewport", d.h1Top != null && d.h1Top < d.viewport.height, d.h1Top != null ? `h1 top at ${d.h1Top}px of ${d.viewport.height}px` : "no h1"],
      ["headline visible in first mobile viewport", mo.h1Top != null && mo.h1Top < mo.viewport.height, mo.h1Top != null ? `h1 top at ${mo.h1Top}px of ${mo.viewport.height}px` : "no h1"],
      ["has a call to action", d.links > 0, `${d.links} links/buttons`],
      ["no horizontal scroll on mobile (390px)", !mo.overflowX, `scrollWidth ${mo.scrollWidth}`],
      ["no horizontal scroll on desktop (1440px)", !d.overflowX, `scrollWidth ${d.scrollWidth}`],
      ["no broken images", !d.brokenImages.length && !mo.brokenImages.length, d.brokenImages.join(", ") || undefined],
      ["hero image used", !heroRel || html.includes(heroRel), heroRel ?? "no IMAGE output yet"],
      ["copy headline used", !cp || d.text.includes(cp.headline_en) || d.text.includes(cp.headline_ar), cp ? cp.headline_en : "no COPY output yet"],
      ["no external requests", !d.externalRequests.length && !mo.externalRequests.length, d.externalRequests.join(", ") || undefined],
      ["no console/page errors", !d.consoleErrors.length && !mo.consoleErrors.length, [...d.consoleErrors, ...mo.consoleErrors].join("; ") || undefined],
    ]);
    const asset = await finalizeAsset({ runId, skill: "FRONTEND", version, file: htmlFile, evidence: {
      files: [await fileFacts(htmlFile)],
      screenshots,
      viewports: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { viewport: v.viewport, pageHeight: v.pageHeight, scrollWidth: v.scrollWidth, images: v.images }])),
      content_summary: { h1: d.h1, visible_text_start: d.text },
      console_errors: [...d.consoleErrors, ...mo.consoleErrors],
      validation,
      design_skill: skill ? `frontend-design (${path.basename(path.dirname(skill.file))})` : "frontend-design not installed; generated without it",
      generator: { tool: "claude -p", model: r.model, durationMs: r.durationMs, outputTokens: r.outputTokens, reportedCostUsdListPrice: r.reportedCostUsd },
    } });
    return { asset };
  },
};
