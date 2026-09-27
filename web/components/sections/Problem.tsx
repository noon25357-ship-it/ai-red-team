"use client";

import { useCallback, useRef, useState } from "react";
import type { Dictionary } from "@/content/en";
import { useInView, useStickyProgress } from "@/lib/hooks";

// Horizontal drift of each row in the broken state, in px (desktop) — scaled on mobile via --drift.
const JITTER = [0, 64, -8, 120, 36, 164, 0];
const LEAK = [false, true, true, true, true, true, false];

export function Problem({ t }: { t: Dictionary["problem"] }) {
  const ref = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);
  useInView(head);
  const onProgress = useCallback((p: number) => setConnected(p > 0.62), []);
  useStickyProgress(ref, onProgress);

  const rows = t.after.items.map((after, i) => ({ after, before: t.before.items[i] }));

  return (
    <section ref={ref} id="problem" aria-labelledby="problem-title" className="problem relative h-[270vh] bg-paper">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="shell grid w-full gap-8 pt-[var(--nav-h)] md:grid-cols-12 md:gap-6">
          <div ref={head} className="flex flex-col justify-center md:col-span-5">
            <p className="label fade-up text-graphite">{t.kicker}</p>
            <h2 id="problem-title" className="mt-4 md:mt-6">
              <span className="fade-up block max-w-[26ch] text-[clamp(20px,1.9vw,28px)] font-medium leading-tight tracking-[-0.015em] text-graphite" style={{ ["--i" as string]: 1 }}>
                {t.title[0]}
              </span>
              <span className="display-md fade-up mt-3 block max-w-[14ch] text-[clamp(34px,4.4vw,72px)] md:mt-5" style={{ ["--i" as string]: 2 }}>
                {t.title[1]}
              </span>
            </h2>

            <div className="mt-6 hidden md:mt-14 md:block" aria-live="polite">
              <div className="flex items-center gap-4">
                <span className={`label transition-colors duration-300 ${connected ? "text-graphite" : "text-ink"}`}>{t.before.label}</span>
                <span className="relative h-px flex-1 bg-rule">
                  <span className="problem-meter absolute inset-y-0 start-0 bg-ink" />
                </span>
                <span className={`label transition-colors duration-300 ${connected ? "text-ink" : "text-graphite"}`}>{t.after.label}</span>
              </div>
              <p className="mt-4 min-h-[3em] max-w-[40ch] text-[15px] leading-relaxed text-graphite">
                {connected ? t.after.caption : t.before.caption}
              </p>
            </div>
          </div>

          <div className="relative md:col-span-7 md:col-start-6" aria-hidden="true">
            <ol className="problem-chain relative" data-connected={connected}>
              {rows.map(({ before, after }, i) => (
                <li
                  key={after.name}
                  className="problem-row"
                  style={{
                    ["--k" as string]: i,
                    ["--jx" as string]: `${JITTER[i]}px`,
                  }}
                >
                  <span className="problem-link">
                    {i < rows.length - 1 && (
                      <>
                        <span className={`problem-link-broken ${LEAK[i + 1] ? "is-leak" : ""}`} />
                        <span className="problem-link-solid" />
                      </>
                    )}
                  </span>
                  <span className="problem-mark" />
                  <span className="problem-text">
                    <span className="problem-before">
                      {before ? (
                        <>
                          <span className="problem-name">{before.name}</span>
                          <span className="problem-note">{before.note}</span>
                        </>
                      ) : null}
                    </span>
                    <span className="problem-after">
                      <span className="problem-name">{after.name}</span>
                      <span className="problem-note">{after.note}</span>
                    </span>
                  </span>
                </li>
              ))}
              <span className="problem-signal" />
            </ol>
            <p className="label mt-6 text-graphite md:hidden">
              {connected ? t.after.label : t.before.label} — {connected ? t.after.caption : t.before.caption}
            </p>
          </div>
        </div>
      </div>

      <div className="sr-only">
        <h3>{t.before.label}</h3>
        <ol>
          {t.before.items.map((it) => (
            <li key={it.name}>
              {it.name}: {it.note}
            </li>
          ))}
        </ol>
        <h3>{t.after.label}</h3>
        <ol>
          {t.after.items.map((it) => (
            <li key={it.name}>
              {it.name}: {it.note}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
