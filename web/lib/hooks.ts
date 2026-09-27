"use client";

import { useEffect, useState, type RefObject } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Sets data-inview on the element once it enters the viewport. Returns the state too. */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { once = true, rootMargin = "0px 0px -12% 0px", threshold = 0 } = {},
) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const v = entry.isIntersecting;
        if (v || !once) {
          setInView(v);
          el.setAttribute("data-inview", String(v));
        }
        if (v && once) io.disconnect();
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, rootMargin, threshold]);
  return inView;
}

/**
 * Scroll progress through a tall "sticky" section, 0 → 1.
 * Writes `--p` on the element every frame (no React renders) and
 * calls onProgress so components can derive discrete states.
 */
export function useStickyProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onProgress?: (p: number) => void,
  mode: "sticky" | "through" = "sticky",
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let last = -1;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      let p: number;
      if (mode === "sticky") {
        const span = r.height - vh;
        p = span > 0 ? -r.top / span : r.top < 0 ? 1 : 0;
      } else {
        p = (vh - r.top) / (vh + r.height);
      }
      p = Math.min(1, Math.max(0, p));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      el.style.setProperty("--p", p.toFixed(4));
      onProgress?.(p);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, onProgress, mode]);
}

/** Runs a rAF loop only while the element is on screen. */
export function useVisibleLoop<T extends Element>(
  ref: RefObject<T | null>,
  tick: (dt: number, t: number) => void,
  enabled = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let frame = 0;
    let prev = 0;
    let visible = false;
    const loop = (t: number) => {
      const dt = prev ? Math.min(64, t - prev) : 16;
      prev = t;
      tick(dt, t);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (frame) return;
      prev = 0;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    });
    const onVis = () => (document.hidden || !visible ? stop() : start());
    io.observe(el);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref, tick, enabled]);
}
