// Record the Creative OS demo headlessly: open the dashboard, click RUN, wait for the final state, save the video.
// Usage: npm run record-demo              (live run: real JEV calls)
//        npm run record-demo -- --replay  (replays the latest saved real run: no JEV calls)
//        npm run record-demo -- --replay run-20260927-101500
import { chromium } from "playwright";
import { mkdir, rename, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { startServer } from "../creative-os/server.mjs";
import { OUTPUTS } from "../creative-os/assets.mjs";

const args = process.argv.slice(2);
const replayIdx = args.indexOf("--replay");
const replay = replayIdx === -1 ? null : (args[replayIdx + 1] && !args[replayIdx + 1].startsWith("--") ? args[replayIdx + 1] : "");
const SIZE = { width: 1280, height: 720 };
const demoDir = path.join(OUTPUTS, "demo");
const tmpDir = path.join(demoDir, ".tmp");
await mkdir(tmpDir, { recursive: true });

const server = await startServer(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: tmpDir, size: SIZE } });
const page = await context.newPage();
let status = "UNKNOWN";
try {
  await page.goto(replay === null ? base : `${base}?replay=${encodeURIComponent(replay)}`);
  await page.waitForSelector(".node");
  await page.waitForTimeout(1200);
  await page.click("#run");
  await page.waitForFunction(() => document.body.dataset.state === "finished", null, { timeout: 180_000 });
  status = await page.evaluate(() => document.body.dataset.status);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(demoDir, "last-final-state.png") });
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  server.close();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const name = `jev-creative-os-${stamp}${replay !== null ? "-replay" : ""}${status === "COMPLETED" ? "" : "-" + status}.webm`;
  const out = path.join(demoDir, name);
  await rename(await video.path(), out);
  await rm(tmpDir, { recursive: true, force: true });
  console.log(`status: ${status}`);
  console.log(`video:  ${path.relative(process.cwd(), out)}`);
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", out, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out.replace(/\.webm$/, ".mp4")]);
    console.log(`mp4:    ${path.relative(process.cwd(), out.replace(/\.webm$/, ".mp4"))}`);
  } catch {
    console.log("mp4:    skipped (ffmpeg with libx264 not found on PATH)");
  }
}
process.exit(["COMPLETED", "HUMAN_REVIEW", "STOPPED_MAX_STEPS"].includes(status) ? 0 : 1);
