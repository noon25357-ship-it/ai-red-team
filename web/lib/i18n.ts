import { en, type Dictionary } from "@/content/en";

/**
 * Locale registry. To launch Arabic:
 * 1. add content/ar.ts (`export const ar: Dictionary = { … }`)
 * 2. add "ar" to `locales` and `dictionaries`
 * Layout direction, lang attribute and fonts follow automatically.
 * Components use logical properties (start/end, ps/pe) so they mirror in RTL.
 */
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const dictionaries: Record<Locale, Dictionary> = { en };

const rtl = new Set<string>(["ar"]);

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function dirOf(locale: string): "ltr" | "rtl" {
  return rtl.has(locale) ? "rtl" : "ltr";
}
