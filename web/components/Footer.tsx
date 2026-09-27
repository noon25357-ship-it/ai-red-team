import type { Dictionary } from "@/content/en";
import { Logo } from "./ui/Logo";
import { site } from "@/lib/site";

export function Footer({ t, nav }: { t: Dictionary["footer"]; nav: Dictionary["nav"] }) {
  return (
    <footer className="bg-night text-stone" data-theme="dark">
      <div className="shell grid gap-10 border-t border-rule-dark py-12 md:grid-cols-12 md:items-end">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-5 max-w-[34ch] text-[15px] text-fog">{t.line}</p>
        </div>
        <ul className="flex flex-wrap gap-x-7 gap-y-3 md:col-span-5 text-[14px]">
          {nav.links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-fog transition-colors hover:text-stone">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-6 md:col-span-2 md:flex-col md:items-end">
          <a href="#top" className="label text-fog hover:text-stone">
            {t.top} ↑
          </a>
          <p className="label text-fog">
            © {new Date().getFullYear()} {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
