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

## Languages
**Arabic is the default** and is served at `/` (`lang="ar" dir="rtl"`). English is at `/en`, and `/ar` redirects to `/`. A switch in the nav links the two.

- `content/ar.ts` holds the Arabic copy. It was written for Saudi and Gulf decision makers, not translated. Technical terms stay in English only where they read clearer (AI, CRM, Meta Ads, Google Ads, UGC). Never attach the Arabic article to a Latin word ("الـAI"), because bidi reorders it; phrase around it instead.
- Arabic type system: IBM Plex Sans Arabic 400–700 for display, body and labels, with no letter-spacing and taller line-heights. The rules are in the "Arabic & RTL" block of `app/globals.css`.
- Identity never changes with the script: the NIZAM wordmark, the staircase mark and the square signal full stop.
- In RTL every flow runs in reading direction:
  - the hero staircase climbs right to left
  - the engine rail and its data flow run right to left
  - the attribution diagram mirrors
  - the method loop mirrors
  - the lab's motion playhead reverses

  The finale's brand mark is never mirrored; it moves to the reading end instead.

```bash
npm run test:e2e              # Arabic (default)
LOCALE=en npm run test:e2e    # English
```
