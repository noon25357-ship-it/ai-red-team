// The structured questions JEV answers at each decision point.
import { choice, noul, score } from "@typesafe-ai/sdk";

export const QUALITY_RUBRIC = [
  "Unusable: wrong, broken, or unrelated to the brief",
  "Weak: on topic but clearly below launch quality",
  "Acceptable: usable with minor issues",
  "Good: launch-ready, fits the brief",
  "Excellent: premium, distinctive, fully on brief",
];

/** Rubric index (0..4, may be fractional) to 0..100. */
export const qualityToPercent = (s) => Math.round((s / (QUALITY_RUBRIC.length - 1)) * 100);

export function nextSkillQuestions(eligible) {
  const criteria = Object.fromEntries(eligible.map((s) => [s.name, s.description]));
  criteria.DONE = "Stop: every deliverable the brief asks for is produced, blocked, or waiting on a human.";
  return {
    next_skill: choice(
      "Which skill should run next to fulfil the brief? Prefer skills whose output later skills depend on. Choose DONE only when nothing useful remains.",
      criteria,
    ),
  };
}

export function reviewQuestions() {
  return {
    quality: score("Rate this output's quality for the brief, judging only the evidence given.", QUALITY_RUBRIC),
    acceptable: noul("Is this output acceptable to ship as part of the launch campaign?"),
    action: choice("What should happen with this output?", {
      CONTINUE: "Approve it and move on to the next skill.",
      RETRY: "Regenerate it; a new version is likely to be clearly better.",
      HUMAN_REVIEW: "A person must look at it before it can be used.",
    }),
  };
}

export function costGuardQuestions(skill, usd, remainingUsd) {
  return {
    worth_it: noul(
      `Is running ${skill} worth an estimated $${usd} (remaining budget $${remainingUsd}) for this brief?`,
    ),
  };
}
