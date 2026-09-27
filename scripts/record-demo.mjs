// Record the Creative OS demo headlessly: open the dashboard, click RUN, wait for the final state, save the video.
// Usage: npm run record-demo                      live run: real JEV + claude -p calls, records the whole run
//        npm run record-demo -- --replay          latest saved real run, time-compressed for a short clip (no calls)
//        npm run record-demo -- --replay <runId> --compress 1500   gap cap in ms (0 = real timing)
import { chromium } from "playwright";
import { mkdir, rename, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { startServer } from "../creative-os/server.mjs";
import { OUTPUTS } from "../creative-os/assets.mjs";

const args = process.argv.slice(2);
const replayIdx = args.indexOf("--replay");
const replay = replayIdx === -1 ? null : (args[replayIdx + 1] && !args[replayIdx + 1].startsWith("--") ? args[replayIdx + 1] : "");
const cIdx = args.indexOf("--compress");
const compress = replay === null ? null : cIdx === -1 ? 1500 : Number(args[cIdx + 1]);
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
  const q = new URLSearchParams();
  if (replay !== null) { q.set("replay", replay); if (compress) q.set("compress", String(compress)); }
  await page.goto(`${base}?${q}`);
  await page.waitForSelector(".node");
  await page.waitForTimeout(1200);
  await page.click("#run");
  await page.waitForFunction(() => document.body.dataset.state === "finished", null, { timeout: 45 * 60_000 });
  status = await page.evaluate(() => document.body.dataset.status);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(demoDir, "last-final-state.png") });
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  server.close();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const name = `jev-creative-os-${stamp}${replay !== null ? "-replay" : ""}${status === "DONE" ? "" : "-" + status}.webm`;
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
// 0 = DONE, 2 = ended correctly but waiting on a human, 1 = anything else.
process.exit(status === "DONE" ? 0 : status === "AWAITING_HUMAN_REVIEW" ? 2 : 1);
