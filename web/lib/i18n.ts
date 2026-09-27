import { en, type Dictionary } from "@/content/en";
import { ar } from "@/content/ar";

/**
 * Locale registry. Arabic is the default and is served at "/"; English lives at "/en".
 * Layout direction, lang attribute and type system follow the locale.
 * Components use logical properties (start/end, ps/pe) so they mirror in RTL,
 * and flow diagrams mirror so data always travels in reading direction.
 */
export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

const dictionaries: Record<Locale, Dictionary> = { ar, en };

export function pathOf(locale: Locale) {
  return locale === defaultLocale ? "/" : `/${locale}`;
}

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
