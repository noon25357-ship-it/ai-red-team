import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { installSafetyGuard } from "../src/safety.mjs";
import { checkJev } from "../src/jev/adapter.mjs";
import { runSession, activityWindow, RUNS_DIR } from "../src/desk.mjs";
import { loadDataset } from "../src/market/dataset.mjs";
import { config } from "../src/config.mjs";

test("demo session end to end: rules decide, JEV stays NOT CONNECTED, ledger balances", async () => {
  installSafetyGuard();
  const jev = await checkJev();
  const ds = await loadDataset(config.demo.dataset);
  const w = activityWindow(ds, config.demo.bars);
  const types = new Set();
  const r = await runSession({ datasetId: ds.id, from: w.start, to: w.start + config.demo.bars, mode: "DEMO", emit: (e) => types.add(e.type) });
  for (const t of ["session_start", "tick", "scan", "filter", "agent", "decision", "session_end"]) assert.ok(types.has(t), `missing ${t} event`);
  assert.ok(r.decisions.length > 0 && r.trades.length > 0, "demo window should produce decisions and trades");
  if (jev.state !== "CONNECTED") {
    for (const d of r.decisions) {
      assert.equal(d.source, "RULES");
      assert.equal(d.jev.state, "NOT_CONNECTED");
      assert.equal(d.jev.confidence, undefined);
    }
  }
  for (const d of r.decisions.filter((d) => d.decision === "BUY")) assert.ok(d.pctOfEquity <= 0.1 + 1e-9);
  const open = r.metrics.openPositions.reduce((a, p) => a + p.upnl, 0);
  const pending = 0;
  const pnl = r.trades.reduce((a, t) => a + t.pnl, 0);
  assert.ok(Math.abs(r.metrics.equity - (r.metrics.startingBalance + pnl + open + pending)) < 1e-6, "equity = start + closed PnL + open PnL");
  assert.ok(existsSync(path.join(RUNS_DIR, `${r.runId}.json`)));
});
