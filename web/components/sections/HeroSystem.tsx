"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion, useVisibleLoop } from "@/lib/hooks";

type SystemNode = { id: string; label: string; status: string };
type Pt = { x: number; y: number; rx?: number };

/*
  The staircase: nodes step upward from left to right, so the system's
  own wiring draws a growth curve. Each signal is one visitor. Most leave
  the system along the way; a few reach "Sale". That attrition is the point.
*/
// rx = where the riser into this node sits (keeps the first riser clear of the CTAs).
const DESKTOP: Pt[] = [
  { x: 0.035, y: 0.915 },
  { x: 0.23, y: 0.915 },
  { x: 0.52, y: 0.72, rx: 0.465 },
  { x: 0.655, y: 0.72 },
  { x: 0.79, y: 0.47 },
  { x: 0.935, y: 0.2 },
];
// Tablet: same staircase, in its own band under the copy.
const TABLET: Pt[] = [
  { x: 0.03, y: 0.9 },
  { x: 0.17, y: 0.9 },
  { x: 0.37, y: 0.64 },
  { x: 0.54, y: 0.64 },
  { x: 0.76, y: 0.37 },
  { x: 0.92, y: 0.1 },
];
const MOBILE: Pt[] = [
  { x: 0.05, y: 0.93 },
  { x: 0.5, y: 0.765 },
  { x: 0.05, y: 0.6 },
  { x: 0.5, y: 0.435 },
  { x: 0.05, y: 0.27 },
  { x: 0.5, y: 0.08 },
];
// Probability that a visitor is still in the system when it reaches node k.
const LABEL_CLEAR = { ltr: 124, rtl: 178 };
const SURVIVAL = [1, 1, 0.8, 0.5, 0.36, 0.2];
const HOLD = [900, 900, 1100, 1300, 1500, 2600];

function buildRoute(nodes: Pt[], mobile: boolean, w: number, h: number, rtl: boolean, clear: number) {
  const pts: Pt[] = [];
  const at: number[] = [];
  const first = nodes[0];
  pts.push(mobile ? { x: first.x, y: h } : { x: 0, y: first.y });
  nodes.forEach((n, i) => {
    if (i > 0) {
      const a = nodes[i - 1];
      if (a.y === n.y) {
        // straight run
      } else if (mobile) {
        const midY = (a.y + n.y) / 2;
        pts.push({ x: a.x, y: midY }, { x: n.x, y: midY });
      } else {
        // a riser never cuts through the label that sits above the previous node
        const midX = Math.min(n.x - 16, Math.max(n.rx ?? (a.x + n.x) / 2, a.x + clear));
        pts.push({ x: midX, y: a.y }, { x: midX, y: n.y });
      }
    }
    pts.push(n);
    at.push(pts.length - 1);
  });
  if (!mobile) pts.push({ x: w, y: nodes[nodes.length - 1].y });
  // RTL: the whole system mirrors, so signals enter from the right and climb to the left.
  if (rtl) pts.forEach((p) => (p.x = w - p.x));
  // cumulative lengths
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const nodeDist = at.map((i) => cum[i]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return { pts, at, cum, nodeDist, d, total: cum[cum.length - 1] };
}

function pointAt(route: ReturnType<typeof buildRoute>, dist: number): Pt {
  const { pts, cum } = route;
  if (dist <= 0) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] >= dist) {
      const t = (dist - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
  }
  return pts[pts.length - 1];
}

type Particle = { d: number; end: number; lastNode: number; reached: number; fade: number; alive: boolean };
const POOL = 22;

