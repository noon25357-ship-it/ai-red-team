// REVIEW: local campaign QA that checks which deliverables exist and flags gaps ($0).
import { writeAsset } from "../assets.mjs";

const DELIVERABLES = ["IMAGE", "VIDEO", "MOTION", "FRONTEND", "COPY"];

export const review = {
  name: "REVIEW",
  description: "Final campaign QA: lists every asset, its status, and any missing or blocked deliverable.",
  engine: "local-checklist",
  status: "CONNECTED",
  costEstimate: { usd: 0, note: "local" },
  inputSchema: { context: "campaign state" },
  outputSchema: { file: "string (json)", delivered: "string[]", missing: "string[]", flagged: "string[]" },
  async execute({ runId, version, context }) {
    const rows = DELIVERABLES.map((s) => ({
      deliverable: s,
      state: context.skillState[s] ?? "NOT RUN",
      file: context.assets[s]?.asset.file ?? null,
    }));
    const report = {
      delivered: rows.filter((r) => r.state === "APPROVED").map((r) => r.deliverable),
      missing: rows.filter((r) => ["NOT RUN", "NOT CONNECTED", "BLOCKED"].includes(r.state)).map((r) => `${r.deliverable} (${r.state})`),
      flagged: rows.filter((r) => r.state === "HUMAN_REVIEW").map((r) => r.deliverable),
      rows,
    };
    const asset = await writeAsset({ runId, skill: "REVIEW", version, ext: "json", content: JSON.stringify(report, null, 2) });
    return { asset, evidence: { ...report, generator: "local checklist over the run state" } };
  },
};
