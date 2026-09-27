// VIDEO: adapter only. No video provider is configured, so this skill never executes and is excluded from JEV's choices.
export const video = {
  name: "VIDEO",
  label: "NOT CONNECTED",
  description: "Short launch video from a generative video provider.",
  engine: "none",
  status: "NOT CONNECTED",
  costEstimate: { usd: null, billing: "paid provider, not configured" },
  inputSchema: { brief: "object", heroImage: "asset?", durationSec: "number" },
  outputSchema: { file: "mp4", durationSec: "number" },
  async execute() {
    throw new Error("VIDEO is NOT CONNECTED: no video provider is configured.");
  },
};
