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

/**
 * Final campaign review (REVIEW). No RETRY of REVIEW itself; JEV may name one creative skill to regenerate.
 * retryable: creative skills that produced an output and still have retries left.
 */
export function finalReviewQuestions(retryable) {
  const options = {
    APPROVE_CAMPAIGN: "Every produced deliverable fits the brief and passed its checks; the campaign can ship as scoped.",
    HUMAN_REVIEW: "A person must judge the campaign before it ships.",
    INCOMPLETE: "Required deliverables are missing or failed technically, and regenerating a skill here will not fix it.",
  };
  for (const s of retryable) options[`RETRY_${s}`] = `Regenerate ${s}: its output has specific, fixable problems that block the campaign.`;
  return {
    campaign_decision: choice("Final review of the whole campaign, based only on the deliverables, their files, measurements, and validation results in the state. What should happen?", options),
    quality_score: score("Rate the overall campaign quality for the brief, counting only deliverables that were produced.", QUALITY_RUBRIC),
    acceptable: noul("Is the produced campaign acceptable to ship as scoped?"),
  };
}

/** Policy: campaign_decision is executive; quality_score and acceptable are evidence. Contradictions go to a human. */
export function finalOutcome({ decision, quality, acceptable, executionFailed }) {
  if (decision.confidence < config.confidenceFloor) return { outcome: "HUMAN_REVIEW", reason: `campaign_decision confidence ${decision.confidence.toFixed(2)} < ${config.confidenceFloor}` };
  const d = decision.decision;
  if (d.startsWith("RETRY_")) return { outcome: "RETRY", retrySkill: d.slice(6), reason: `JEV asked to regenerate ${d.slice(6)} (campaign quality ${quality}/100)` };
  if (d === "APPROVE_CAMPAIGN") {
    if (!acceptable.decision) return { outcome: "HUMAN_REVIEW", reason: "Contradiction: APPROVE_CAMPAIGN but acceptable = no" };
    if (quality < POLICY.approveMinQuality) return { outcome: "HUMAN_REVIEW", reason: `Contradiction: APPROVE_CAMPAIGN but quality ${quality}/100` };
    if (executionFailed.length) return { outcome: "INCOMPLETE", reason: `JEV approved what was produced, but ${executionFailed.join(", ")} failed technically` };
    return { outcome: "APPROVED", reason: `JEV approved the campaign (quality ${quality}/100)` };
  }
  if (d === "INCOMPLETE") return { outcome: "INCOMPLETE", reason: executionFailed.length ? `Incomplete: ${executionFailed.join(", ")} failed technically` : "JEV marked the campaign incomplete" };
  return { outcome: "HUMAN_REVIEW", reason: "JEV requested human review of the campaign" };
}

/** Name the cause of a technical failure plainly instead of scoring it as low quality. */
export function classifyFailure(message) {
  if (/oauth|token.*(expired|invalid)|not logged in|log ?in|authenticat|401|unauthori[sz]ed/i.test(message)) return "Claude CLI authentication expired or missing (OAuth); run `claude` and log in again";
  if (/timed out/i.test(message)) return "Generation timed out";
  if (/not runnable|ENOENT/i.test(message)) return "Claude CLI not installed or not on PATH";
  return "Technical failure during execution";
}
