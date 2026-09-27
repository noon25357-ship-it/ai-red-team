"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/content/en";
import { useInView } from "@/lib/hooks";
import { site } from "@/lib/site";
import { Arrow } from "../ui/Logo";

type Field = "name" | "company" | "email" | "sector" | "need";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
  The page's real conversion point. No backend yet: a valid submission composes
  an email to site.contactEmail in the visitor's mail app, and keeps a fallback
  link on screen. Swap `send` for an API call when a CRM endpoint exists.
*/
export function Contact({ t }: { t: Dictionary["contact"] }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, { rootMargin: "0px 0px -15% 0px" });
  const f = t.form;
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [mailto, setMailto] = useState<string | null>(null);

  const send = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const v = (k: Field) => String(data.get(k) ?? "").trim();
    const next: Partial<Record<Field, string>> = {};
    (["name", "company", "email", "sector", "need"] as Field[]).forEach((k) => {
      if (!v(k)) next[k] = f.required;
    });
    if (v("email") && !EMAIL.test(v("email"))) next.email = f.invalidEmail;
    setErrors(next);
    if (Object.keys(next).length) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    const body = [
      `${f.name}: ${v("name")}`,
      `${f.company}: ${v("company")}`,
      `${f.email}: ${v("email")}`,
      `${f.sector}: ${v("sector")}`,
      "",
      `${f.need}`,
      v("need"),
    ].join("\n");
    const url = `mailto:${site.contactEmail}?subject=${encodeURIComponent(`${f.subject} — ${v("company")}`)}&body=${encodeURIComponent(body)}`;
    setMailto(url);
    window.location.href = url;
  };

  const field = (k: Field) => ({
    id: `contact-${k}`,
    name: k,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `contact-${k}-error` : undefined,
    onInput: () => errors[k] && setErrors((e) => ({ ...e, [k]: undefined })),
  });
  const error = (k: Field) =>
    errors[k] ? (
      <p id={`contact-${k}-error`} className="mt-2 text-[14px] text-signal">
        {errors[k]}
      </p>
    ) : null;

  return (
    <section
      ref={ref}
      id="contact"
      aria-labelledby="contact-title"
      data-theme="dark"
      className="bg-night text-stone"
    >
      <div className="shell grid gap-14 border-t border-rule-dark py-[clamp(80px,12vh,150px)] md:grid-cols-12 md:gap-6">
        <div className="md:col-span-5">
          <p className="label fade-up text-fog">{t.kicker}</p>
          <h2 id="contact-title" className="display-md fade-up mt-6 text-[clamp(36px,4.2vw,68px)]" style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
          <p className="fade-up mt-6 max-w-[42ch] text-[17px] leading-relaxed text-fog" style={{ ["--i" as string]: 2 }}>
            {t.body}
          </p>
          <div className="fade-up mt-12" style={{ ["--i" as string]: 3 }}>
            <p className="label text-stone">{t.stepsLabel}</p>
            <ol className="mt-4 border-t border-rule-dark">
              {t.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-4 border-b border-rule-dark py-3.5 text-[16px]">
                  <span className="label w-6 text-fog">{String(i + 1).padStart(2, "0")}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <form noValidate onSubmit={send} className="contact-form fade-up md:col-span-6 md:col-start-7" style={{ ["--i" as string]: 2 }}>
          <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="label text-fog">
                {f.name}
              </label>
              <input {...field("name")} type="text" autoComplete="name" required />
              {error("name")}
            </div>
            <div>
              <label htmlFor="contact-company" className="label text-fog">
                {f.company}
              </label>
              <input {...field("company")} type="text" autoComplete="organization" required />
              {error("company")}
            </div>
            <div>
              <label htmlFor="contact-email" className="label text-fog">
                {f.email}
              </label>
              <input {...field("email")} type="email" autoComplete="email" dir="ltr" required />
              {error("email")}
            </div>
            <div>
              <label htmlFor="contact-sector" className="label text-fog">
                {f.sector}
              </label>
              <select {...field("sector")} defaultValue="" required>
                <option value="" disabled>
                  {f.sectorPlaceholder}
                </option>
                {f.sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {error("sector")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-need" className="label text-fog">
                {f.need}
              </label>
              <textarea {...field("need")} rows={4} placeholder={f.needPlaceholder} required />
              {error("need")}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <button type="submit" className="btn btn-invert w-max">
              {f.submit}
              <Arrow />
            </button>
            {site.whatsapp && (
              <a href={`https://wa.me/${site.whatsapp}`} className="link-quiet w-max" target="_blank" rel="noopener noreferrer">
                {f.whatsapp}
              </a>
            )}
          </div>

          <div aria-live="polite" className="mt-6 min-h-[3em] text-[15px] text-fog">
            {mailto && (
              <p>
                {f.sent}{" "}
                <a id="contact-mailto" href={mailto} className="text-stone underline underline-offset-4">
                  {f.fallback}
                </a>
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
