// Skill Registry: the only place skills are listed. Order is display order around the JEV core.
import { image } from "./image.mjs";
import { motion } from "./motion.mjs";
import { video } from "./video.mjs";
import { copy } from "./copy.mjs";
import { frontend } from "./frontend.mjs";
import { review } from "./review.mjs";

export const SKILLS = [image, motion, video, copy, frontend, review];
export const getSkill = (name) => SKILLS.find((s) => s.name === name);

/** Serializable view for the dashboard and the JEV state. */
export const describeSkills = () =>
  SKILLS.map(({ name, description, engine, status, costEstimate, inputSchema, outputSchema }) => ({
    name, description, engine, status, costEstimate, inputSchema, outputSchema,
  }));
