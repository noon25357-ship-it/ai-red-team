/**
 * End-to-end smoke test. Run against a running server:
 *   npm run build && npm start   (port 3000)
 *   npm run test:e2e             (or BASE_URL=http://localhost:3100 node scripts/smoke.mjs)
 * Uses playwright-core with a local Chromium (set CHROMIUM_PATH if needed).
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// Arabic is served at "/", English at "/en". Run both: LOCALE=ar (default) and LOCALE=en.
const LOCALE = process.env.LOCALE ?? "ar";
const PATH = LOCALE === "ar" ? "/" : "/en";
const DIR = LOCALE === "ar" ? "rtl" : "ltr";
const EXEC = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: EXEC });

async function open(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: opts.reducedMotion ?? "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const res = await page.goto(BASE + PATH, { waitUntil: "networkidle" });
  return { ctx, page, errors, res };
}

const scrollToEl = (page, sel) => page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start", behavior: "instant" }), sel);

/* ---------- 1. Loading, SEO & semantics ---------- */
{
  const { ctx, page, errors, res } = await open({ width: 1440, height: 900 });
  check("Root responds 200", res.status() === 200, String(res.status()));
  const meta = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    h1: document.querySelectorAll("h1").length,
    main: !!document.querySelector("main#main"),
    jsonld: !!document.querySelector('script[type="application/ld+json"]'),
    og: !!document.querySelector('meta[property="og:title"]'),
  }));
  check("html lang/dir set", meta.lang === LOCALE && meta.dir === DIR, `${meta.lang}/${meta.dir}`);
  check("Title and description present", meta.title.length > 10 && meta.desc.length > 50, meta.title);
  check("Exactly one h1", meta.h1 === 1, String(meta.h1));
  check("Landmarks, JSON-LD, OpenGraph", meta.main && meta.jsonld && meta.og);

  // heading order: no skipped levels
  const skips = await page.evaluate(() => {
    const hs = [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => +h.tagName[1]);
    const bad = [];
    for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) bad.push(`${hs[i - 1]}→${hs[i]}`);
    return bad;
  });
  check("Heading levels never skip", skips.length === 0, skips.join(", "));

  // every in-page link resolves; every button/link has an accessible name
  const links = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")].map((a) => ({
      href: a.getAttribute("href"),
      name: (a.getAttribute("aria-label") || a.textContent || "").trim(),
    })),
  );
  const missingTargets = await page.evaluate((hrefs) => hrefs.filter((h) => h.startsWith("#") && h.length > 1 && !document.getElementById(h.slice(1))), links.map((l) => l.href));
  check("All in-page anchors have targets", missingTargets.length === 0, missingTargets.join(", "));
  check("All links have accessible names", links.every((l) => l.name.length > 0));
  const mailtos = links.filter((l) => l.href.startsWith("mailto:"));
  check("Offer CTAs are mailto links with subject", mailtos.length >= 3 && mailtos.every((l) => l.href.includes("subject=")), `${mailtos.length} links`);
  const order = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id).join(","));
  check("Services and one-team sections follow the system", /system,services,one-team/.test(order) && order.endsWith("final,contact"), order);
  const unnamedButtons = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !(b.getAttribute("aria-label") || b.textContent).trim()).length);
  check("All buttons have accessible names", unnamedButtons === 0, String(unnamedButtons));

  // images/svg decorative content should not be exposed without labels
  const imgNoAlt = await page.evaluate(() => [...document.querySelectorAll("img:not([alt])")].length);
  check("No <img> without alt", imgNoAlt === 0);

  check("No console errors on load", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ---------- 1b. Direction & script ---------- */
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  await page.waitForTimeout(2500);
  const d = await page.evaluate(() => {
    const x = (el) => el.getBoundingClientRect().left;
    const nodes = [...document.querySelectorAll(".hero-node")].filter((n) => n.offsetParent);
    const tabs = document.querySelectorAll("[role=tab]");
    const h1 = getComputedStyle(document.querySelector("#hero-title"));
    return {
      heroFlowsRight: x(nodes[nodes.length - 1]) > x(nodes[0]),
      tabsFlowRight: x(tabs[tabs.length - 1]) > x(tabs[0]),
      markLeftOfCopy: (() => {
        const line = document.querySelector(".final-line").getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(".final-l2"));
        const text = range.getBoundingClientRect();
        return line.left + line.width / 2 < text.left + text.width / 2;
      })(),
      font: h1.fontFamily,
      tracking: h1.letterSpacing,
      switchHref: document.querySelector("header a[hreflang]")?.getAttribute("href"),
      dot: !!document.querySelector("#hero-title .signal-dot"),
    };
  });
  const rtl = DIR === "rtl";
  check("Hero system flows in reading direction", d.heroFlowsRight === !rtl);
  check("Engine stages run in reading direction", d.tabsFlowRight === !rtl);
  check("Finale: brand mark sits opposite the copy", d.markLeftOfCopy === rtl);
  check(`Display type is ${rtl ? "IBM Plex Sans Arabic" : "Archivo"}`, rtl ? /Plex.Sans.Arabic/.test(d.font) : /Archivo/.test(d.font), d.font.slice(0, 60));
  if (rtl) check("Arabic headings carry no letter-spacing", d.tracking === "normal" || d.tracking === "0px", d.tracking);
  check("Language switch links to the other locale", d.switchHref === (rtl ? "/en" : "/"), d.switchHref);
  check("Brand full stop is the square signal", d.dot);
  if (rtl) {
    const r = await page.request.get(BASE + "/ar", { maxRedirects: 0 });
    check("/ar redirects to the root", [301, 308].includes(r.status()), String(r.status()));
  }
  await ctx.close();
}

