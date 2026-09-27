"use client";

import { useId, useRef } from "react";
import type { Dictionary } from "@/content/en";
import { useInView, useStickyProgress } from "@/lib/hooks";

type T = Dictionary["lab"];

/* Canvas is designed at 1328 × 900; everything below is in those units. */
const CW = 1328;
const CH = 900;
const PRODUCT = { x: 544, y: 170, w: 240, h: 320 };
const FRAMES: Record<string, { x: number; y: number; w: number; h: number }> = {
  ugc: { x: 0, y: 40, w: 180, h: 320 },
  product: { x: 236, y: 118, w: 236, h: 236 },
  motion: { x: 850, y: 16, w: 372, h: 209 },
  voice: { x: 902, y: 300, w: 344, h: 150 },
  short: { x: 1040, y: 520, w: 180, h: 320 },
  static: { x: 56, y: 480, w: 236, h: 295 },
  landing: { x: 376, y: 560, w: 560, h: 320 },
};

const cq = (v: number) => `${((v / CW) * 100).toFixed(3)}cqw`;

export function Bottle({ className = "", glass = "#7a4119", cap = "#cdbfa6" }: { className?: string; glass?: string; cap?: string }) {
  const id = "b" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox="0 0 100 160" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={glass} stopOpacity="0.72" />
          <stop offset="1" stopColor={glass} />
        </linearGradient>
      </defs>
      <rect x="36" y="2" width="28" height="26" fill={cap} />
      <rect x="36" y="2" width="28" height="4" fill="#121413" opacity=".18" />
      <rect x="43" y="28" width="14" height="10" fill="#121413" opacity=".85" />
      <rect x="12" y="38" width="76" height="118" rx="7" fill={`url(#${id})`} stroke="#121413" strokeOpacity=".5" strokeWidth="1" />
      <rect x="18" y="44" width="5" height="104" rx="2" fill="#fff" opacity=".22" />
      <rect x="29" y="86" width="42" height="34" fill="#f2f1ed" />
      <text x="50" y="101" textAnchor="middle" fontSize="7" fontWeight="700" fill="#121413" style={{ fontFamily: "var(--font-display)" }}>
        OUD
      </text>
      <text x="50" y="116" textAnchor="middle" fontSize="6" fill="#121413" style={{ fontFamily: "var(--font-mono)" }}>
        Nº 7
      </text>
      <rect x="40" y="105" width="20" height="0.8" fill="#121413" opacity=".45" />
    </svg>
  );
}

/** A line in the page's other language (Arabic on the English page, English on the Arabic one). */
function AltLang({ t, className = "", children }: { t: T; className?: string; children: React.ReactNode }) {
  const ar = t.altLang === "ar";
  return (
    <p className={`${ar ? "font-arabic" : "font-sans"} ${className}`} lang={t.altLang} dir={ar ? "rtl" : "ltr"}>
      {children}
    </p>
  );
}

function FrameLabel({ label, format }: { label: string; format: string }) {
  return (
    <span className="label mb-1.5 flex items-center justify-between gap-2 text-[10px] text-graphite">
      <span className="text-ink">{label}</span>
      <span>{format}</span>
    </span>
  );
}

function Segments({ n = 3, on = 1, dark = false }: { n?: number; on?: number; dark?: boolean }) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className={`h-[2px] flex-1 ${i < on ? (dark ? "bg-stone" : "bg-ink") : dark ? "bg-stone/30" : "bg-ink/20"}`} />
      ))}
    </span>
  );
}

