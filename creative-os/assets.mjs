// Asset pipeline: every output is written under outputs/<kind>/ with a .meta.json sidecar.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUTPUTS = path.join(ROOT, "outputs");
export const DIRS = { IMAGE: "images", VIDEO: "video", MOTION: "motion", COPY: "copy", FRONTEND: "frontend", REVIEW: "review" };

export async function ensureOutputDirs() {
  for (const d of [...Object.values(DIRS), "demo", "runs"]) await mkdir(path.join(OUTPUTS, d), { recursive: true });
}

/** Write an asset and its metadata. Returns the metadata (paths are relative to the repo root). */
export async function writeAsset({ runId, skill, version, ext, content }) {
  const dir = path.join(OUTPUTS, DIRS[skill]);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${runId}-${skill.toLowerCase()}-v${version}.${ext}`);
  await writeFile(file, content);
  const meta = {
    file: path.relative(ROOT, file),
    timestamp: new Date().toISOString(),
    sourceSkill: skill,
    version,
    status: "PENDING_REVIEW",
    jevReview: null,
  };
  await writeMeta(meta);
  return meta;
}

export async function writeMeta(meta) {
  await writeFile(path.join(ROOT, `${meta.file}.meta.json`), JSON.stringify(meta, null, 2));
}
