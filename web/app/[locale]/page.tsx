import { getDictionary, isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Build } from "@/components/sections/Build";
import { Engine } from "@/components/sections/Engine";
import { Lab } from "@/components/sections/Lab";
import { Services } from "@/components/sections/Services";
import { OneTeam } from "@/components/sections/OneTeam";
import { Contact } from "@/components/sections/Contact";
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
    inLanguage: locale,
    address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "SA" },
  };

  return (
    <>
      <a href="#main" className="skip-link">
        {t.nav.skip}
      </a>
      <Nav t={t.nav} />
      <main id="main">
        <Hero t={t.hero} />
        <Problem t={t.problem} />
        <Build t={t.build} />
        <Engine t={t.engine} />
        <Services t={t.services} />
        <OneTeam t={t.oneTeam} />
        <Lab t={t.lab} />
        <AILayer t={t.ai} />
        <Method t={t.method} />
        <Offers t={t.offers} />
        <Proof t={t.proof} />
        <Final t={t.final} />
        <Contact t={t.contact} />
      </main>
      <Footer t={t.footer} nav={t.nav} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
