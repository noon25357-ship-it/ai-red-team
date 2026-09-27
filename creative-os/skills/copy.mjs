// COPY: local copy templates (no LLM, $0). Output is honest template text, versioned by variant.
import { writeAsset } from "../assets.mjs";

const VARIANTS = [
  (b) => ({
    headline: `${b.brand}: the night, bottled.`,
    tagline: "Saudi oud, crafted for evenings that stay with you.",
    x_post: `ليالي تبدأ بعطر.\n${b.brand} ${b.product} — عود سعودي فاخر لأمسيات لا تُنسى.\nAvailable now.\n#${b.brand} #عطور`,
  }),
  (b) => ({
    headline: `Meet ${b.product}.`,
    tagline: "Deep oud, warm amber, and a finish made for Riyadh nights.",
    x_post: `عطرك القادم وصل.\n${b.product} من ${b.brand}: عود دافئ وعنبر.\nاطلبه الآن.\n#${b.brand} #عطر_سعودي`,
  }),
  (b) => ({
    headline: `${b.brand}. Worn after sunset.`,
    tagline: "A modern Saudi oud with a golden amber trail.",
    x_post: `بعد الغروب… ${b.brand}.\n${b.product} — عود حديث بلمسة عنبر ذهبية.\nمتوفر الآن.\n#${b.brand}`,
  }),
];

export const copy = {
  name: "COPY",
  description: "Campaign copy: headline, tagline, and an Arabic-first X post under 280 characters (local templates).",
  engine: "local-copy-template",
  status: "CONNECTED",
  costEstimate: { usd: 0, note: "local" },
  inputSchema: { brief: "object", version: "number" },
  outputSchema: { file: "string (json)", headline: "string", tagline: "string", x_post: "string" },
  async execute({ runId, brief, version }) {
    const c = VARIANTS[(version - 1) % VARIANTS.length](brief);
    const asset = await writeAsset({ runId, skill: "COPY", version, ext: "json", content: JSON.stringify(c, null, 2) });
    return {
      asset,
      data: c,
      evidence: { ...c, x_post_chars: [...c.x_post].length, x_limit: 280, languages: ["ar", "en"], generator: "local copy template (not an LLM)" },
    };
  },
};
