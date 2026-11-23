# InferMesh website

The showcase / landing page for InferMesh. Next.js 16 (App Router, static
export), React 19, Tailwind v4 and Motion. No backend: every interactive piece
(request trace, alias explorer, failover simulator, cost calculator) runs in the
browser from the data in `lib/data.ts`.

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
| `app/layout.tsx` | fonts (Bricolage Grotesque, Geist, Geist Mono), metadata, pre-paint theme script |
| `app/globals.css` | design tokens (dark default, `data-theme="light"`), Tailwind theme mapping |
| `lib/data.ts` | every fact on the page: models, prices, aliases, pipeline, tour, stats, phases |
| `components/Hero.tsx` | headline, `MeshCanvas` background, `TraceTerminal`, model marquee |
| `components/AliasExplorer.tsx` | `smart` / `balanced` / `fast` → per-provider models, click to fail a provider |
| `components/Pipeline.tsx` | the five request stages with a travelling packet |
| `components/FailoverSim.tsx` | SVG routing diagram + circuit-breaker simulation (threshold 5) |
| `components/DashboardTour.tsx` | screenshots in a 3D-tilt browser frame, auto-advancing tabs |
| `components/CostCalculator.tsx` | monthly cost with / without cache, USD / INR |
| `components/Nav.tsx` | sticky nav, scroll progress, active section, theme toggle, Ctrl/⌘K palette |

## Keeping it accurate

`lib/data.ts` mirrors `backend/models.yaml` and `backend/pricing.yaml`. When you
change models or prices there, update `ALIASES` / `PRICES` / `PRICING_VERSION`
here too. Screenshots in `public/screenshots/` are copies of `docs/screenshots/`.

## Deploy

Vercel: import the repo and set **Root Directory** to `website`. Any static
host also works: upload `out/` after `npm run build`.
