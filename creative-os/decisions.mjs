// The structured questions JEV answers at each decision point, and the review policy that turns answers into an outcome.
import { choice, noul, score } from "@typesafe-ai/sdk";
import { config } from "./config.mjs";

export const QUALITY_RUBRIC = [
  "Unusable: broken, failed validation badly, or unrelated to the brief",
  "Weak: on topic but clearly below launch quality",
  "Acceptable: usable with minor issues",
  "Good: launch-ready, fits the brief",
  "Excellent: premium, distinctive, fully on brief",
];

/** Rubric index (0..4, may be fractional) to 0..100. */
export const qualityToPercent = (s) => Math.round((s / (QUALITY_RUBRIC.length - 1)) * 100);

export function nextSkillQuestions(eligible) {
  return {
    next_skill: choice(
      "Which skill should run next for this brief? Prefer skills whose outputs later skills depend on (FRONTEND reuses IMAGE and COPY; REVIEW checks everything, so it should run last).",
      Object.fromEntries(eligible.map((s) => [s.name, s.description])),
    ),
  };
}

export function reviewQuestions() {
  return {
    review_action: choice("Based on the evidence (files, measurements, validation results, generated content), what should happen with this output?", {
      APPROVE: "It meets the brief and passes its checks; use it.",
      RETRY: "It has specific, fixable problems; regenerate it.",
      HUMAN_REVIEW: "A person must judge it before it can be used.",
    }),
    quality_score: score("Rate this output's quality for the brief, using only the evidence given.", QUALITY_RUBRIC),
    acceptable: noul("Is this output acceptable to ship as part of the launch campaign?"),
  };
}

/**
 * Review policy. review_action is the executive decision; quality_score and acceptable are evidence.
 * A strong contradiction between them goes to HUMAN_REVIEW, never to an automatic retry.
 */
export const POLICY = { approveMinQuality: 40, retryMaxQualityWhenAcceptable: 75 };
export function reviewOutcome({ action, quality, acceptable, version, stepsLeft, failedChecks }) {
  if (action.confidence < config.confidenceFloor) return { outcome: "HUMAN_REVIEW", reason: `review_action confidence ${action.confidence.toFixed(2)} < ${config.confidenceFloor}` };
  if (action.decision === "APPROVE" && !acceptable.decision) return { outcome: "HUMAN_REVIEW", reason: "Contradiction: APPROVE but acceptable = no" };
  if (action.decision === "APPROVE" && quality < POLICY.approveMinQuality) return { outcome: "HUMAN_REVIEW", reason: `Contradiction: APPROVE but quality ${quality}/100` };
  if (action.decision === "RETRY" && acceptable.decision && quality >= POLICY.retryMaxQualityWhenAcceptable) return { outcome: "HUMAN_REVIEW", reason: `Contradiction: RETRY but acceptable = yes and quality ${quality}/100` };
  if (action.decision === "APPROVE") return { outcome: "APPROVED", reason: `JEV approved (quality ${quality}/100)` };
  if (action.decision === "HUMAN_REVIEW") return { outcome: "HUMAN_REVIEW", reason: "JEV requested human review" };
  // RETRY
  if (version - 1 >= config.maxRetriesPerSkill) return { outcome: "HUMAN_REVIEW", reason: `JEV asked RETRY; retry limit (${config.maxRetriesPerSkill}) reached` };
  if (stepsLeft <= 0) return { outcome: "HUMAN_REVIEW", reason: "JEV asked RETRY; step limit reached" };
  return { outcome: "RETRY", reason: `JEV chose RETRY (quality ${quality}/100${failedChecks.length ? `; failed: ${failedChecks.join(", ")}` : ""})` };
}

export function costGuardQuestions(skill, usd, remainingUsd) {
  return {
    worth_it: noul(`Is running ${skill} worth an estimated $${usd} (remaining budget $${remainingUsd}) for this brief?`),
  };
}
