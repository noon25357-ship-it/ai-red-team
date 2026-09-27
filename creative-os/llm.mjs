// Real generation through the local Claude Code CLI (`claude -p`). Uses the user's Claude login; no API key.
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const TIMEOUT_MS = 300_000;

/**
 * Run one non-interactive Claude call with no tools. Returns the text plus model, duration and reported cost.
 * Throws with the CLI's own error text on failure.
 */
export function claude(prompt, { timeoutMs = TIMEOUT_MS } = {}) {
  const args = ["-p", "--output-format", "json", "--tools", "", "--no-session-persistence", "--strict-mcp-config", "--setting-sources", ""];
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    // Run outside the repo so no project CLAUDE.md or settings leak into the prompt.
    const child = spawn("claude", args, { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`claude -p timed out after ${timeoutMs} ms`)); }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(new Error(`claude CLI not runnable: ${e.message}`)); });
    child.on("close", (code) => {
      clearTimeout(timer);
      const wallMs = Math.round(performance.now() - t0);
      let json;
      try { json = JSON.parse(out); } catch { return reject(new Error(`claude -p exit ${code}: ${(err || out).slice(0, 500)}`)); }
      if (json.is_error || code !== 0) return reject(new Error(`claude -p error: ${String(json.result ?? err).slice(0, 500)}`));
      resolve({
        text: json.result,
        model: Object.keys(json.modelUsage ?? {}).join(", ") || "unknown",
        durationMs: wallMs,
        reportedCostUsd: json.total_cost_usd ?? null,
        outputTokens: json.usage?.output_tokens ?? null,
      });
    });
    child.stdin.end(prompt);
  });
}

/** Strip a surrounding ```lang fence if the model added one. */
export function unfence(text) {
  const m = text.trim().match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return (m ? m[1] : text).trim();
}

/** Locate the installed frontend-design skill so FRONTEND can follow it. Returns null when not installed. */
export async function findSkill(name) {
  const roots = [path.join(homedir(), ".claude", "skills"), path.join(homedir(), ".claude", "plugins")];
  for (const root of roots) {
    try {
      const hits = (await readdir(root, { recursive: true })).filter((f) => f.endsWith(path.join(name, "SKILL.md")));
      for (const f of hits) {
        const file = path.join(root, f);
        const body = (await readFile(file, "utf8")).replace(/^---[\s\S]*?---\s*/, "");
        return { file, body };
      }
    } catch { /* root missing */ }
  }
  return null;
}
