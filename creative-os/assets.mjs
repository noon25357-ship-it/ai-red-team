// Asset pipeline: outputs/<kind>/<runId>-<skill>-v<N>.<ext> plus a .meta.json sidecar with evidence and JEV review.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUTPUTS = path.join(ROOT, "outputs");
export const DIRS = { IMAGE: "images", VIDEO: "video", MOTION: "motion", COPY: "copy", FRONTEND: "frontend", REVIEW: "review" };

export async function ensureOutputDirs() {
  for (const d of [...Object.values(DIRS), "demo", "runs"]) await mkdir(path.join(OUTPUTS, d), { recursive: true });
}

export function assetPath(runId, skill, version, ext, suffix = "") {
  return path.join(OUTPUTS, DIRS[skill], `${runId}-${skill.toLowerCase()}-v${version}${suffix}.${ext}`);
}

/** Record the primary file of an output with its evidence. Returns the metadata (paths relative to the repo root). */
export async function finalizeAsset({ skill, version, file, evidence }) {
  const meta = {
    file: path.relative(ROOT, file),
    timestamp: new Date().toISOString(),
    sourceSkill: skill,
    version,
    status: "PENDING_REVIEW",
    evidence,
    jevReview: null,
  };
  await writeMeta(meta);
  return meta;
}

export async function writeMeta(meta) {
  await writeFile(path.join(ROOT, `${meta.file}.meta.json`), JSON.stringify(meta, null, 2));
}
