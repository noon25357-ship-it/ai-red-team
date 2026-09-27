/**
 * Proof data. The Results section renders ONLY what is in this file.
 *
 * Rules:
 * - Add a metric `value` only when it is real and approved by the client.
 * - Leave `value` as null to render the honest "reported per engagement" state.
 * - Add case studies only with written client sign-off.
 *
 * Example of a real entry (keep commented until it exists):
 *   { id: "revenue", label: "Revenue attributed", value: "SAR 4.2M", context: "Real estate · 6 months" }
 *   caseStudies: [{ client: "…", sector: "Clinics", headline: "…", href: "/cases/…" }]
 */
export type ProofMetric = {
  id: string;
  label: string;
  value: string | null;
  context?: string;
};

export type CaseStudy = {
  client: string;
  sector: string;
  headline: string;
  href?: string;
};

export const proof: { metrics: ProofMetric[]; caseStudies: CaseStudy[] } = {
  metrics: [
    { id: "revenue", label: "Revenue attributed", value: null },
    { id: "leads", label: "Leads generated", value: null },
    { id: "conversion", label: "Conversion improvement", value: null },
    { id: "cpql", label: "Cost per qualified lead", value: null },
    { id: "hours", label: "Hours automated", value: null },
  ],
  caseStudies: [],
};
