// Load bundled real historical candles (see data/SOURCE.md).
import { readFile, readdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const cache = new Map();

export async function listDatasets() {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json.gz"));
  const out = [];
  for (const f of files) {
    const d = await loadDataset(f.replace(".json.gz", ""));
    out.push({ id: d.id, title: d.title, quote: d.quote, interval: d.interval, symbols: Object.keys(d.symbols), bars: d.length, start: d.times[0], end: d.times.at(-1) });
  }
  return out;
}

/** Candles aligned on a shared time axis. A symbol missing a candle at a time gets null there. */
export async function loadDataset(id) {
  if (cache.has(id)) return cache.get(id);
  const raw = JSON.parse(gunzipSync(await readFile(path.join(DATA_DIR, `${path.basename(id)}.json.gz`))).toString());
  const timeSet = new Set();
  for (const rows of Object.values(raw.symbols)) for (const r of rows) timeSet.add(r[0]);
  const times = [...timeSet].sort((a, b) => a - b);
  const index = new Map(times.map((t, i) => [t, i]));
  const symbols = {};
  for (const [sym, rows] of Object.entries(raw.symbols)) {
    const arr = new Array(times.length).fill(null);
    for (const [t, o, h, l, c, v] of rows) arr[index.get(t)] = { t, o, h, l, c, v };
    symbols[sym] = arr;
  }
  const d = { id: raw.id, title: raw.title, quote: raw.quote, interval: raw.interval, source: raw.source, times, symbols, length: times.length };
  cache.set(id, d);
  return d;
}

/** The last n non-null candles of a symbol up to and including bar i. */
export function history(dataset, sym, i, n) {
  const out = [];
  const arr = dataset.symbols[sym];
  for (let k = i; k >= 0 && out.length < n; k--) if (arr[k]) out.push(arr[k]);
  return out.reverse();
}
