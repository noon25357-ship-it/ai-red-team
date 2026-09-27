// COPY: real copywriting through `claude -p`, validated locally.
import { writeFile } from "node:fs/promises";
import { claude, unfence } from "../llm.mjs";
import { assetPath, finalizeAsset } from "../assets.mjs";
import { fileFacts, checks } from "../evidence.mjs";

const X_LIMIT = 280;

export const copy = {
  name: "COPY",
  label: "CLAUDE CLI",
  description: "Campaign copy written by Claude: English and Arabic headline and tagline, a CTA, and an Arabic-first X post under 280 characters.",
  engine: "claude -p",
  status: "CONNECTED",
  costEstimate: { usd: 0, billing: "Claude plan usage via claude -p (approved); no paid API" },
  inputSchema: { brief: "object", feedback: "string?" },
  outputSchema: { file: "json", headline_en: "string", headline_ar: "string", tagline_en: "string", tagline_ar: "string", cta_en: "string", cta_ar: "string", x_post: "string" },
  async execute({ runId, brief, version, feedback }) {
    const prompt = `You are a senior copywriter for luxury fragrance launches in Saudi Arabia.
Brief: ${brief.text}
Brand name: ${brief.brand}. Product: ${brief.product}.
Write launch copy. Return ONLY a JSON object, no prose, with keys:
headline_en, headline_ar, tagline_en, tagline_ar, cta_en, cta_ar, x_post.
x_post: Arabic-first post for X, at most ${X_LIMIT} characters including hashtags, 1-3 hashtags, no links.
Tone: premium, restrained, culturally natural Saudi Arabic (not a literal translation).${feedback ? `\nThe previous version was rejected. Fix this: ${feedback}` : ""}`;
    const r = await claude(prompt);
    let data, parseError = null;
    try { data = JSON.parse(unfence(r.text)); } catch (e) { parseError = e.message; data = {}; }
    const file = assetPath(runId, "COPY", version, "json");
    await writeFile(file, JSON.stringify(data, null, 2));
    const keys = ["headline_en", "headline_ar", "tagline_en", "tagline_ar", "cta_en", "cta_ar", "x_post"];
    const xLen = [...(data.x_post ?? "")].length;
    const validation = checks([
      ["valid JSON", !parseError, parseError ?? undefined],
      ["all fields present", keys.every((k) => typeof data[k] === "string" && data[k].trim()), keys.filter((k) => !data[k]).join(", ") || undefined],
      [`x_post ≤ ${X_LIMIT} chars`, xLen > 0 && xLen <= X_LIMIT, `${xLen} chars`],
      ["x_post contains Arabic", /[؀-ۿ]/.test(data.x_post ?? "")],
      ["Arabic fields contain Arabic", /[؀-ۿ]/.test((data.headline_ar ?? "") + (data.tagline_ar ?? ""))],
      ["x_post has 1-3 hashtags", ((data.x_post ?? "").match(/#\S+/g) ?? []).length >= 1 && ((data.x_post ?? "").match(/#\S+/g) ?? []).length <= 3],
      ["no links in x_post", !/https?:\/\//.test(data.x_post ?? "")],
    ]);
    const asset = await finalizeAsset({ runId, skill: "COPY", version, file, evidence: {
      files: [await fileFacts(file)],
      generated_content: data,
      x_post_chars: xLen,
      validation,
      generator: { tool: "claude -p", model: r.model, durationMs: r.durationMs, outputTokens: r.outputTokens, reportedCostUsdListPrice: r.reportedCostUsd },
    } });
    return { asset, data };
  },
};
