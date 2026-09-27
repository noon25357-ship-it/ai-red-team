// Local server: dashboard, desk sessions streamed over SSE, saved runs. Paper only.
import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";
import { installSafetyGuard, SAFETY_SUMMARY } from "./safety.mjs";
import { checkJev, jevStatus } from "./jev/adapter.mjs";
import { listDatasets, loadDataset } from "./market/dataset.mjs";
import { runSession, activityWindow, RUNS_DIR } from "./desk.mjs";

installSafetyGuard();
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIRS = ["chakra-petch", "ibm-plex-sans", "jetbrains-mono"].map((f) => path.join(ROOT, "node_modules", "@fontsource", f, "files"));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".webm": "video/webm" };
let current = null;

const json = (res, code, body) => { res.writeHead(code, { "content-type": TYPES[".json"] }); res.end(JSON.stringify(body)); };

async function demoWindow() {
  const ds = await loadDataset(config.demo.dataset);
  const w = activityWindow(ds, config.demo.bars);
  return { dataset: ds.id, from: w.start, to: w.start + config.demo.bars, selectedBy: "highest market activity (mean absolute 5m return), not trading result" };
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (p === "/") { res.writeHead(200, { "content-type": TYPES[".html"] }); return res.end(await readFile(path.join(ROOT, "dashboard", "index.html"))); }
  if (p.startsWith("/fonts/")) {
    const name = path.basename(p);
    for (const d of FONT_DIRS) {
      try { const b = await readFile(path.join(d, name)); res.writeHead(200, { "content-type": TYPES[".woff2"], "cache-control": "max-age=86400" }); return res.end(b); } catch {}
    }
    res.writeHead(404); return res.end();
  }
  if (p === "/api/status") {
    if (url.searchParams.has("refresh")) await checkJev();
    return json(res, 200, { jev: jevStatus(), dataMode: "REPLAY", live: "UNAVAILABLE: no market-data host reachable; bundled real history only", safety: SAFETY_SUMMARY, datasets: await listDatasets(), demo: await demoWindow(), config: { ...config, demo: config.demo } });
  }
  if (p === "/api/stream") {
    current?.abort();
    const ctl = new AbortController();
    current = ctl;
    const demo = url.searchParams.get("mode") !== "replay";
    const opts = demo
      ? { ...(await demoWindow()), barsPerSecond: config.demo.barsPerSecond, agentStepMs: config.demo.agentStepMs, mode: "DEMO", label: "RUN DEMO" }
      : {
          dataset: url.searchParams.get("dataset") ?? config.demo.dataset,
          from: url.searchParams.has("from") ? Number(url.searchParams.get("from")) : undefined,
          to: url.searchParams.has("to") ? Number(url.searchParams.get("to")) : undefined,
          barsPerSecond: Number(url.searchParams.get("speed") ?? 12), agentStepMs: Number(url.searchParams.get("agentMs") ?? 25),
          mode: "REPLAY", label: "REPLAY",
        };
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    req.on("close", () => ctl.abort());
    try {
      await runSession({ datasetId: opts.dataset, from: opts.from, to: opts.to, barsPerSecond: opts.barsPerSecond, agentStepMs: opts.agentStepMs, mode: opts.mode, label: opts.label, signal: ctl.signal,
        emit: (e) => res.write(`data: ${JSON.stringify(e)}\n\n`) });
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    }
    if (current === ctl) current = null;
    return res.end();
  }
  if (p === "/api/stop") { current?.abort(); return json(res, 200, { stopped: true }); }
  if (p === "/api/runs") {
    const files = (await readdir(RUNS_DIR).catch(() => [])).filter((f) => f.endsWith(".json")).sort().reverse();
    return json(res, 200, files);
  }
  if (p.startsWith("/runs/")) {
    try { const b = await readFile(path.join(RUNS_DIR, path.basename(p))); res.writeHead(200, { "content-type": TYPES[".json"] }); return res.end(b); } catch { res.writeHead(404); return res.end(); }
  }
  res.writeHead(404); res.end();
}

export async function startServer(port = config.port) {
  await checkJev();
  const server = http.createServer((req, res) => handle(req, res).catch((err) => { console.error(err); if (!res.headersSent) res.writeHead(500); res.end(); }));
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer();
  const s = jevStatus();
  console.log(`JEV Paper Desk: http://localhost:${server.address().port}${process.argv.includes("--open-demo") ? "/?autodemo=1" : ""}`);
  console.log(`DATA MODE: REPLAY · PAPER ONLY · JEV: ${s.state}${s.missing.length ? ` (missing: ${s.missing.join("; ")})` : ""}`);
}
