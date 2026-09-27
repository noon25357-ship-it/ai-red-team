import { test } from "node:test";
import assert from "node:assert/strict";
import { PaperEngine } from "../src/engine/paper-engine.mjs";
import { size } from "../src/agents/size.mjs";
import { config } from "../src/config.mjs";

const T = 1_764_000_000; // fixed UTC time
const c = (o, h, l, cl) => ({ o, h, l, c: cl, v: 1 });

test("market order fills at next open with slippage and fee; stop exits at the stop", () => {
  const e = new PaperEngine({ startingBalance: 1000 });
  e.onBar(0, T, { X: c(100, 100, 100, 100) });
  e.placeOrder({ symbol: "X", type: "MARKET", price: 100, qty: 1, stop: 95, takeProfit: 110, bar: 0, t: T });
  const ev = e.onBar(1, T + 300, { X: c(100, 101, 99, 100) });
  const fill = ev.find((x) => x.type === "fill");
  assert.ok(Math.abs(fill.price - 100 * (1 + config.slippage)) < 1e-9);
  const ev2 = e.onBar(2, T + 600, { X: c(99, 99, 94, 96) });
  const exit = ev2.find((x) => x.type === "exit");
  assert.equal(exit.reason, "STOP");
  assert.equal(exit.exit, 95);
  assert.ok(exit.fees > 0 && exit.pnl < 0);
  assert.ok(Math.abs(e.equity() - (1000 + exit.pnl)) < 1e-9);
});

test("when stop and target are both inside one candle the stop is assumed", () => {
  const e = new PaperEngine({ startingBalance: 1000 });
  e.onBar(0, T, { X: c(100, 100, 100, 100) });
  e.placeOrder({ symbol: "X", type: "MARKET", price: 100, qty: 1, stop: 95, takeProfit: 105, bar: 0, t: T });
  e.onBar(1, T + 300, { X: c(100, 100, 100, 100) });
  const ev = e.onBar(2, T + 600, { X: c(100, 106, 94, 100) });
  assert.equal(ev.find((x) => x.type === "exit").reason, "STOP");
});

test("limit order fills only when price trades through it, and expires otherwise", () => {
  const e = new PaperEngine({ startingBalance: 1000 });
  e.onBar(0, T, { X: c(100, 100, 100, 100) });
  e.placeOrder({ symbol: "X", type: "LIMIT", price: 98, qty: 1, stop: 95, takeProfit: 104, bar: 0, t: T });
  let expired = false;
  for (let i = 1; i <= config.limitOrderBars; i++) expired ||= e.onBar(i, T + i * 300, { X: c(100, 101, 99, 100) }).some((x) => x.type === "order_expired");
  assert.ok(expired);
  assert.equal(e.positions.size, 0);
});

test("SIZE never exceeds 10% of equity", () => {
  const r = size.run({ equity: 1000, entry: 100, stop: 99.9 }); // tiny stop → risk sizing would be huge
  assert.ok(r.output.pctOfEquity <= config.maxPositionPct + 1e-12);
  assert.equal(r.output.capped, true);
});

test("daily loss limit halts the desk, closes positions, and resumes next UTC day", () => {
  const e = new PaperEngine({ startingBalance: 1000 });
  const day = 86400 * 20000;
  e.onBar(0, day, { X: c(100, 100, 100, 100) });
  e.placeOrder({ symbol: "X", type: "MARKET", price: 100, qty: 9, stop: 1, takeProfit: 1000, bar: 0, t: day });
  e.onBar(1, day + 300, { X: c(100, 100, 100, 100) });
  const ev = e.onBar(2, day + 600, { X: c(100, 100, 94, 94) }); // −6% on 900 notional ≈ −5.4% equity... stop at 1 not hit
  assert.ok(e.halted);
  assert.ok(ev.some((x) => x.type === "risk_action" && x.action === "HALT"));
  assert.equal(e.positions.size, 0);
  const ev2 = e.onBar(3, day + 86400, { X: c(94, 94, 94, 94) });
  assert.ok(!e.halted && ev2.some((x) => x.action === "RESUME"));
});
