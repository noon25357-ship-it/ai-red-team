# Nizam — Growth Systems landing page

Next.js 15 (App Router, static) · React 19 · TypeScript · Tailwind 4. No animation library: motion is CSS driven by scroll-progress custom properties plus one `requestAnimationFrame` loop for the hero. The loop runs only while the hero is on screen.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run test:e2e     # Playwright smoke suite against :3000 (BASE_URL / CHROMIUM_PATH to override)
```

## Art direction
- **Palette:** Limestone `#e7e6e1`, Ink `#121413`, Night `#0c0d0d`, Signal `#ff5316`. Signal is reserved for data moving through the system. It is never used for decoration or for body text on light backgrounds.
- **Type:** Archivo Expanded (display), Instrument Sans (body), IBM Plex Mono (system labels), IBM Plex Sans Arabic (loaded for RTL).
- **Signature, "the staircase":** the hero system is wired as an ascending stepped line, a growth curve built out of the system itself. Each signal is one visitor, and most of them leave along the way. The same staircase is the logo mark, and at the end of the page every node converges into it.

## Structure
- `content/en.ts`: every visible string (typed `Dictionary`).
- `content/proof.ts`: the only source for the Results section. Values stay `null` until a client approves real numbers, so nothing invented is ever shown.
- `lib/site.ts`: brand name, contact email (**placeholder: replace `hello@example.com`**) and site URL.
- `lib/i18n.ts`: locale registry. `/` rewrites to `/en`.
- `components/sections/*`: one file per section.

## Adding Arabic (RTL)
1. Create `content/ar.ts` exporting `const ar: Dictionary = { … }`.
2. Add `"ar"` to `locales` and `dictionaries` in `lib/i18n.ts`.

The layout then sets `lang="ar" dir="rtl"`, and the Arabic font is already loaded. Components use logical properties (`start`/`end`, `ps`/`pe`), and the engine tabs swap their arrow keys in RTL.
