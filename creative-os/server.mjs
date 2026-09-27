// Dashboard server. GET /api/run streams a live run over SSE; GET /api/replay re-streams a saved real run.
import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, DEMO_BRIEF } from "./config.mjs";
import { runCreativeOS, resolveHumanReview, runLogPath } from "./orchestrator.mjs";
import { describeSkills } from "./skills/registry.mjs";
import { OUTPUTS } from "./assets.mjs";

const DASHBOARD = path.join(path.dirname(fileURLToPath(import.meta.url)), "dashboard", "index.html");
const DEFAULT_DEMO_PACE_MS = 700;
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webm": "video/webm", ".mp4": "video/mp4" };
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
    const saved = JSON.parse(await readFile(runLogPath(name.replace(/\.json$/, "")), "utf8"));
    // Optional time compression caps each gap between events; the event timestamps shown stay the real ones.
    const cap = url.searchParams.has("compress") ? Number(url.searchParams.get("compress")) : 0;
    const send = sse(res);
    send({ type: "replay_info", runId: saved.runId, compressedGapMs: cap || null });
    let prev = 0;
    for (const e of saved.events) {
      const gap = e.t - prev;
      prev = e.t;
      const wait = cap ? Math.min(gap, cap) : gap;
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      send({ ...e, replayOf: saved.runId });
    }
    return res.end();
  }
  const hr = url.pathname.match(/^\/api\/runs\/([\w-]+)\/human-review$/);
  if (hr && req.method === "POST") {
    let body = "";
    for await (const c of req) body += c;
    try {
      const { skill, decision } = JSON.parse(body);
      if (!["approve", "reject"].includes(decision)) throw new Error("decision must be approve or reject");
      const r = await resolveHumanReview(hr[1], skill, decision);
      res.writeHead(200, { "content-type": TYPES[".json"] });
      return res.end(JSON.stringify(r));
    } catch (err) {
      res.writeHead(400, { "content-type": TYPES[".json"] });
      return res.end(JSON.stringify({ error: err.message }));
    }
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
