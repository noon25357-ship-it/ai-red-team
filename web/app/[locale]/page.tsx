import { getDictionary, isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Build } from "@/components/sections/Build";
import { Engine } from "@/components/sections/Engine";
import { Lab } from "@/components/sections/Lab";
import { AILayer } from "@/components/sections/AILayer";
import { Method } from "@/components/sections/Method";
import { Offers } from "@/components/sections/Offers";
import { Proof } from "@/components/sections/Proof";
import { Final } from "@/components/sections/Final";
import { Footer } from "@/components/Footer";
import { site } from "@/lib/site";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    description: t.meta.description,
    address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "SA" },
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav t={t.nav} />
      <main id="main">
        <Hero t={t.hero} />
        <Problem t={t.problem} />
        <Build t={t.build} />
        <Engine t={t.engine} />
        <Lab t={t.lab} />
        <AILayer t={t.ai} />
        <Method t={t.method} />
        <Offers t={t.offers} />
        <Proof t={t.proof} />
        <Final t={t.final} />
      </main>
      <Footer t={t.footer} nav={t.nav} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