function Art({ id, t }: { id: string; t: T }) {
  const c = t.copy;
  switch (id) {
    case "ugc":
      return (
        <div className="relative flex h-full flex-col justify-between overflow-hidden bg-sand p-3">
          <Segments n={4} on={2} />
          <Bottle className="absolute left-1/2 top-[22%] w-[46%] -translate-x-1/2 -rotate-[9deg] drop-shadow-[0_18px_18px_rgba(18,20,19,.28)]" />
          <p className="relative bg-ink px-2 py-1.5 text-[11px] font-semibold leading-snug text-stone">{c.ugcCaption}</p>
        </div>
      );
    case "product":
      return (
        <div className="relative flex h-full flex-col justify-between overflow-hidden bg-ink p-4 text-stone">
          <div>
            <p className="display-md text-[20px] leading-[0.98]">{c.productLine}</p>
            <AltLang t={t} className="mt-2 text-[14px] text-stone/70">
              {c.productArabic}
            </AltLang>
          </div>
          <Bottle className="absolute bottom-[-14%] right-[8%] w-[34%]" />
        </div>
      );
    case "motion":
      return (
        <div className="relative flex h-full flex-col justify-between overflow-hidden bg-palm p-3 text-stone">
          <div className="flex flex-1 items-center gap-4">
            <Bottle className="lab-float h-[88%] max-w-[28%]" />
            <p className="display-md text-[18px] leading-none">{t.product.name}</p>
          </div>
          <div className="relative border-t border-stone/25 pt-2">
            <div className="flex justify-between">
              {c.motionKeys.map((k) => (
                <span key={k} className="label text-[9px] opacity-80">
                  ◆ {k}
                </span>
              ))}
            </div>
            <span className="lab-playhead absolute -top-1 bottom-0 w-px bg-signal" />
          </div>
        </div>
      );
    case "voice":
      return (
        <div className="flex h-full flex-col justify-between border border-ink/80 bg-paper p-3">
          <div className="flex items-center justify-between">
            <span className="label text-[10px] text-ink" dir="ltr">
              {c.voiceLang}
            </span>
            <span className="label text-[10px] text-graphite">00:07</span>
          </div>
          <div className="flex h-9 items-center gap-[3px]" aria-hidden="true">
            {Array.from({ length: 46 }).map((_, i) => (
              <span
                key={i}
                className="lab-wave w-[3px] flex-1 bg-ink"
                style={{ height: `${18 + Math.abs(Math.sin(i * 1.7) * 62) + (i % 5) * 4}%`, animationDelay: `${(i % 9) * -0.13}s` }}
              />
            ))}
          </div>
          <div>
            <p className="font-arabic text-[14px] leading-snug" lang="ar" dir="rtl">
              {c.voiceScript}
            </p>
            <p className="text-[12px] text-graphite">{c.voiceScriptEn}</p>
          </div>
        </div>
      );
    case "short":
      return (
        <div className="flex h-full flex-col overflow-hidden bg-stone p-3 outline outline-1 -outline-offset-1 outline-ink/70">
          <Segments n={3} on={1} />
          <p className="display-md mt-4 text-[17px] leading-[1]">{c.shortTitle}</p>
          <ol className="mt-auto space-y-1.5">
            {c.shortItems.map((w, i) => (
              <li key={w} className="flex items-center gap-2 border-t border-ink/20 pt-1.5 text-[11px] font-medium">
                <span className="font-mono text-graphite">{i + 1}</span>
                {w}
              </li>
            ))}
          </ol>
        </div>
      );
    case "static":
      return (
        <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#d8cdb8] p-4">
          <p className="display-md max-w-[8ch] text-[22px] leading-[0.95]">{c.productLine}</p>
          <Bottle className="absolute bottom-[12%] right-[10%] w-[36%] drop-shadow-[0_18px_18px_rgba(18,20,19,.25)]" glass="#5a2e12" />
          <span className="relative w-max bg-ink px-3 py-1.5 text-[11px] font-semibold text-stone">{c.staticCta}</span>
        </div>
      );
    case "landing":
      return (
        <div className="flex h-full flex-col border border-ink/80 bg-paper">
          <div className="flex items-center justify-between border-b border-rule px-3 py-1.5">
            <span className="display text-[10px]">Oud Nº 7</span>
            <span className="flex gap-3 text-[10px] text-graphite">
              {c.landingNav.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </div>
          <div className="grid flex-1 grid-cols-2">
            <div className="flex flex-col justify-center gap-3 p-5">
              <p className="display text-[26px] leading-[0.9]">{c.landingTitle}</p>
              <span className="w-max bg-ink px-3 py-1.5 text-[11px] font-semibold text-stone">{c.landingCta}</span>
            </div>
            <div className="relative overflow-hidden bg-palm">
              <Bottle className="absolute bottom-[-6%] left-1/2 w-[40%] -translate-x-1/2" />
            </div>
          </div>
        </div>
      );
  }
  return null;
}

export function Lab({ t }: { t: T }) {
  const head = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  useInView(head);
  useInView(canvas, { rootMargin: "0px 0px -10% 0px" });
  useStickyProgress(canvas, undefined, "through");

  const pc = { x: PRODUCT.x + PRODUCT.w / 2, y: PRODUCT.y + PRODUCT.h / 2 };

  return (
    <section id="lab" aria-labelledby="lab-title" className="bg-stone py-[clamp(88px,14vh,180px)]">
      <div className="shell">
        <div ref={head} className="grid gap-6 md:grid-cols-12">
          <p className="label fade-up text-graphite md:col-span-3">{t.kicker}</p>
          <h2 id="lab-title" className="display fade-up text-[clamp(36px,4.6vw,84px)] md:col-span-9" style={{ ["--i" as string]: 1 }}>
            {t.title.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </h2>
          <p className="fade-up max-w-[52ch] text-[16px] leading-relaxed text-graphite md:col-span-5 md:col-start-4" style={{ ["--i" as string]: 2 }}>
            {t.intro}
          </p>
        </div>

        {/* Desktop: artboard canvas. Formats spread out from the product as you scroll. */}
        <div
          ref={canvas}
          className="lab-canvas relative mt-[clamp(56px,9vh,110px)] hidden aspect-[1328/900] md:block"
          role="group"
          aria-label={`${t.title.join(" ")}: ${t.frames.map((f) => `${f.label} (${f.format})`).join(", ")}`}
        >
          <svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" className="lab-lines absolute inset-0 h-full w-full" aria-hidden="true">
            {t.frames.map((f) => {
              const r = FRAMES[f.id];
              return (
                <line
                  key={f.id}
                  x1={pc.x}
                  y1={pc.y}
                  x2={r.x + r.w / 2}
                  y2={r.y + r.h / 2}
                  stroke="var(--color-ink)"
                  strokeOpacity=".28"
                  strokeDasharray="3 5"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {t.frames.map((f, i) => {
            const r = FRAMES[f.id];
            const dx = pc.x - (r.x + r.w / 2);
            const dy = pc.y - (r.y + r.h / 2);
            return (
              <div
                key={f.id}
                className="lab-frame absolute"
                style={{
                  left: cq(r.x),
                  top: cq(r.y),
                  width: cq(r.w),
                  ["--dx" as string]: cq(dx),
                  ["--dy" as string]: cq(dy),
                  ["--k" as string]: i,
                }}
                aria-hidden="true"
              >
                <FrameLabel label={f.label} format={f.format} />
                <div style={{ height: cq(r.h) }} className="lab-art">
                  <Art id={f.id} t={t} />
                </div>
              </div>
            );
          })}

          <div
            className="absolute z-10 flex flex-col"
            style={{ left: cq(PRODUCT.x), top: cq(PRODUCT.y), width: cq(PRODUCT.w) }}
          >
            <span className="label mb-1.5 flex justify-between text-[10px] text-graphite">
              <span className="text-ink">{t.brief}</span>
              <span>01 / 01</span>
            </span>
            <div className="relative flex flex-col justify-between bg-paper p-4 shadow-[0_30px_60px_-30px_rgba(18,20,19,.45)] outline outline-1 -outline-offset-1 outline-ink" style={{ height: cq(PRODUCT.h) }}>
              <Bottle className="mx-auto h-[70%] w-auto" />
              <div className="flex items-end justify-between">
                <div>
                  <p className="display text-[15px]">{t.product.name}</p>
                  <p className="text-[12px] text-graphite">{t.product.detail}</p>
                </div>
                <AltLang t={t} className="text-[15px]">
                  {t.product.arabic}
                </AltLang>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: the same system as a contact sheet */}
        <div className="mt-14 md:hidden">
          <div className="border border-ink bg-paper p-4">
            <span className="label flex justify-between text-[10px] text-graphite">
              <span className="text-ink">{t.brief}</span>
              <span>{t.product.detail}</span>
            </span>
            <Bottle className="mx-auto my-4 h-44 w-auto" />
            <p className="display text-[18px]">{t.product.name}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6" aria-label={t.frames.map((f) => f.label).join(", ")}>
            {t.frames.map((f) => {
              const r = FRAMES[f.id];
              const wide = f.id === "landing" || f.id === "motion" || f.id === "voice";
              return (
                <div key={f.id} className={wide ? "col-span-2" : ""} aria-hidden="true">
                  <FrameLabel label={f.label} format={f.format} />
                  <div style={{ aspectRatio: `${r.w} / ${r.h}` }}>
                    <Art id={f.id} t={t} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
