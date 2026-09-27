import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { checkUrl, SafetyError } from "../src/safety.mjs";

test("exchange trading endpoints and unknown hosts are blocked", () => {
  assert.throws(() => checkUrl("https://api.binance.com/api/v3/order", "POST"), SafetyError);
  assert.throws(() => checkUrl("https://data-api.binance.vision/api/v3/order", "GET"), SafetyError);
  assert.throws(() => checkUrl("https://data-api.binance.vision/api/v3/klines", "POST"), SafetyError);
  assert.throws(() => checkUrl("https://api.coinbase.com/v2/accounts"), SafetyError);
  assert.doesNotThrow(() => checkUrl("https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=5m", "GET"));
  assert.doesNotThrow(() => checkUrl("https://api.typesafe.ai/v1/systemone", "POST"));
});

test("the guarded fetch refuses a real order request before any network I/O", async () => {
  const { installSafetyGuard } = await import("../src/safety.mjs");
  installSafetyGuard();
  await assert.rejects(fetch("https://api.binance.com/api/v3/order", { method: "POST" }), SafetyError);
});

test("the desk refuses to start with exchange credentials in the environment", () => {
  const code = `import("./src/safety.mjs").then(m => { try { m.installSafetyGuard(); console.log("started"); } catch (e) { console.log("refused"); } })`;
  const out = execFileSync(process.execPath, ["-e", code], { cwd: path.resolve("."), env: { ...process.env, BINANCE_API_KEY: "x" } }).toString().trim();
  assert.equal(out, "refused");
});

test("no source file contains exchange order or signing code", () => {
  const files = [];
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".mjs") && files.push(path.join(d, e.name))));
  walk("src");
  // safety.mjs is the guard itself: it names exchange credential variables in order to refuse them.
  const scanned = files.filter((f) => !f.endsWith(path.join("src", "safety.mjs")));
  const bad = /\/api\/v3\/order|X-MBX-APIKEY|createOrder|ccxt|HMAC|signature=/i;
  const hits = scanned.filter((f) => bad.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits, []);
});
