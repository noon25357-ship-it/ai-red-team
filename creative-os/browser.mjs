// One shared headless Chromium per run for rasterizing, recording, and validating outputs.
import { chromium } from "playwright";

let browser;
export async function getBrowser() {
  browser ??= await chromium.launch();
  return browser;
}
export async function closeBrowser() {
  await browser?.close();
  browser = undefined;
}

/** Collect console errors, page errors, failed and external requests for a page. */
export function watchPage(page) {
  const w = { consoleErrors: [], pageErrors: [], failedRequests: [], externalRequests: [] };
  page.on("console", (m) => m.type() === "error" && w.consoleErrors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => w.pageErrors.push(e.message.slice(0, 200)));
  page.on("requestfailed", (r) => w.failedRequests.push(r.url().slice(0, 200)));
  page.on("request", (r) => /^https?:/.test(r.url()) && w.externalRequests.push(r.url().slice(0, 200)));
  return w;
}
