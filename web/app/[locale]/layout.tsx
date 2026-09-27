import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Archivo, Instrument_Sans, IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { dirOf, getDictionary, isLocale, locales, pathOf } from "@/lib/i18n";
import { site } from "@/lib/site";
import "../globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(site.url),
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      canonical: pathOf(locale),
      languages: { ar: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      type: "website",
      siteName: site.name,
      locale: locale === "ar" ? "ar_SA" : "en_US",
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#e7e6e1",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${archivo.variable} ${instrument.variable} ${plexMono.variable} ${plexArabic.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
