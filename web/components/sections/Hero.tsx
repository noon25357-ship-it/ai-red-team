"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/content/en";
import { Arrow } from "../ui/Logo";
import { HeroSystem } from "./HeroSystem";

export function Hero({ t }: { t: Dictionary["hero"] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(f);
  }, []);

  return (
    <section id="top" aria-labelledby="hero-title" className={`relative overflow-x-clip ${ready ? "is-ready" : ""}`}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--nav-h)] hidden lg:block">
        <div className="shell relative h-full">
          <div className="pointer-events-auto relative h-full">
            <HeroSystem nodes={t.nodes} label={t.diagramLabel} note={t.diagramNote} a11y={t.diagramA11y} />
          </div>
        </div>
      </div>
      <div className="shell relative flex flex-col pt-[calc(var(--nav-h)+clamp(24px,5vh,56px))] lg:min-h-[max(100svh,820px)]">
        <div className="flex items-center justify-between gap-6 border-t border-rule pt-4">
          <p className="label fade-up text-graphite" style={{ ["--d" as string]: "100ms" }}>
            {t.eyebrow}
          </p>
        </div>

        <h1 id="hero-title" className="display hero-title mt-[clamp(20px,4vh,48px)]">
          {t.title.map((line, i) => (
            <span key={line} className="reveal-line" style={{ ["--i" as string]: i, ["--d" as string]: "150ms" }}>
              <span>
                {line}
                {i === t.title.length - 1 && <span className="text-signal">.</span>}
              </span>
            </span>
          ))}
        </h1>

        <div className="relative mt-[clamp(24px,4.5vh,48px)] flex flex-col">
          <div className="relative z-10 max-w-[460px]">
            <p className="lede fade-up font-medium text-ink" style={{ ["--d" as string]: "450ms" }}>
              {t.lead}
            </p>
            <p className="fade-up mt-3 text-[15px] leading-relaxed text-graphite" style={{ ["--d" as string]: "550ms" }}>
              {t.body}
            </p>
            <div className="fade-up mt-7 flex flex-wrap items-center gap-x-7 gap-y-2" style={{ ["--d" as string]: "650ms" }}>
              <a href="#contact" className="btn">
                {t.primary}
                <Arrow />
              </a>
              <a href="#system" className="link-quiet">
                {t.secondary}
              </a>
            </div>
          </div>

          <div className="relative mt-14 h-[480px] sm:h-[400px] lg:hidden">
            <HeroSystem nodes={t.nodes} label={t.diagramLabel} note={t.diagramNote} a11y={t.diagramA11y} />
          </div>
          <p className="mb-10 mt-6 max-w-[52ch] text-[13px] leading-snug text-graphite lg:hidden">
            <span className="label me-2 inline-flex items-center gap-2 text-ink">
              <span className="inline-block size-2 bg-signal" />
              {t.diagramLabel}
            </span>
            {t.diagramNote}
          </p>
        </div>
      </div>
    </section>
  );
}
