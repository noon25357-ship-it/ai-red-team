// Dashboard server. GET /api/run streams a live run over SSE; GET /api/replay re-streams a saved real run.
import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, DEMO_BRIEF } from "./config.mjs";
import { runCreativeOS } from "./orchestrator.mjs";
import { describeSkills } from "./skills/registry.mjs";
import { OUTPUTS } from "./assets.mjs";

const DASHBOARD = path.join(path.dirname(fileURLToPath(import.meta.url)), "dashboard", "index.html");
const DEFAULT_DEMO_PACE_MS = 700;
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".webm": "video/webm", ".mp4": "video/mp4" };
let running = false;

const sse = (res) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  return (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
};

async function latestRunFile() {
  const files = (await readdir(path.join(OUTPUTS, "runs")).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
  return files.at(-1);
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": TYPES[".html"] });
    return res.end(await readFile(DASHBOARD));
  }
  if (url.pathname === "/api/skills") {
    res.writeHead(200, { "content-type": TYPES[".json"] });
    return res.end(JSON.stringify({ skills: describeSkills(), brief: DEMO_BRIEF }));
  }
  if (url.pathname === "/api/run") {
    if (running) { res.writeHead(409); return res.end("A run is already in progress"); }
    running = true;
    const send = sse(res);
    const paceMs = url.searchParams.has("pace") ? Number(url.searchParams.get("pace")) : config.paceMs || DEFAULT_DEMO_PACE_MS;
    try {
      await runCreativeOS({ brief: DEMO_BRIEF, emit: send, paceMs });
    } finally {
      running = false;
      res.end();
    }
    return;
  }
  if (url.pathname === "/api/replay") {
    const name = url.searchParams.get("run") ?? (await latestRunFile());
    if (!name) { res.writeHead(404); return res.end("No saved run to replay. Run a live flow first."); }
    const saved = JSON.parse(await readFile(path.join(OUTPUTS, "runs", path.basename(name.endsWith(".json") ? name : `${name}.json`)), "utf8"));
    const send = sse(res);
    // Replays the recorded events at their original timing; every decision, latency, and model is from that real run.
    const start = Date.now();
    for (const e of saved.events) {
      const wait = e.t - (Date.now() - start);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      send({ ...e, replayOf: saved.runId });
    }
    return res.end();
  }
  if (url.pathname.startsWith("/outputs/")) {
    const file = path.join(OUTPUTS, path.normalize(decodeURIComponent(url.pathname.slice("/outputs/".length))));
    if (!file.startsWith(OUTPUTS + path.sep)) { res.writeHead(403); return res.end(); }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
      return res.end(body);
    } catch {
      res.writeHead(404);
      return res.end();
    }
  }
  res.writeHead(404);
  res.end();
}

export function startServer(port = config.port) {
  const server = http.createServer((req, res) => handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }));
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer();
  console.log(`JEV Creative OS dashboard: http://localhost:${server.address().port}`);
}
