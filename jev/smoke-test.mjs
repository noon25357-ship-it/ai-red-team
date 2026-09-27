// Real end-to-end JEV call. No mocks, no fallback: any failure exits non-zero with the real error.
import { choice, TypeSafeClient, TypeSafeError, APIError, VERSION } from "@typesafe-ai/sdk";

let client;
try {
  client = new TypeSafeClient({ retry: { maxRetries: 0 } });
} catch (err) {
  console.error(`[init failed] ${err.name}: ${err.message}`);
  process.exit(1);
}

const request = {
  state: { task: "Create a 20-second product launch video" },
  questions: {
    strategy: choice("Which production strategy should be used first for this task?", {
      IMAGE_FIRST: "Start from still key visuals, then animate them.",
      MOTION_FIRST: "Start from motion graphics / animated typography.",
      VIDEO_FIRST: "Start from generated or filmed video footage.",
    }),
  },
};

const t0 = performance.now();
try {
  const result = await client.systemOne(request);
  const latencyMs = Math.round(performance.now() - t0);
  const a = result.answers.strategy;
  console.log(`JEV decision: ${a.choice}`);
  console.log(`confidence:   ${a.confidence}`);
  console.log(`probabilities: ${JSON.stringify(a.probabilities)}`);
  console.log(`latency:      ${latencyMs} ms`);
  console.log(`model:        ${result.model} (sdk ${VERSION})`);
} catch (err) {
  const latencyMs = Math.round(performance.now() - t0);
  const status = err instanceof APIError ? ` status=${err.status} requestId=${err.requestId}` : "";
  console.error(`[call failed after ${latencyMs} ms] ${err.name}:${status} ${err.message}`);
  if (err.cause) console.error(`cause: ${err.cause.code ?? ""} ${err.cause.message ?? err.cause}`);
  process.exit(1);
}
