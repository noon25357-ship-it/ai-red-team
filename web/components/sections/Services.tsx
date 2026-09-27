"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content/en";
import { useInView } from "@/lib/hooks";
import { Arrow } from "../ui/Logo";

/* A plain, commercial answer to "what do I get?" — one row per capability. */
export function Services({ t }: { t: Dictionary["services"] }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, { rootMargin: "0px 0px -15% 0px" });

  return (
    <section ref={ref} id="services" aria-labelledby="services-title" className="bg-stone py-[clamp(88px,14vh,180px)]">
      <div className="shell grid gap-12 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-4">
          <div className="md:sticky md:top-[calc(var(--nav-h)+40px)]">
            <p className="label fade-up text-graphite">{t.kicker}</p>
            <h2 id="services-title" className="display-md fade-up mt-6 text-[clamp(34px,3.8vw,62px)]" style={{ ["--i" as string]: 1 }}>
              {t.title}
            </h2>
            <p className="fade-up mt-6 max-w-[38ch] text-[16px] leading-relaxed text-graphite" style={{ ["--i" as string]: 2 }}>
              {t.intro}
            </p>
            <a href="#contact" className="btn fade-up mt-9" style={{ ["--i" as string]: 3 }}>
              {t.cta}
              <Arrow />
            </a>
          </div>
        </div>

        <ol className="border-t border-ink md:col-span-8">
          {t.items.map((s, i) => (
            <li
              key={s.name}
              className="service-row fade-up group grid gap-5 border-b border-rule py-8 sm:grid-cols-[56px_1fr] md:grid-cols-[56px_1.1fr_1fr] md:gap-6 md:py-10"
              style={{ ["--i" as string]: i + 2 }}
            >
              <span className="label flex items-center gap-2.5 text-graphite">
                <span className="service-mark block size-2 bg-ink/25 transition-colors duration-300" aria-hidden="true" />
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="display-md text-[clamp(22px,2vw,30px)]">{s.name}</h3>
                <p className="mt-3 max-w-[44ch] text-[16px] leading-relaxed text-graphite">{s.body}</p>
              </div>
              <div className="sm:col-start-2 md:col-start-auto">
                <p className="label text-ink">{t.receive}</p>
                <ul className="mt-2">
                  {s.outputs.map((o) => (
                    <li key={o} className="flex items-start gap-3 py-1.5 text-[15px] font-medium">
                      <span className="mt-[0.6em] block h-px w-3 shrink-0 bg-ink" aria-hidden="true" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
