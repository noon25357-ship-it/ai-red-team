// Measured facts about output files, used as review evidence.
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "./assets.mjs";

export const rel = (abs) => path.relative(ROOT, abs);

export async function fileFacts(abs) {
  const s = await stat(abs);
  return { path: rel(abs), bytes: s.size };
}

/** Width and height from a PNG header. */
export async function pngSize(abs) {
  const b = await readFile(abs);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** Run named checks; each is [name, passed, detail?]. */
export function checks(list) {
  const results = list.map(([name, pass, detail]) => ({ check: name, pass: Boolean(pass), ...(detail !== undefined && { detail }) }));
  return { passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass).length, results };
}
