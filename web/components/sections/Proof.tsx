"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content/en";
import { proof } from "@/content/proof";
import { useInView } from "@/lib/hooks";

/*
  Renders only what content/proof.ts contains. With no approved data,
  it shows the measurement framework — never invented numbers.
*/
export function Proof({ t }: { t: Dictionary["proof"] }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, { rootMargin: "0px 0px -15% 0px" });
  const { metrics, caseStudies } = proof;

  return (
    <section ref={ref} id="results" aria-labelledby="proof-title" className="bg-paper py-[clamp(88px,14vh,180px)]">
      <div className="shell grid gap-10 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-5">
          <p className="label fade-up text-graphite">{t.kicker}</p>
          <h2 id="proof-title" className="display-md fade-up mt-6 max-w-[16ch] text-[clamp(32px,3.6vw,56px)]" style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
          <p className="fade-up mt-6 max-w-[44ch] text-[16px] leading-relaxed text-graphite" style={{ ["--i" as string]: 2 }}>
            {t.body}
          </p>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <div className="label flex justify-between border-b border-ink pb-3 text-graphite">
            <span>{t.columns.measure}</span>
            <span>{t.columns.value}</span>
          </div>
          <dl>
            {metrics.map((m, i) => (
              <div
                key={m.id}
                className="fade-up flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-5"
                style={{ ["--i" as string]: i + 3 }}
              >
                <dt className="flex items-baseline gap-4">
                  <span className="label text-graphite">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[clamp(18px,1.6vw,24px)] font-medium tracking-[-0.015em]">{t.metrics[m.id] ?? m.label}</span>
                </dt>
                {m.value ? (
                  <dd className="text-end">
                    <span className="display-md text-[clamp(24px,2.4vw,36px)]">{m.value}</span>
                    {m.context && <span className="label block text-graphite">{m.context}</span>}
                  </dd>
                ) : (
                  <dd className="flex items-center">
                    <span className="block h-[18px] w-[88px] border border-dashed border-ink/25" aria-hidden="true" />
                    <span className="sr-only">{t.pending}</span>
                  </dd>
                )}
              </div>
            ))}
          </dl>

          <p className="label mt-4 text-graphite">{t.pending}</p>
          <div className="mt-12">
            <p className="label text-ink">{t.casesLabel}</p>
            {caseStudies.length === 0 ? (
              <p className="mt-3 text-[15px] text-graphite">{t.casesEmpty}</p>
            ) : (
              <ul className="mt-3 border-t border-rule">
                {caseStudies.map((c) => (
                  <li key={c.client} className="border-b border-rule py-4">
                    <a href={c.href ?? "#"} className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="text-[18px] font-medium">{c.headline}</span>
                      <span className="label text-graphite">
                        {c.client} · {c.sector}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
