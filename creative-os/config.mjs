// Limits and guards for the orchestrator. Override with env vars; no paid provider is enabled by default.
const num = (name, fallback) => {
  const v = process.env[name];
  return v === undefined || v.trim() === "" ? fallback : Number(v);
};

export const config = {
  maxRetriesPerSkill: 2,
  // Safety cap on skill executions per run (each run, retry, or NOT CONNECTED pick is one step).
  maxSteps: 16,
  // A JEV decision below this confidence is "clearly low" and goes to HUMAN_REVIEW.
  confidenceFloor: num("CREATIVE_OS_CONFIDENCE_FLOOR", 0.25),
  // Budget for paid skills in USD. 0 means no paid call can run without a human.
  budgetUsd: num("CREATIVE_OS_BUDGET_USD", 0),
  // Display-only pause between visible stages so the dashboard is readable on video.
  // Never included in any reported latency.
  paceMs: num("CREATIVE_OS_PACE_MS", 0),
  port: num("CREATIVE_OS_PORT", 4173),
};

// brand and product are working names passed to every skill so outputs stay consistent; shown in the dashboard.
export const DEMO_BRIEF = {
  text: "Create a premium launch campaign for a Saudi perfume brand",
  brand: "LAYALI",
  product: "Oud Nights Eau de Parfum",
};
