"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/content/en";
import { Logo, Arrow } from "./ui/Logo";

export function Nav({ t }: { t: Dictionary["nav"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      // Adopt the theme of whichever section sits under the nav bar.
      const probe = 32;
      let isDark = false;
      document.querySelectorAll<HTMLElement>("[data-theme='dark']").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) isDark = true;
      });
      setDark(isDark);
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const theme = dark && !open ? "dark" : "light";

  return (
    <header
      data-scrolled={scrolled}
      data-nav-theme={theme}
      className="group fixed inset-x-0 top-0 z-50 transition-colors duration-500
        data-[nav-theme=dark]:text-stone data-[nav-theme=light]:text-ink"
    >
      <div
        className="absolute inset-0 -z-10 border-b transition-[background-color,border-color,opacity] duration-500
          border-transparent opacity-0 group-data-[scrolled=true]:opacity-100
          group-data-[nav-theme=light]:bg-stone/92 group-data-[nav-theme=dark]:bg-night/92
          group-data-[scrolled=true]:group-data-[nav-theme=light]:border-rule
          group-data-[scrolled=true]:group-data-[nav-theme=dark]:border-rule-dark
          backdrop-blur-[6px]"
      />
      <nav aria-label="Primary" className="shell flex h-[var(--nav-h)] items-center justify-between gap-6">
        <a href="#top" aria-label={t.home} className="shrink-0">
          <Logo />
        </a>
        <ul className="hidden items-center gap-9 lg:flex">
          {t.links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="relative text-[14px] font-medium opacity-80 transition-opacity hover:opacity-100">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href={t.switchHref}
            hrefLang={t.switchLang}
            lang={t.switchLang}
            aria-label={t.switchA11y}
            className={`inline-flex h-10 items-center px-2 text-[13px] font-medium opacity-80 transition-opacity hover:opacity-100 ${
              t.switchLang === "ar" ? "font-arabic" : "font-mono tracking-[0.08em]"
            }`}
          >
            {t.switchLabel}
          </a>
          <a
            href="#contact"
            className="btn hidden !min-h-[40px] !px-4 text-[14px] sm:inline-flex"
          >
            {t.cta}
            <Arrow />
          </a>
          <button
            ref={menuBtn}
            type="button"
            className="label inline-flex h-10 items-center gap-2 px-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-2.5 w-5" aria-hidden="true">
              <span
                className={`absolute inset-x-0 top-0 h-[1.5px] bg-current transition-transform duration-300 ${open ? "translate-y-[4.5px] rotate-45" : ""}`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-[1.5px] bg-current transition-transform duration-300 ${open ? "-translate-y-[4.5px] -rotate-45" : ""}`}
              />
            </span>
            {open ? t.close : t.menu}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[var(--nav-h)] bg-stone text-ink lg:hidden"
      >
        <div className="shell flex h-full flex-col justify-between pb-10 pt-8">
          <ul className="flex flex-col">
            {t.links.map((l, i) => (
              <li key={l.href} className="border-b border-rule">
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="display-md flex items-baseline justify-between py-5 text-[34px]"
                >
                  {l.label}
                  <span className="label text-graphite">0{i + 1}</span>
                </a>
              </li>
            ))}
          </ul>
          <a href="#contact" onClick={() => setOpen(false)} className="btn justify-between">
            {t.cta}
            <Arrow />
          </a>
        </div>
      </div>
    </header>
  );
}