/* ---------- 2. Hero system is alive ---------- */
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  await page.waitForTimeout(6000);
  const active = await page.evaluate(() => [...document.querySelectorAll(".hero-node")].filter((n) => n.offsetParent && n.dataset.active === "true").length);
  const visibleDots = await page.evaluate(() => [...document.querySelectorAll("svg g[opacity]")].filter((g) => +g.getAttribute("opacity") > 0).length);
  check("Hero: signals travel and nodes activate", active > 0 && visibleDots > 0, `${active} active nodes, ${visibleDots} signals`);
  // headline must not collide with the staircase nodes
  const collide = await page.evaluate(() => {
    // measure the glyphs, not the block boxes
    const boxes = [];
    for (const sel of ["#hero-title", "#top .lede", "#top .lede + p", "#top .btn", "#top .link-quiet"]) {
      const walker = document.createTreeWalker(document.querySelector(sel), NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        boxes.push(...range.getClientRects());
      }
    }
    const hits = [];
    document.querySelectorAll(".hero-node").forEach((n) => {
      if (!n.offsetParent) return;
      n.querySelectorAll("span").forEach((s) => {
        const r = s.getBoundingClientRect();
        if (!r.width) return;
        if (boxes.some((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top)) hits.push(s.textContent);
      });
    });
    return hits;
  });
  check("Hero: staircase never overlaps headline or CTAs", collide.length === 0, [...new Set(collide)].join(", "));
  await ctx.close();
}

/* ---------- 3. Navigation ---------- */
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  for (const id of ["build", "system", "lab", "method"]) {
    const label = await page.textContent(`header nav ul a[href="#${id}"]`);
    await page.click(`header nav ul a[href="#${id}"]`);
    await page.waitForTimeout(1400);
    const top = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, id);
    check(`Nav → ${label}`, Math.abs(top - 64) < 80, `section top at ${Math.round(top)}px`);
  }
  // sticky nav adopts the dark theme over dark sections
  await scrollToEl(page, "#system");
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(400);
  const theme = await page.getAttribute("header", "data-nav-theme");
  check("Nav switches to dark theme over dark sections", theme === "dark", theme);

  // primary CTA lands on the contact form
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.click('header nav a.btn[href="#contact"]');
  await page.waitForTimeout(1600);
  const formTop = await page.evaluate(() => document.querySelector("#contact form").getBoundingClientRect().top);
  check("CTA → contact form in view", formTop > 0 && formTop < 900, `${Math.round(formTop)}px`);

  // the finale still resolves fully when scrolled through
  await page.evaluate(() => {
    const f = document.getElementById("final");
    window.scrollTo({ top: f.offsetTop + f.offsetHeight - window.innerHeight, behavior: "instant" });
  });
  await page.waitForTimeout(600);
  const finalState = await page.evaluate(() => ({
    p: parseFloat(getComputedStyle(document.querySelector("#final")).getPropertyValue("--p")),
    btnOpacity: parseFloat(getComputedStyle(document.querySelector(".final-cta")).opacity),
  }));
  check("Finale resolves at the end of its scroll", finalState.p > 0.95 && finalState.btnOpacity > 0.95, JSON.stringify(finalState));
  await ctx.close();
}

