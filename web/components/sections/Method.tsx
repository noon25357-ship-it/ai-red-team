"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content/en";
import { useInView, useReducedMotion } from "@/lib/hooks";

const LOOP = "M6 24 H1150 C1186 24 1194 50 1194 64 C1194 78 1186 104 1150 104 H50 C14 104 6 78 6 64 Z";

export function Method({ t }: { t: Dictionary["method"] }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, { rootMargin: "0px 0px -20% 0px" });
  const reduced = useReducedMotion();

  return (
    <section ref={ref} id="method" aria-labelledby="method-title" className="bg-paper py-[clamp(88px,14vh,180px)]">
      <div className="shell">
        <div className="grid gap-6 md:grid-cols-12">
          <p className="label fade-up text-graphite md:col-span-3">{t.kicker}</p>
          <h2 id="method-title" className="display-md fade-up text-[clamp(38px,5vw,84px)] md:col-span-9" style={{ ["--i" as string]: 1 }}>
            <span className="block">{t.title[0]}</span>
            <span className="block text-graphite">{t.title[1]}</span>
          </h2>
        </div>

        <div className="relative mt-[clamp(56px,10vh,120px)]">
          {/* the loop: phases run left to right, then return underneath */}
          <svg viewBox="0 0 1200 128" preserveAspectRatio="none" className="method-loop absolute inset-x-0 top-0 hidden h-[128px] w-full md:block rtl:-scale-x-100" aria-hidden="true">
            <path d={LOOP} fill="none" stroke="var(--color-ink)" strokeOpacity=".22" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            {!reduced && (
              <rect x="-4" y="-4" width="8" height="8" fill="var(--color-signal)">
                <animateMotion dur="9s" repeatCount="indefinite" path={LOOP} />
              </rect>
            )}
          </svg>

          <ol className="grid gap-14 md:grid-cols-3 md:gap-6">
            {t.phases.map((p, i) => (
              <li key={p.name} className="fade-up relative flex flex-col" style={{ ["--i" as string]: i + 2 }}>
                <div className="flex h-12 items-center gap-3 md:h-[48px]">
                  <span className="relative z-10 block size-[15px] border-[1.5px] border-ink bg-paper" aria-hidden="true" />
                  <span className="label text-graphite">{p.index}</span>
                </div>
                <h3 className="display mt-3 text-[clamp(40px,3.7vw,66px)] md:mt-[96px]">{p.name}</h3>
                <p className="mt-5 max-w-[36ch] text-[16px] leading-relaxed text-graphite">{p.body}</p>
                <p className="label mt-8 text-ink">{t.receive}</p>
                <ul className="mt-3 border-t border-rule">
                  {p.outputs.map((o) => (
                    <li key={o} className="border-b border-rule py-2.5 text-[14px] font-medium">
                      {o}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className="label absolute start-1/2 top-[97px] hidden -translate-x-1/2 bg-paper px-3 text-graphite md:block rtl:translate-x-1/2">
            ↺ {t.loopNote}
          </p>
          <p className="label mt-12 flex items-center gap-2 text-graphite md:hidden">↺ {t.loopNote}</p>
        </div>
      </div>
    </section>
  );
}
