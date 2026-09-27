"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content/en";
import { useInView, useReducedMotion } from "@/lib/hooks";

/*
  Five vendors with gaps between them, against one continuous line owned by
  one team. Same visual grammar as the rest of the page: squares are parts of
  the system, the signal only moves where the path is unbroken.
*/
export function OneTeam({ t }: { t: Dictionary["oneTeam"] }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, { rootMargin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();

  return (
    <section ref={ref} id="one-team" aria-labelledby="one-team-title" className="bg-paper py-[clamp(88px,14vh,180px)]">
      <div className="shell">
        <div className="grid gap-6 md:grid-cols-12">
          <p className="label fade-up text-graphite md:col-span-3">{t.kicker}</p>
          <div className="md:col-span-9">
            <h2 id="one-team-title" className="display-md fade-up max-w-[18ch] text-[clamp(36px,4.6vw,76px)]" style={{ ["--i" as string]: 1 }}>
              {t.title}
            </h2>
            <p className="fade-up mt-6 max-w-[56ch] text-[17px] leading-relaxed text-graphite" style={{ ["--i" as string]: 2 }}>
              {t.intro}
            </p>
          </div>
        </div>

        <div className="mt-[clamp(56px,9vh,110px)] grid gap-14">
          {/* the usual way */}
          <figure className="fade-up" style={{ ["--i" as string]: 3 }}>
            <figcaption className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="label text-graphite">{t.before.label}</span>
              <span className="text-[15px] text-graphite">{t.before.caption}</span>
            </figcaption>
            <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-0">
              {t.before.parties.map((p, i) => (
                <li key={p} className="relative flex items-center sm:pe-6">
                  <span className="flex w-full items-center gap-3 border border-dashed border-ink/35 px-4 py-4 text-[15px] font-medium text-graphite">
                    <span className="block size-2.5 shrink-0 border border-ink/50" aria-hidden="true" />
                    {p}
                  </span>
                  {i < t.before.parties.length - 1 && (
                    <span className="one-gap absolute end-0 top-1/2 hidden w-6 -translate-y-1/2 sm:block" aria-hidden="true" title={t.before.gap} />
                  )}
                </li>
              ))}
            </ol>
          </figure>

          {/* one team */}
          <figure className="fade-up" style={{ ["--i" as string]: 4 }}>
            <figcaption className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="label text-ink">{t.after.label}</span>
              <span className="text-[15px] font-medium text-ink">{t.after.caption}</span>
            </figcaption>
            <div className="relative mt-5 bg-ink text-stone">
              <ol className="grid grid-cols-1 sm:grid-cols-5">
                {t.after.stages.map((s, i) => (
                  <li
                    key={s}
                    className="flex items-center gap-3 border-rule-dark px-4 py-4 text-[15px] font-semibold max-sm:border-b max-sm:last:border-b-0 sm:border-e sm:last:border-e-0"
                  >
                    <span className={`block size-2.5 shrink-0 ${i === t.after.stages.length - 1 ? "bg-signal" : "bg-stone"}`} aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ol>
              {!reduced && (
                <span className="engine-flow one-flow hidden sm:block" aria-hidden="true">
                  <i />
                  <i />
                </span>
              )}
            </div>
          </figure>
        </div>

        <ul className="mt-16 grid gap-10 border-t border-ink pt-10 md:grid-cols-3 md:gap-6">
          {t.points.map((p, i) => (
            <li key={p.name} className="fade-up" style={{ ["--i" as string]: i + 5 }}>
              <h3 className="text-[20px] font-semibold tracking-[-0.01em]">{p.name}</h3>
              <p className="mt-2 max-w-[38ch] text-[16px] leading-relaxed text-graphite">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
