// Thin wrapper over the existing @typesafe-ai/sdk connection (same client config as jev/smoke-test.mjs).
// Every decision is a real systemOne call; latency is measured around that call only.
import { TypeSafeClient, APIError } from "@typesafe-ai/sdk";

let client;
function getClient() {
  client ??= new TypeSafeClient({ retry: { maxRetries: 0 } });
  return client;
}

/** Normalize one answer into { type, decision, confidence, probabilities }. */
function normalize(answer) {
  switch (answer.type) {
    case "choice":
      return { type: "choice", decision: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities };
    case "score":
      return { type: "score", decision: answer.score, confidence: answer.confidence, probabilities: answer.probabilities };
    case "noul":
      // noul returns only P(yes); the decision is the likelier side and confidence its probability.
      return {
        type: "noul",
        decision: answer.noul >= 0.5,
        confidence: Math.max(answer.noul, 1 - answer.noul),
        probabilities: { yes: answer.noul, no: 1 - answer.noul },
      };
    default:
      throw new Error(`Unknown JEV answer type: ${answer.type}`);
  }
}

/**
 * Ask JEV one or more structured questions about a state.
 * @returns {{answers: Record<string, ReturnType<typeof normalize>>, latencyMs: number, model: string, usage: object}}
 */
export async function decide(state, questions) {
  const t0 = performance.now();
  const result = await getClient().systemOne({ state, questions });
  const latencyMs = Math.round(performance.now() - t0);
  const answers = Object.fromEntries(Object.entries(result.answers).map(([k, a]) => [k, normalize(a)]));
  return { answers, latencyMs, model: result.model, usage: result.usage };
}

export function describeError(err) {
  return {
    name: err?.name ?? "Error",
    message: err?.message ?? String(err),
    status: err instanceof APIError ? err.status : undefined,
    requestId: err instanceof APIError ? err.requestId : undefined,
  };
}
