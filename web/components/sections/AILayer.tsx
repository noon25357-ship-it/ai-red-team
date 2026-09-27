"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/content/en";
import { useInView, useReducedMotion } from "@/lib/hooks";

const STEP_MS = 1400;

export function AILayer({ t }: { t: Dictionary["ai"] }) {
  const head = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useInView(head);
  const inView = useInView(stage, { rootMargin: "0px 0px -30% 0px" });
  const reduced = useReducedMotion();
  const last = t.steps.length - 1;
  const [step, setStep] = useState(-1);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStep(last);
      return;
    }
    if (!inView) return;
    setStep(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= last) window.clearInterval(id);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [inView, reduced, last, run]);

  const done = step >= last;

  return (
    <section
      id="ai"
      aria-labelledby="ai-title"
      data-theme="dark"
      className="relative bg-night-2 py-[clamp(88px,14vh,180px)] text-stone"
    >
      <div className="shell">
        <div ref={head} className="grid gap-6 md:grid-cols-12">
          <p className="label fade-up text-fog md:col-span-3">{t.kicker}</p>
          <div className="md:col-span-9">
            <h2 id="ai-title" className="display-md fade-up text-[clamp(34px,4.4vw,72px)]" style={{ ["--i" as string]: 1 }}>
              <span className="block">{t.title[0]}</span>
              <span className="block text-fog">{t.title[1]}</span>
            </h2>
            <p className="fade-up mt-6 max-w-[52ch] text-[16px] leading-relaxed text-fog" style={{ ["--i" as string]: 2 }}>
              {t.intro}
            </p>
          </div>
        </div>

        <div ref={stage} className="mt-[clamp(56px,9vh,110px)] grid gap-10 md:grid-cols-12 md:gap-6">
          {/* steps */}
          <ol className="md:col-span-5" aria-label={t.status.sequence}>
            {t.steps.map((s, i) => {
              const state = i < step ? "done" : i === step ? "now" : "next";
              return (
                <li
                  key={s}
                  aria-current={state === "now" ? "step" : undefined}
                  className="relative flex items-center gap-5 border-b border-rule-dark py-[14px] first:border-t"
                >
                  <span className="label w-6 shrink-0 text-fog">{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className={`flex-1 text-[clamp(17px,1.5vw,22px)] font-medium tracking-[-0.01em] transition-colors duration-500 ${
                      state === "next" ? "text-stone/30" : "text-stone"
                    }`}
                  >
                    {s}
                  </span>
                  <span
                    className={`size-2 shrink-0 transition-all duration-500 ${
                      state === "now" ? "scale-125 bg-signal" : state === "done" ? "bg-stone/70" : "bg-transparent outline outline-1 outline-fog/50"
                    }`}
                    aria-hidden="true"
                  />
                  {state === "now" && !reduced && (
                    <span className="ai-scan absolute inset-x-0 bottom-[-1px] h-px bg-signal" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>

          {/* record */}
          <div className="md:col-span-7 md:col-start-6">
            <div className="border border-rule-dark bg-night">
              <div className="flex items-center justify-between border-b border-rule-dark px-5 py-3">
                <span className="label text-stone">{t.record.title}</span>
                <span className="label text-fog">{t.record.note}</span>
              </div>
              <dl className="divide-y divide-rule-dark">
                {t.record.rows.map((r) => {
                  const shown = step >= r.step;
                  const fresh = step === r.step && !reduced;
                  return (
                    <div
                      key={r.key}
                      className={`grid grid-cols-[92px_1fr] gap-4 px-5 py-3.5 transition-[opacity,background-color] duration-700 sm:grid-cols-[120px_1fr] ${
                        shown ? "opacity-100" : "opacity-0"
                      } ${fresh ? "bg-stone/[0.045]" : ""}`}
                    >
                      <dt className="label pt-[3px] text-fog">{r.key}</dt>
                      <dd
                        className={`text-[15px] leading-snug ${"signal" in r && r.signal ? "flex items-center gap-2.5 text-stone" : "text-stone/90"} ${
                          "arabic" in r && r.arabic ? "font-arabic text-[16px]" : ""
                        }`}
                        {...("arabic" in r && r.arabic ? { lang: "ar", dir: "rtl" as const } : {})}
                      >
                        {"signal" in r && r.signal && <span className="size-2 shrink-0 bg-signal" aria-hidden="true" />}
                        {r.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="label text-fog" aria-live="polite">
                {step < 0 ? "" : done ? `${t.status.complete} · ${t.steps.length} / ${t.steps.length}` : `${t.status.running} · ${step + 1} / ${t.steps.length}`}
              </span>
              <button
                type="button"
                id="ai-replay"
                onClick={() => {
                  setStep(-1);
                  setRun((r) => r + 1);
                }}
                disabled={!done || reduced}
                className="label inline-flex min-h-10 items-center gap-2 px-1 text-stone transition-opacity disabled:opacity-30"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M10 6a4 4 0 1 1-1.2-2.85M10 1.5V4H7.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                {t.replay}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
