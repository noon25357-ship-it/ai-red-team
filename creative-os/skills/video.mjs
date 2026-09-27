// VIDEO: adapter only. No video provider is configured, so this skill never executes.
export const video = {
  name: "VIDEO",
  description: "Short launch video (10-20s) from a generative video provider.",
  engine: "none",
  status: "NOT CONNECTED",
  // Unknown until a provider and its pricing are configured; the cost guard treats unknown as needing a human.
  costEstimate: { usd: null, note: "paid provider, not configured" },
  inputSchema: { brief: "object", heroImage: "string?", durationSec: "number" },
  outputSchema: { file: "string (mp4)", durationSec: "number" },
  async execute() {
    throw new Error("VIDEO is NOT CONNECTED: no video provider is configured.");
  },
};
