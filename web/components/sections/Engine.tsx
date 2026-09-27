"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/content/en";
import { useInView, useReducedMotion } from "@/lib/hooks";

export function Engine({ t }: { t: Dictionary["engine"] }) {
  const section = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const inView = useInView(section, { once: false, rootMargin: "-20% 0px -20% 0px" });
  const reduced = useReducedMotion();
  useInView(head);

  const n = t.stages.length;
  const stage = t.stages[active];

  // The system walks itself through the stages until someone takes over.
  useEffect(() => {
    if (!inView || pinned || hovering || reduced) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % n), 3400);
    return () => window.clearInterval(id);
  }, [inView, pinned, hovering, reduced, n]);

  // Keep the active stage visible in the mobile strip without moving the page.
  useEffect(() => {
    const s = strip.current;
    const tab = tabs.current[active];
    if (!s || !tab || s.scrollWidth <= s.clientWidth) return;
    // works in both directions (scrollLeft is negative in RTL)
    const left = s.scrollLeft + (tab.getBoundingClientRect().left - s.getBoundingClientRect().left) - s.clientWidth / 2 + tab.clientWidth / 2;
    s.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  const select = (i: number, focus = false) => {
    setPinned(true);
    setActive(i);
    if (focus) tabs.current[i]?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const rtl = document.documentElement.dir === "rtl";
    const next = rtl ? "ArrowLeft" : "ArrowRight";
    const prev = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === next) select((active + 1) % n, true);
    else if (e.key === prev) select((active - 1 + n) % n, true);
    else if (e.key === "Home") select(0, true);
    else if (e.key === "End") select(n - 1, true);
    else return;
    e.preventDefault();
  };

  return (
    <section
      ref={section}
      id="system"
      aria-labelledby="engine-title"
      data-theme="dark"
      className="engine relative overflow-hidden bg-night py-[clamp(88px,14vh,180px)] text-stone"
    >
      <div className="shell">
        <div ref={head} className="grid gap-6 md:grid-cols-12">
          <p className="label fade-up text-fog md:col-span-3">{t.kicker}</p>
          <div className="md:col-span-9">
            <h2 id="engine-title" className="display-md fade-up max-w-[16ch] text-[clamp(38px,5vw,84px)]" style={{ ["--i" as string]: 1 }}>
              {t.title}
            </h2>
            <p className="fade-up mt-6 max-w-[48ch] text-[16px] leading-relaxed text-fog" style={{ ["--i" as string]: 2 }}>
              {t.intro}
            </p>
          </div>
        </div>

        {/* rail */}
        <div className="relative mt-[clamp(56px,9vh,110px)]">
          <div
            ref={strip}
            role="tablist"
            aria-label={t.title}
            onKeyDown={onKey}
            onMouseLeave={() => setHovering(false)}
            className="engine-strip relative -mx-[var(--gutter)] flex snap-x snap-mandatory overflow-x-auto px-[var(--gutter)] pb-2 lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, ["--n" as string]: n }}
          >
            <span className="engine-track pointer-events-none absolute start-0 top-[7px] h-px bg-rule-dark lg:end-0" aria-hidden="true">
              <span
                className="absolute inset-y-0 start-0 bg-stone/70 transition-[width] duration-700 ease-[var(--ease-out-expo)]"
                style={{ width: `${(active / (n - 1)) * 100}%` }}
              />
              {!reduced && (
                <span className="engine-flow" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </span>
            {t.stages.map((s, i) => {
              const on = i === active;
              const done = i < active;
              return (
                <button
                  key={s.id}
                  ref={(el) => void (tabs.current[i] = el)}
                  role="tab"
                  id={`engine-tab-${s.id}`}
                  aria-selected={on}
                  aria-controls="engine-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => select(i)}
                  onMouseEnter={() => {
                    setHovering(true);
                    setActive(i);
                  }}
                  className="group relative w-[42%] shrink-0 snap-start pe-4 text-start sm:w-[26%] lg:w-auto"
                >
                  <span
                    className={`relative z-10 block size-[15px] border-[1.5px] transition-all duration-300 ${
                      on ? "scale-110 border-signal bg-signal" : done ? "border-stone bg-stone" : "border-fog bg-night group-hover:border-stone"
                    }`}
                  />
                  <span className={`label mt-5 block transition-colors ${on ? "text-stone" : "text-fog"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className={`mt-1.5 block text-[15px] font-semibold leading-tight tracking-[-0.01em] transition-colors lg:text-[clamp(13px,1.05vw,16px)] ${
                      on ? "text-stone" : "text-fog group-hover:text-stone"
                    }`}
                  >
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* panel */}
          <div
            id="engine-panel"
            role="tabpanel"
            aria-labelledby={`engine-tab-${stage.id}`}
            className="mt-12 grid gap-8 border-t border-rule-dark pt-8 md:mt-16 md:grid-cols-12 md:gap-6"
          >
            <div key={stage.id} className="engine-swap md:col-span-4">
              <p className="label text-fog">
                {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </p>
              <p className="display mt-4 text-[clamp(32px,3.6vw,58px)] leading-[0.92]">{stage.name}</p>
            </div>
            <dl key={`${stage.id}-d`} className="engine-swap grid gap-8 sm:grid-cols-3 md:col-span-8 md:gap-6">
              <div>
                <dt className="label text-fog">{t.labels.inside}</dt>
                <dd className="mt-3 text-[16px] leading-relaxed">{stage.inside}</dd>
              </div>
              <div>
                <dt className="label text-fog">{t.labels.measure}</dt>
                <dd className="mt-3 text-[16px] leading-relaxed text-stone/85">{stage.measure}</dd>
              </div>
              <div>
                <dt className="label text-fog">{t.labels.output}</dt>
                <dd className="mt-3 flex items-start gap-3 text-[16px] leading-relaxed">
                  <span className="mt-[9px] inline-block size-2 shrink-0 bg-signal" aria-hidden="true" />
                  {stage.output}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
