import { test } from "node:test";
import assert from "node:assert/strict";
import { checkJev, jevFilter, jevDecide } from "../src/jev/adapter.mjs";

test("without a key JEV is NOT_CONNECTED and returns no decision, confidence, or latency", async (t) => {
  if (process.env.TYPESAFE_API_KEY) return t.skip("a real key is configured");
  const s = await checkJev();
  assert.equal(s.state, "NOT_CONNECTED");
  assert.ok(s.missing.some((m) => m.includes("TYPESAFE_API_KEY")));
  for (const r of [await jevFilter([]), await jevDecide({})]) {
    assert.equal(r.state, "NOT_CONNECTED");
    assert.equal(r.answers, undefined);
    assert.equal(r.latencyMs, undefined);
    assert.equal(r.model, undefined);
  }
});
