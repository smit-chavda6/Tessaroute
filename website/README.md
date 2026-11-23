# Tessaroute website

The showcase / landing page for Tessaroute. Next.js 16 (App Router, static
export), React 19, Tailwind v4, Motion and [cobe](https://github.com/shuding/cobe)
(WebGL globe). One deliberate dark "deep space" theme. No backend: every
interactive piece (globe, request trace, alias explorer, failover simulator,
cost calculator) runs in the browser from the data in `lib/data.ts`.

```bash
cd website
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # static site in out/
```

## Layout

| Path | What |
|------|------|
| `app/layout.tsx` | fonts (Sora, Geist, Geist Mono), metadata, the page-wide `Starfield` |
| `app/globals.css` | design tokens (glass panels on deep space), Tailwind theme mapping, globe-label anchoring |
| `components/Starfield.tsx` | fixed canvas behind the page: parallax stars, twinkle, occasional meteor |
| `components/Globe.tsx` | cobe globe: gateway in Mumbai, arcs to provider regions, drag to rotate; labels anchored to markers, faded near the rim and collision-checked every frame |
| `components/TraceSection.tsx` | the animated request trace (`TraceTerminal`) with its explanation |
| `lib/data.ts` | every fact on the page: models, prices, aliases, pipeline, tour, stats, phases |
| `components/Hero.tsx` | headline, CTAs, provider status, globe, model marquee |
| `components/Glyphs.tsx` / `Illustrations.tsx` | duotone icon set and the animated SVG scenes in the feature bento |
| `components/AliasExplorer.tsx` | `smart` / `balanced` / `fast` → per-provider models, click to fail a provider |
| `components/Pipeline.tsx` | the five request stages with a travelling packet |
| `components/FailoverSim.tsx` | SVG routing diagram + circuit-breaker simulation (threshold 5) |
| `components/DashboardTour.tsx` | screenshots in a 3D-tilt browser frame, auto-advancing tabs |
| `components/CostCalculator.tsx` | monthly cost with / without cache, USD / INR |
| `components/Nav.tsx` | floating glass nav, scroll progress, active section, Ctrl/⌘K palette |

## Keeping it accurate

`lib/data.ts` mirrors `backend/models.yaml` and `backend/pricing.yaml`. When you
change models or prices there, update `ALIASES` / `PRICES` / `PRICING_VERSION`
here too. Screenshots in `public/screenshots/` are copies of `docs/screenshots/`.

## Deploy

Live at **https://tessaroute.vercel.app**. The Vercel project `tessaroute`
(team `smit-chavda-projects`) is linked to this repo with Root Directory
`website`, so every push to `master` deploys to production.


Vercel: import the repo and set **Root Directory** to `website`. Any static
host also works: upload `out/` after `npm run build`.
