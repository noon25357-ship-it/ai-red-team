// JEV Adapter: the only place the desk talks to JEV (TypeSafe systemOne).
// Without TYPESAFE_API_KEY and network access to api.typesafe.ai it reports NOT_CONNECTED and returns no decision.
// Nothing in this file ever produces a decision, confidence, or latency that did not come from a real JEV call.
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";

const HOST = "https://api.typesafe.ai";
let client = null;
let status = { state: "UNKNOWN", missing: [], checkedAt: null };

async function reachable() {
  try {
    const ctl = AbortSignal.timeout(5000);
    const res = await fetch(`${HOST}/v1/models`, { signal: ctl });
    // An egress proxy that blocks the host answers itself (403 + x-deny-reason); that is not JEV.
    const deny = res.headers.get("x-deny-reason");
    if (deny) return { ok: false, error: `blocked by network policy: ${deny}` };
    return { ok: true };   // any answer from JEV itself (even 401) proves the network path
  } catch (err) {
    return { ok: false, error: err.cause?.code ?? err.message };
  }
}

/** Check whether JEV can be used right now. Never prints or returns the key. */
export async function checkJev() {
  const missing = [];
  const hasKey = Boolean(process.env.TYPESAFE_API_KEY?.trim());
  if (!hasKey) missing.push("TYPESAFE_API_KEY environment variable");
  const net = await reachable();
  if (!net.ok) missing.push(`network access to api.typesafe.ai (${net.error})`);
  if (missing.length === 0) {
    try {
      client = new TypeSafeClient({ retry: { maxRetries: 0 }, timeout: 15000 });
      const models = await client.models.list();
      status = { state: "CONNECTED", missing: [], models: models.map((m) => m.name), model: client.defaultModel, checkedAt: new Date().toISOString() };
      return status;
    } catch (err) {
      missing.push(`JEV rejected the connection: ${err.name}${err.status ? " " + err.status : ""}`);
    }
  }
  client = null;
  status = { state: "NOT_CONNECTED", missing, checkedAt: new Date().toISOString() };
  return status;
}

export const jevStatus = () => status;
export const NOT_CONNECTED = () => ({ state: "NOT_CONNECTED", missing: status.missing });

function normalize(a) {
  return { decision: a.choice, confidence: a.confidence, probabilities: a.probabilities };
}
async function ask(state, questions) {
  const t0 = performance.now();
  const r = await client.systemOne({ state, questions });
  return { answers: Object.fromEntries(Object.entries(r.answers).map(([k, a]) => [k, normalize(a)])), latencyMs: Math.round(performance.now() - t0), model: r.model };
}

/** JEV Filter: pick the best candidate or none, then APPROVE / REJECT / HUMAN_REVIEW it. */
export async function jevFilter(scanRows) {
  if (status.state !== "CONNECTED") return NOT_CONNECTED();
  const top = scanRows.slice(0, 6);
  const criteria = Object.fromEntries(top.map((r) => [r.symbol, `score ${r.score}, 1h momentum ${r.momentumPct.toFixed(2)}%, volatility ${r.volatilityPct.toFixed(1)}%/day`]));
  criteria.NONE = "No symbol is worth a trade right now.";
  const r = await ask(
    { task: "Paper-trading desk market filter", market: top.map(({ spark, scoreParts, ...row }) => row) },
    {
      candidate: choice("Which symbol is the best long candidate right now, if any?", criteria),
      verdict: choice("Should the desk analyse this candidate further?", {
        APPROVE: "Worth a full agent review.",
        REJECT: "Not worth a trade.",
        HUMAN_REVIEW: "Unclear; a person should look.",
      }),
    },
  );
  return { state: "CONNECTED", ...r };
}

/** Final decision over all agent outputs: BUY / HOLD / SKIP. RISK keeps its veto regardless. */
export async function jevDecide(context) {
  if (status.state !== "CONNECTED") return NOT_CONNECTED();
  const r = await ask(
    { task: "Paper-trading desk final decision", ...context },
    {
      decision: choice("Given every agent's output, what should the desk do with this candidate?", {
        BUY: "Place the paper order the agents prepared.",
        HOLD: "Keep watching; do not act this cycle.",
        SKIP: "Drop this candidate.",
      }),
    },
  );
  return { state: "CONNECTED", ...r };
}