/* ---------- 4. Scroll-driven stories ---------- */
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  const problemTop = await page.evaluate(() => document.getElementById("problem").offsetTop);
  const problemH = await page.evaluate(() => document.getElementById("problem").offsetHeight);
  await page.evaluate((y) => window.scrollTo({ top: y + 20, behavior: "instant" }), problemTop);
  await page.waitForTimeout(500);
  const before = await page.getAttribute(".problem-chain", "data-connected");
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), problemTop + (problemH - 900) * 0.9);
  await page.waitForTimeout(500);
  const after = await page.getAttribute(".problem-chain", "data-connected");
  check("Problem: chain connects as you scroll", before === "false" && after === "true", `${before} → ${after}`);

  // lab frames spread out
  await scrollToEl(page, ".lab-canvas");
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".lab-canvas")).getPropertyValue("--p")));
  check("Creative lab: progress drives the artboard", s > 0.2, `--p=${s}`);
  await ctx.close();
}

/* ---------- 5. Interactions ---------- */
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  await scrollToEl(page, "#system");
  await page.waitForTimeout(600);
  const panelFor = () => page.getAttribute("#engine-panel", "aria-labelledby");
  await page.click("#engine-tab-followup");
  check("Engine: click selects stage", (await panelFor()) === "engine-tab-followup");
  // "next" is the arrow pointing in reading direction
  await page.keyboard.press(DIR === "rtl" ? "ArrowLeft" : "ArrowRight");
  const focused = await page.evaluate(() => document.activeElement?.id);
  check("Engine: arrow keys move between stages (reading direction)", (await panelFor()) === "engine-tab-sales" && focused === "engine-tab-sales", focused);
  await page.keyboard.press("End");
  check("Engine: End jumps to last stage", (await panelFor()) === "engine-tab-dashboard");

  // AI layer runs to completion, then replays
  await scrollToEl(page, "#ai");
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(1400 * 7 + 800);
  const status = await page.textContent("#ai [aria-live]");
  check("AI layer: sequence completes", status.includes("7 / 7"), status);
  await page.click("#ai-replay");
  await page.waitForTimeout(300);
  check("AI layer: replay restarts", !(await page.textContent("#ai [aria-live]")).includes("7 / 7"));

  // sankey highlight
  await scrollToEl(page, "#build-intelligence");
  const channel = page.locator("#build-intelligence button[aria-pressed]").nth(3);
  await channel.hover();
  const pressed = await channel.getAttribute("aria-pressed");
  check("Attribution: hovering a channel highlights it", pressed === "true");

  // keyboard: skip link
  await page.goto(BASE + PATH, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const skip = await page.evaluate(() => document.activeElement?.className);
  check("Keyboard: first Tab reaches skip link", String(skip).includes("skip-link"));
  await ctx.close();
}

