"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/content/en";
import { useInView, useReducedMotion } from "@/lib/hooks";

type Layer = Dictionary["build"]["layers"][number];

function VisualFrame({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <figure className="flex h-full flex-col">
      <div className="flex-1">{children}</div>
      <figcaption className="mt-5 flex flex-col gap-1 border-t border-rule pt-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <span className="label text-ink">{title}</span>
        <span className="max-w-[52ch] text-[13px] leading-snug text-graphite sm:text-end">{note}</span>
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------
   01 Acquisition — four creatives; budget drifts to the winner.
---------------------------------------------------------------- */
const SHARE_END = [14, 54, 24, 8];

function AdArt({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className="flex h-full flex-col justify-between bg-paper p-[9%]">
        <svg viewBox="0 0 100 60" className="w-full" aria-hidden="true">
          <path d="M4 56V26L30 10l26 16v30M56 56V32h40v24M4 56h92M18 56V40h12v16M66 42h10v8H66zM82 42h8v8h-8z" fill="none" stroke="var(--color-ink)" strokeWidth="1.3" />
        </svg>
        <p className="display-md text-[clamp(11px,1.15vw,17px)] leading-[1.02]">Ready to move in.</p>
      </div>
    );
  if (i === 1)
    return (
      <div className="flex h-full flex-col justify-between bg-palm p-[9%] text-stone">
        <p className="label !text-[9px] opacity-70">North Riyadh</p>
        <div>
          <svg viewBox="0 0 100 40" className="mb-3 w-full" aria-hidden="true">
            <path d="M0 30h100M22 30V6M22 18h40M62 18v12" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
            <rect x="58" y="14" width="8" height="8" fill="var(--color-signal)" />
          </svg>
          <p className="display-md text-[clamp(11px,1.15vw,17px)] leading-[1.02]">Minutes from King Salman Road.</p>
        </div>
      </div>
    );
  if (i === 2)
    return (
      <div className="relative flex h-full flex-col justify-end overflow-hidden bg-sand p-[9%]">
        <div className="absolute left-1/2 top-[16%] size-[34%] -translate-x-1/2 rounded-full bg-ink/80" />
        <div className="absolute left-1/2 top-[46%] h-[60%] w-[64%] -translate-x-1/2 rounded-t-[50%] bg-ink/80" />
        <p className="relative bg-stone px-1.5 py-1 text-[clamp(8px,0.75vw,11px)] font-semibold leading-tight">
          Walk through it with me
        </p>
      </div>
    );
  return (
    <div className="flex h-full flex-col justify-between bg-ink p-[9%] text-stone">
      <div className="flex justify-between">
        <span className="size-2 border-l border-t border-stone/60" />
        <span className="size-2 border-r border-t border-stone/60" />
      </div>
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 10 10" className="size-3" aria-hidden="true">
          <path d="M2 1l7 4-7 4z" fill="currentColor" />
        </svg>
        <p className="display-md text-[clamp(11px,1.15vw,17px)]">Phase II</p>
      </div>
      <div className="flex justify-between">
        <span className="size-2 border-b border-l border-stone/60" />
        <span className="size-2 border-b border-r border-stone/60" />
      </div>
    </div>
  );
}

export function AcquisitionVisual({ layer }: { layer: Layer }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { rootMargin: "0px 0px -25% 0px" });
  const variants = layer.variants ?? [];
  const winner = SHARE_END.indexOf(Math.max(...SHARE_END));

  return (
    <VisualFrame title={layer.visualTitle} note={layer.visualNote}>
      <div ref={ref} className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-3">
        {variants.map((v, i) => {
          const share = inView ? SHARE_END[i] : 25;
          const win = i === winner;
          return (
            <div key={v.id} className="group">
              <div className="flex items-baseline justify-between pb-2">
                <span className="label text-ink">Variant {v.id}</span>
                <span
                  className={`label transition-opacity duration-500 ${inView ? "opacity-100 delay-[2400ms]" : "opacity-0"} ${win ? "text-ink" : "text-graphite"}`}
                >
                  {win ? "Scaling" : SHARE_END[i] < 10 ? "Paused" : "Testing"}
                </span>
              </div>
              <div
                className={`aspect-[4/5] overflow-hidden outline outline-1 -outline-offset-1 outline-rule transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:shadow-[0_18px_30px_-18px_rgb(18_20_19/0.45)] ${
                  inView && SHARE_END[i] < 10 ? "opacity-55 transition-opacity delay-[2400ms] duration-700" : ""
                }`}
              >
                <AdArt i={i} />
              </div>
              <p className="mt-2.5 text-[13px] text-graphite">{v.hook}</p>
              <div className="mt-3 h-[3px] w-full bg-rule" aria-hidden="true">
                <div
                  className={`h-full transition-[width] duration-[2400ms] ease-[var(--ease-in-out-quart)] ${win ? "bg-signal" : "bg-ink"}`}
                  style={{ width: `${share * (100 / 54)}%`, transitionDelay: `${300 + i * 60}ms` }}
                />
              </div>
              <p className="label mt-2 !text-[10px] text-graphite">Share of spend</p>
            </div>
          );
        })}
      </div>
    </VisualFrame>
  );
}

/* ---------------------------------------------------------------
   02 Conversion — the page on the left, the event stream on the right.
---------------------------------------------------------------- */
export function ConversionVisual({ layer }: { layer: Layer }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, rootMargin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();
  const events = layer.events ?? [];
  const page = layer.page!;
  const dests = layer.destinations ?? [];
  const total = events.length + 2; // + destinations + rest
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStep(events.length + 1);
      return;
    }
    if (!inView) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % (total + 1)), 1500);
    return () => window.clearInterval(id);
  }, [inView, reduced, total, events.length]);

  const scrolled = step >= 2;
  const typing = step >= 3;
  const sent = step >= 4;
  const synced = step >= events.length + 1;

  return (
    <VisualFrame title={layer.visualTitle} note={layer.visualNote}>
      <div ref={ref} className="grid gap-4 sm:grid-cols-[1.15fr_1fr]">
        {/* the page */}
        <div className="border border-ink/80 bg-paper" aria-hidden="true">
          <div className="flex items-center gap-3 border-b border-rule px-3 py-2">
            <span className="flex gap-1">
              <span className="size-1.5 bg-ink/25" />
              <span className="size-1.5 bg-ink/25" />
            </span>
            <span className="label !text-[10px] text-graphite">/villas/phase-ii</span>
          </div>
          <div className="relative h-[300px] overflow-hidden">
            <div
              className="p-5 transition-transform duration-[1200ms] ease-[var(--ease-in-out-quart)]"
              style={{ transform: scrolled ? "translateY(calc(-100% + 300px))" : "none" }}
            >
              <p className="label !text-[10px] text-graphite">{page.kicker}</p>
              <p className="display-md mt-2 max-w-[18ch] text-[19px] leading-[1.05]">{page.title}</p>
              <svg viewBox="0 0 200 70" className="mt-4 w-full border border-rule bg-stone" aria-hidden="true">
                <path d="M16 62V30l44-20 44 20v32M104 62V36h80v26M8 62h184M40 62V44h14v18M124 44h14v10h-14zM154 44h14v10h-14z" fill="none" stroke="var(--color-ink)" strokeWidth="1" />
              </svg>
              <div className="mt-4 space-y-2">
                {page.fields.map((f, i) => (
                  <div key={f} className="flex h-8 items-center border border-ink/30 bg-stone px-2 text-[11px] text-graphite">
                    {typing && i === 0 ? (
                      <span className="text-ink">
                        Abdullah A.<span className="ms-px inline-block h-3 w-px animate-pulse bg-ink align-middle" />
                      </span>
                    ) : sent && i > 0 ? (
                      <span className="text-ink">{i === 1 ? "05• ••• ••••" : "Thursday"}</span>
                    ) : (
                      f
                    )}
                  </div>
                ))}
                <div className={`flex h-9 items-center justify-center text-[12px] font-semibold transition-colors duration-300 ${sent ? "bg-signal text-ink" : "bg-ink text-stone"}`}>
                  {sent ? "✓" : page.submit}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* the event stream */}
        <div className="flex flex-col border border-rule bg-stone/60">
          <p className="label border-b border-rule px-3 py-2 text-graphite">Event stream</p>
          <ol className="flex-1">
            {events.map((e, i) => {
              const on = step > i;
              return (
                <li
                  key={e.name}
                  className={`flex items-start gap-3 border-b border-rule px-3 py-3 transition-opacity duration-500 ${on ? "opacity-100" : "opacity-25"}`}
                >
                  <span className={`mt-1 size-2 shrink-0 transition-colors ${on ? "bg-signal" : "bg-ink/30"}`} />
                  <span className="min-w-0">
                    <span className="block font-mono text-[12px] text-ink">{e.name}</span>
                    <span className="block truncate font-mono text-[11px] text-graphite">{e.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-1.5 px-3 py-3">
            {dests.map((d) => (
              <span
                key={d}
                className={`label border px-2 py-1 !text-[10px] transition-colors duration-500 ${synced ? "border-ink bg-ink text-stone" : "border-rule text-graphite"}`}
              >
                {synced ? "↳ " : ""}
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </VisualFrame>
  );
}

/* ---------------------------------------------------------------
   03 Intelligence — attribution flow from channel to won revenue.
   Illustrative proportions only; no values are displayed.
---------------------------------------------------------------- */
const VOL = { leads: [120, 80, 50, 30], qualified: [46, 44, 20, 22], won: [14, 17, 6, 12] };
const X = { ch: 0, leads: 360, qual: 660, won: 990 };
const H = 360;
const BAR = 10;

function stack(values: number[], gap: number) {
  const total = values.reduce((a, b) => a + b, 0) + gap * (values.length - 1);
  let y = (H - total) / 2;
  return values.map((v) => {
    const s = { y0: y, y1: y + v };
    y += v + gap;
    return s;
  });
}

function band(x0: number, a: { y0: number; y1: number }, x1: number, b: { y0: number; y1: number }) {
  const m = (x0 + x1) / 2;
  return `M${x0} ${a.y0} C${m} ${a.y0} ${m} ${b.y0} ${x1} ${b.y0} L${x1} ${b.y1} C${m} ${b.y1} ${m} ${a.y1} ${x0} ${a.y1} Z`;
}

export function IntelligenceVisual({ layer }: { layer: Layer }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { rootMargin: "0px 0px -20% 0px" });
  const [hover, setHover] = useState<number | null>(null);
  const channels = layer.channels ?? [];
  const stages = layer.stages ?? [];

  const ch = stack(VOL.leads, 16);
  const leads = stack(VOL.leads, 3);
  const qual = stack(VOL.qualified, 3);
  const won = stack(VOL.won, 3);
  // qualified portion leaves from the top of each lead segment
  const leadsQ = leads.map((s, i) => ({ y0: s.y0, y1: s.y0 + VOL.qualified[i] }));
  const qualW = qual.map((s, i) => ({ y0: s.y0, y1: s.y0 + VOL.won[i] }));

  const tone = (i: number, strong: boolean) => {
    if (hover === null) return strong ? { fill: "var(--color-signal)", opacity: 0.85 } : { fill: "var(--color-ink)", opacity: 0.13 };
    return hover === i ? { fill: "var(--color-signal)", opacity: strong ? 0.95 : 0.55 } : { fill: "var(--color-ink)", opacity: 0.05 };
  };

  return (
    <VisualFrame title={layer.visualTitle} note={layer.visualNote}>
      <div ref={ref} className="grid grid-cols-[76px_1fr] gap-3 sm:mt-8 sm:grid-cols-[120px_1fr]">
        <ul className="relative h-[260px] sm:h-[360px]">
          {channels.map((c, i) => (
            <li
              key={c}
              className="absolute inset-x-0 -translate-y-1/2"
              style={{ top: `${((ch[i].y0 + ch[i].y1) / 2 / H) * 100}%` }}
            >
              <button
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-pressed={hover === i}
                className={`label w-full py-1 text-start transition-colors ${hover === null || hover === i ? "text-ink" : "text-graphite/60"}`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
        <div className="relative h-[260px] sm:h-[360px]">
          <svg
            viewBox={`0 0 1000 ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full transition-[clip-path] duration-[1800ms] ease-[var(--ease-in-out-quart)]"
            style={{ clipPath: inView ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
            aria-hidden="true"
          >
            {VOL.leads.map((_, i) => (
              <g key={i} className="transition-opacity">
                <path d={band(X.ch + BAR, ch[i], X.leads, leads[i])} {...tone(i, false)} />
                <path d={band(X.leads + BAR, leadsQ[i], X.qual, qual[i])} {...tone(i, false)} />
                <path d={band(X.qual + BAR, qualW[i], X.won, won[i])} {...tone(i, true)} />
                <rect x={X.ch} y={ch[i].y0} width={BAR} height={VOL.leads[i]} fill="var(--color-ink)" />
                <rect x={X.leads} y={leads[i].y0} width={BAR} height={VOL.leads[i]} fill="var(--color-ink)" />
                <rect x={X.qual} y={qual[i].y0} width={BAR} height={VOL.qualified[i]} fill="var(--color-ink)" />
                <rect x={X.won} y={won[i].y0} width={BAR} height={VOL.won[i]} fill="var(--color-ink)" />
              </g>
            ))}
          </svg>
          {stages.map((s, i) => (
            <span
              key={s}
              className="label absolute -top-1 hidden -translate-y-full text-graphite sm:block"
              style={i === stages.length - 1 ? { right: 0 } : { left: `${([X.leads, X.qual][i] / 1000) * 100}%` }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <p className="label mt-4 text-graphite sm:hidden" aria-hidden="true">
        {["Channel", ...stages].join(" → ")}
      </p>
    </VisualFrame>
  );
}
