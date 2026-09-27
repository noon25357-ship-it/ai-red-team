"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content/en";
import { useStickyProgress } from "@/lib/hooks";
import { Arrow, SignalDot } from "../ui/Logo";
import { mailto } from "@/lib/contact";

// Where each part of the system is scattered at the start (in % of the stage).
const SCATTER = [
  [7, 16], [31, 9], [55, 20], [80, 11], [93, 34], [12, 44],
  [41, 38], [69, 47], [90, 64], [24, 70], [57, 73], [82, 88],
];

// The staircase from the logo mark, in a 0..1 box.
const STAIR = [
  [0, 1], [0.34, 1], [0.34, 0.5], [0.67, 0.5], [0.67, 0], [1, 0],
];

function alongStair(n: number) {
  const seg = STAIR.slice(1).map((p, i) => Math.hypot(p[0] - STAIR[i][0], p[1] - STAIR[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  return Array.from({ length: n }, (_, k) => {
    let d = (k / (n - 1)) * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] + 1e-6) {
        const t = d / seg[i];
        return [STAIR[i][0] + (STAIR[i + 1][0] - STAIR[i][0]) * t, STAIR[i][1] + (STAIR[i + 1][1] - STAIR[i][1]) * t];
      }
      d -= seg[i];
    }
    return STAIR[STAIR.length - 1];
  });
}

export function Final({ t }: { t: Dictionary["final"] }) {
  const ref = useRef<HTMLElement>(null);
  useStickyProgress(ref);
  const targets = alongStair(t.nodes.length);

  return (
    <section ref={ref} id="final" aria-labelledby="final-title" data-theme="dark" className="final relative h-[240vh] bg-night text-stone">
      <div id="contact" className="pointer-events-none absolute inset-x-0 bottom-0 h-[100svh]" aria-hidden="true" />
      <div className="final-stage sticky top-0 h-[100svh] overflow-hidden">
        <div role="img" aria-label={t.a11y} className="absolute inset-0">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="final-line absolute inset-0 h-full w-full" aria-hidden="true">
            <polyline
              points={STAIR.map(([x, y]) => `${x * 100} ${y * 100}`).join(" ")}
              fill="none"
              stroke="var(--color-stone)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className="final-stair"
            />
          </svg>
          {t.nodes.map((name, i) => {
            const [bx, by] = targets[i];
            return (
              <span
                key={name}
                className="final-node absolute"
                style={{
                  ["--bx" as string]: bx,
                  ["--by" as string]: by,
                  ["--sx" as string]: SCATTER[i][0],
                  ["--sy" as string]: SCATTER[i][1],
                  ["--k" as string]: i,
                }}
                aria-hidden="true"
              >
                <span className="final-dot" />
                <span className="final-label label">{name}</span>
              </span>
            );
          })}
          <span className="final-signal absolute" aria-hidden="true" />
        </div>

        <div className="shell relative flex h-full flex-col justify-end pb-[clamp(40px,9vh,110px)]">
          <h2 id="final-title" className="final-copy">
            <span className="final-l1 block max-w-[24ch] text-[clamp(18px,2vw,30px)] font-medium leading-tight tracking-[-0.015em] text-fog">{t.lines[0]}</span>
            <span className="final-l2 display mt-4 block text-[clamp(34px,7vw,124px)]">{t.lines[1]}</span>
            <span className="final-l3 display block text-[clamp(34px,7vw,124px)]">
              {t.closer.replace(/\.$/, "")}
              <SignalDot />
            </span>
          </h2>
          <div className="final-cta mt-9 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <a href={mailto(t.mailSubject)} className="btn btn-invert w-max">
              {t.cta}
              <Arrow />
            </a>
            <p className="max-w-[40ch] text-[15px] leading-relaxed text-fog">{t.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