/* ---------- 5b. Contact form ---------- */
{
  const { ctx, page, errors } = await open({ width: 1440, height: 900 });
  await scrollToEl(page, "#contact");
  await page.click("#contact button[type=submit]");
  const invalid = await page.evaluate(() => document.querySelectorAll("#contact [aria-invalid=true]").length);
  const focused = await page.evaluate(() => document.activeElement?.id);
  check("Contact: empty submit flags all 5 fields and focuses the first", invalid === 5 && focused === "contact-name", `${invalid} invalid, focus ${focused}`);
  await page.fill("#contact-name", "Test");
  await page.fill("#contact-company", "Test Co");
  await page.fill("#contact-email", "not-an-email");
  await page.selectOption("#contact-sector", { index: 1 });
  await page.fill("#contact-need", "Leads never reach sales");
  await page.click("#contact button[type=submit]");
  check("Contact: invalid email is rejected", (await page.getAttribute("#contact-email", "aria-invalid")) === "true");
  await page.fill("#contact-email", "test@example.org");
  await page.click("#contact button[type=submit]");
  await page.waitForTimeout(300);
  const href = await page.getAttribute("#contact-mailto", "href").catch(() => null);
  check("Contact: valid submit composes the email", !!href && href.startsWith("mailto:") && href.includes("body=") && decodeURIComponent(href).includes("Test Co"), href?.slice(0, 60));
  check("Contact: no errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ---------- 6. Mobile menu ---------- */
{
  const { ctx, page } = await open({ width: 390, height: 844 });
  const toggle = page.locator('button[aria-controls="mobile-menu"]');
  await toggle.click();
  check("Mobile: menu opens", (await toggle.getAttribute("aria-expanded")) === "true" && (await page.isVisible("#mobile-menu")));
  await page.keyboard.press("Escape");
  check("Mobile: Escape closes menu", (await toggle.getAttribute("aria-expanded")) === "false");
  await toggle.click();
  await page.click('#mobile-menu a[href="#lab"]');
  await page.waitForTimeout(1400);
  const top = await page.evaluate(() => document.getElementById("lab").getBoundingClientRect().top);
  check("Mobile: menu link navigates and closes", (await toggle.getAttribute("aria-expanded")) === "false" && Math.abs(top - 64) < 80, `${Math.round(top)}px`);
  const navCtaVisible = await page.isVisible("header nav a.btn");
  check("Mobile: nav CTA hidden at phone width", !navCtaVisible);
  await ctx.close();
}

/* ---------- 7. Breakpoints: overflow + errors ---------- */
for (const [w, h] of [[320, 640], [375, 667], [390, 844], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080]]) {
  const { ctx, page, errors } = await open({ width: w, height: h });
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let worst = 0;
  for (let y = 0; y < total; y += h) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(60);
    worst = Math.max(worst, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }
  // text blocks escaping their section horizontally
  const escaped = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,p,li,a,button")]
      .filter((el) => el.offsetParent && !el.closest("[aria-hidden='true'],.engine-strip,.final-stage,.hero-node"))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      })
      .map((el) => el.tagName + ":" + el.textContent.trim().slice(0, 24)),
  );
  check(`${w}×${h}: no horizontal overflow`, worst <= 0 && escaped.length === 0, escaped.slice(0, 3).join(" | ") || `scrollWidth diff ${worst}`);
  check(`${w}×${h}: no console errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

/* ---------- 8. Reduced motion ---------- */
{
  const { ctx, page, errors } = await open({ width: 1440, height: 900 }, { reducedMotion: "reduce" });
  await page.waitForTimeout(800);
  const rm = await page.evaluate(() => ({
    nodes: [...document.querySelectorAll(".hero-node")].filter((n) => n.offsetParent && n.dataset.active === "true").length,
    signals: [...document.querySelectorAll("svg g[opacity]")].filter((g) => +g.getAttribute("opacity") > 0).length,
    finalP: getComputedStyle(document.querySelector("#final")).getPropertyValue("--p").trim(),
  }));
  check("Reduced motion: hero shows static final state", rm.nodes === 6 && rm.signals === 0, JSON.stringify(rm));
  check("Reduced motion: finale shown resolved", rm.finalP === "1");
  await scrollToEl(page, "#ai");
  await page.waitForTimeout(400);
  check("Reduced motion: AI record shown complete", (await page.textContent("#ai [aria-live]")).includes("7 / 7"));
  check("Reduced motion: no errors", errors.length === 0);
  await ctx.close();
}

/* ---------- 9. Performance ---------- */
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  const perf = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let lcp = 0;
        new PerformanceObserver((l) => l.getEntries().forEach((e) => (lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
        let cls = 0;
        new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (cls += e.value))).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => {
          const js = performance
            .getEntriesByType("resource")
            .filter((r) => r.name.endsWith(".js"))
            .reduce((a, r) => a + (r.transferSize || 0), 0);
          resolve({ lcp: Math.round(lcp), cls: +cls.toFixed(3), jsKB: Math.round(js / 1024) });
        }, 2500);
      }),
  );
  check("Performance: LCP < 2.5s (local)", perf.lcp < 2500, `${perf.lcp}ms`);
  check("Performance: CLS < 0.1", perf.cls < 0.1, String(perf.cls));
  check("Performance: JS transferred < 200KB", perf.jsKB < 200, `${perf.jsKB}KB`);

  // long tasks during scroll
  await page.evaluate(() => {
    window.__long = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__long += e.duration > 50 ? 1 : 0))).observe({ type: "longtask" });
  });
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 300) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(16);
  }
  const longTasks = await page.evaluate(() => window.__long);
  check("Performance: no long tasks while scrolling the full page", longTasks <= 1, `${longTasks} long tasks`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
