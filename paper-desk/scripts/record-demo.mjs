// Record RUN DEMO headlessly for X: open the desk, press RUN DEMO, wait for the session to end, save the video.
// Output: runs/demo/jev-paper-desk-<time>.webm plus mid-run and final screenshots.
import { chromium } from "playwright";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../src/server.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "runs", "demo");
const SIZE = { width: 1600, height: 900 };
await mkdir(OUT, { recursive: true });
const tmp = path.join(OUT, ".tmp");

const server = await startServer(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: tmp, size: SIZE } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const t0 = Date.now();
await page.goto(url);
await page.waitForSelector(".agent");
await page.waitForTimeout(1200);
await page.click("#demoBtn");
await page.waitForTimeout(12000);
await page.screenshot({ path: path.join(OUT, `mid-${stamp}.png`) });
await page.waitForFunction(() => document.body.dataset.state === "finished", null, { timeout: 180000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, `final-${stamp}.png`) });
const summary = await page.evaluate(() => ({ balance: document.getElementById("kBal").textContent, roi: document.getElementById("kRoi").textContent, trades: document.getElementById("kTrades").textContent, jev: document.getElementById("jevBadge").textContent, data: document.getElementById("dataMode").textContent }));
const video = page.video();
await ctx.close(); await browser.close(); server.close();
const file = path.join(OUT, `jev-paper-desk-${stamp}.webm`);
await rename(await video.path(), file);
await rm(tmp, { recursive: true, force: true });
console.log(`video: ${path.relative(ROOT, file)} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
console.log(`final: ${JSON.stringify(summary)}`);
console.log(`page errors: ${errors.length ? errors.join(" | ") : "none"}`);
process.exit(errors.length ? 1 : 0);
