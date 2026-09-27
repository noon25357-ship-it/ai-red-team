"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content/en";
import { useInView } from "@/lib/hooks";
import { Arrow } from "../ui/Logo";
import { mailto } from "@/lib/contact";

export function Offers({ t }: { t: Dictionary["offers"] }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, { rootMargin: "0px 0px -15% 0px" });

  return (
    <section ref={ref} id="offers" aria-labelledby="offers-title" className="bg-stone py-[clamp(88px,14vh,180px)]">
      <div className="shell">
        <div className="grid gap-6 md:grid-cols-12">
          <p className="label fade-up text-graphite md:col-span-3">{t.kicker}</p>
          <h2 id="offers-title" className="display-md fade-up text-[clamp(38px,5vw,84px)] md:col-span-9" style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
        </div>

        <ul className="mt-[clamp(48px,8vh,96px)]">
          {t.items.map((o, i) => {
            const flagship = i === t.items.length - 1;
            return (
              <li
                key={o.id}
                className={`fade-up group relative grid gap-6 border-t py-10 md:grid-cols-12 md:gap-6 md:py-12 ${
                  flagship ? "border-ink bg-ink px-5 text-stone md:-mx-6 md:px-6" : "border-ink"
                }`}
                style={{ ["--i" as string]: i + 2 }}
              >
                <div className="md:col-span-4">
                  <h3 className="display text-[clamp(30px,3.2vw,52px)] leading-[0.92]">{o.name}</h3>
                  <p className={`label mt-5 ${flagship ? "text-fog" : "text-graphite"}`}>
                    {t.labels.shape} — {o.shape}
                  </p>
                  <a
                    href={mailto(`${o.name} — ${t.cta}`)}
                    className={`btn mt-8 hidden md:inline-flex ${flagship ? "btn-invert" : ""}`}
                    aria-label={`${t.cta}: ${o.name}`}
                  >
                    {t.cta}
                    <Arrow />
                  </a>
                </div>
                <div className="md:col-span-4">
                  <p className={`label ${flagship ? "text-fog" : "text-graphite"}`}>{t.labels.for}</p>
                  <p className="mt-2 text-[19px] font-medium leading-snug tracking-[-0.01em]">{o.for}</p>
                  <p className={`mt-4 text-[15px] leading-relaxed ${flagship ? "text-stone/75" : "text-graphite"}`}>{o.body}</p>
                </div>
                <div className="md:col-span-3 md:col-start-10">
                  <p className={`label ${flagship ? "text-fog" : "text-graphite"}`}>{t.labels.includes}</p>
                  <ul className="mt-2">
                    {o.includes.map((x) => (
                      <li key={x} className={`border-b py-2 text-[14px] ${flagship ? "border-rule-dark" : "border-rule"}`}>
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="md:hidden">
                  <a
                    href={mailto(`${o.name} — ${t.cta}`)}
                    className={`btn ${flagship ? "btn-invert" : ""}`}
                    aria-label={`${t.cta}: ${o.name}`}
                  >
                    {t.cta}
                    <Arrow />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