export function HeroSystem({ nodes, label, note, a11y }: { nodes: SystemNode[]; label: string; note: string; a11y: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const reduced = useReducedMotion();
  const dots = useRef<(SVGGElement | null)[]>([]);
  const nodeEls = useRef<(HTMLDivElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const particles = useRef<Particle[]>([]);
  const spawnClock = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (s && Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mobile = !!size && size.w < 600;
  const [rtl, setRtl] = useState(false);
  useEffect(() => setRtl(document.documentElement.dir === "rtl"), []);
  const route = useMemo(() => {
    if (!size) return null;
    const frac = mobile ? MOBILE : size.h > 600 ? DESKTOP : TABLET;
    const pts = frac.map((p) => ({
      x: Math.round(p.x * size.w),
      y: Math.round(p.y * size.h),
      rx: p.rx === undefined ? undefined : Math.round(p.rx * size.w),
    }));
    return buildRoute(pts, mobile, size.w, size.h, rtl, rtl ? LABEL_CLEAR.rtl : LABEL_CLEAR.ltr);
  }, [size, mobile, rtl]);

  // Wait for the path to draw before the first signal enters.
  useEffect(() => {
    const t = window.setTimeout(() => (started.current = true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    particles.current = [];
    dots.current.forEach((g) => g?.setAttribute("opacity", "0"));
  }, [route]);

  const pulse = useCallback((k: number) => {
    const el = nodeEls.current[k];
    if (!el) return;
    el.dataset.active = "true";
    window.clearTimeout(timers.current[k]);
    timers.current[k] = window.setTimeout(() => (el.dataset.active = "false"), HOLD[k]);
  }, []);

  const tick = useCallback(
    (dt: number) => {
      if (!route || !started.current) return;
      const speed = route.total / (mobile ? 9000 : 10500); // px per ms
      spawnClock.current -= dt;
      if (spawnClock.current <= 0 && particles.current.filter((p) => p.alive).length < POOL) {
        spawnClock.current = 820 + Math.random() * 520;
        const r = Math.random();
        let last = 0;
        SURVIVAL.forEach((s, k) => {
          if (r < s) last = k;
        });
        const slot = particles.current.findIndex((p) => !p.alive);
        const p: Particle = { d: 0, end: route.nodeDist[last], lastNode: last, reached: -1, fade: 1, alive: true };
        if (slot === -1) particles.current.push(p);
        else particles.current[slot] = p;
      }
      particles.current.forEach((p, i) => {
        const g = dots.current[i];
        if (!g || !p.alive) return;
        if (p.d < p.end) {
          p.d = Math.min(p.end, p.d + speed * dt);
          while (p.reached + 1 <= p.lastNode && p.d >= route.nodeDist[p.reached + 1]) {
            p.reached += 1;
            pulse(p.reached);
          }
        } else {
          p.fade -= dt / (p.lastNode === nodes.length - 1 ? 900 : 650);
          if (p.fade <= 0) {
            p.alive = false;
            g.setAttribute("opacity", "0");
            return;
          }
        }
        const head = pointAt(route, p.d);
        let tail = "";
        for (let k = 36; k >= 0; k -= 6) {
          const q = pointAt(route, p.d - k);
          tail += `${k === 36 ? "M" : "L"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        }
        const drop = p.d >= p.end && p.lastNode < nodes.length - 1 ? (1 - p.fade) * 14 : 0;
        g.setAttribute("opacity", String(p.fade));
        g.setAttribute("transform", `translate(0 ${drop.toFixed(1)})`);
        const [tailEl, dot] = g.children as unknown as [SVGPathElement, SVGCircleElement];
        tailEl.setAttribute("d", tail);
        dot.setAttribute("cx", head.x.toFixed(1));
        dot.setAttribute("cy", head.y.toFixed(1));
      });
    },
    [route, mobile, nodes.length, pulse],
  );

  useVisibleLoop(wrap, tick, !reduced && !!route);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  return (
    <div ref={wrap} className="absolute inset-0" role="img" aria-label={a11y}>
      {route && size && (
        <>
          <svg width={size.w} height={size.h} className="absolute inset-0 overflow-visible" aria-hidden="true">
            <path d={route.d} className="hero-route" pathLength={1} fill="none" />
            <path d={route.d} className="hero-route-tick" fill="none" />
            <g>
              {Array.from({ length: POOL }).map((_, i) => (
                <g key={i} ref={(el) => void (dots.current[i] = el)} opacity={0}>
                  <path fill="none" stroke="var(--color-signal)" strokeWidth={2} strokeOpacity={0.45} />
                  <circle r={3.5} fill="var(--color-signal)" />
                </g>
              ))}
            </g>
          </svg>
          {nodes.map((n, i) => {
            const p = route.pts[route.at[i]];
            // flip labels to the left when the status line would run off the edge
            const flip = !mobile && (rtl ? p.x < 290 : p.x > size.w - 260);
            return (
              <div
                key={n.id}
                ref={(el) => void (nodeEls.current[i] = el)}
                data-active={reduced ? "true" : "false"}
                className="hero-node absolute"
                style={{ left: p.x, top: p.y, ["--i" as string]: i }}
                aria-hidden="true"
              >
                <span className="hero-node-mark" />
                <span className={`hero-node-label ${flip ? "is-flip" : ""}`}>
                  <span className="text-graphite">0{i + 1}</span> {n.label}
                </span>
                <span className={`hero-node-status ${flip ? "is-flip" : ""}`}>{n.status}</span>
              </div>
            );
          })}
        </>
      )}
      <p className="hero-legend absolute bottom-[clamp(20px,4vh,44px)] end-0 hidden max-w-[300px] lg:block">
        <span className="label flex items-center gap-2 text-ink">
          <span className="relative inline-block size-2 bg-signal">
            <span className="absolute inset-0 animate-ping bg-signal opacity-60 motion-reduce:hidden" />
          </span>
          {label}
        </span>
        <span className="mt-2 block text-[13px] leading-snug text-graphite">{note}</span>
      </p>
    </div>
  );
}
