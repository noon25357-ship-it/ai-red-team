"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content/en";
import { useInView } from "@/lib/hooks";
import { AcquisitionVisual, ConversionVisual, IntelligenceVisual } from "./BuildVisuals";

type Layer = Dictionary["build"]["layers"][number];

function LayerBlock({ layer, variant, ui }: { layer: Layer; variant: 0 | 1 | 2; ui: Dictionary["build"]["ui"] }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, { rootMargin: "0px 0px -20% 0px" });

  const split = variant === 2;
  const text = (
    <div className={split ? "grid gap-x-6 md:grid-cols-12" : "flex flex-col"}>
      <div className={split ? "md:col-span-5" : ""}>
      <p className="display-md fade-up text-[clamp(24px,2.3vw,34px)]">{layer.line}</p>
      <p className="fade-up mt-5 max-w-[46ch] text-[16px] leading-relaxed text-graphite" style={{ ["--i" as string]: 1 }}>
        {layer.body}
      </p>
      </div>
      <ul
        className={`fade-up mt-8 grid grid-cols-2 self-start border-t border-rule ${split ? "md:col-span-6 md:col-start-7 md:mt-0" : ""}`}
        style={{ ["--i" as string]: 2 }}
      >
        {layer.items.map((item) => (
          <li key={item} className="border-b border-rule py-3 text-[14px] font-medium odd:pe-4">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );

  const visual =
    variant === 0 ? (
      <AcquisitionVisual layer={layer} ui={ui} />
    ) : variant === 1 ? (
      <ConversionVisual layer={layer} ui={ui} />
    ) : (
      <IntelligenceVisual layer={layer} ui={ui} />
    );

  return (
    <article
      ref={ref}
      id={`build-${layer.id}`}
      aria-labelledby={`layer-${layer.id}`}
      className="border-t border-ink pt-6 md:pt-8"
    >
      <header className={`flex flex-col items-start gap-3 md:flex-row md:gap-5 ${variant === 1 ? "md:flex-row-reverse md:text-end" : ""}`}>
        <span className="label text-graphite md:mt-[0.9em]">{layer.index}</span>
        <h3 id={`layer-${layer.id}`} className="display build-name">
          <span className="reveal-line">
            <span>{layer.name}</span>
          </span>
        </h3>
      </header>

      {variant === 2 ? (
        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-12">{text}</div>
          <div className="md:col-span-12 md:mt-6">{visual}</div>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 md:mt-14 md:grid-cols-12 md:gap-6">
          <div className={variant === 1 ? "md:order-2 md:col-span-4 md:col-start-9" : "md:col-span-4"}>{text}</div>
          <div className={variant === 1 ? "md:order-1 md:col-span-7" : "md:col-span-7 md:col-start-6"}>{visual}</div>
        </div>
      )}
    </article>
  );
}

export function Build({ t }: { t: Dictionary["build"] }) {
  const head = useRef<HTMLDivElement>(null);
  useInView(head);
  return (
    <section id="build" aria-labelledby="build-title" className="bg-stone py-[clamp(88px,14vh,180px)]">
      <div className="shell">
        <div ref={head} className="grid gap-6 md:grid-cols-12">
          <p className="label fade-up text-graphite md:col-span-3">{t.kicker}</p>
          <h2 id="build-title" className="display-md fade-up text-[clamp(38px,5vw,84px)] md:col-span-6" style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
          <p className="fade-up max-w-[40ch] self-end text-[16px] leading-relaxed text-graphite md:col-span-3" style={{ ["--i" as string]: 2 }}>
            {t.intro}
          </p>
        </div>
        <div className="mt-[clamp(64px,10vh,120px)] flex flex-col gap-[clamp(96px,16vh,200px)]">
          {t.layers.map((layer, i) => (
            <LayerBlock key={layer.id} layer={layer} variant={i as 0 | 1 | 2} ui={t.ui} />
          ))}
        </div>
      </div>
    </section>
  );
}
