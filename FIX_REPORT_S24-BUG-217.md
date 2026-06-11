# S24-BUG-217 / S24-UI-218 — Investors Page Native Port

Date: 2026-06-11 · Reporter: Ritesh Kapoor · Status: resolved (both)

## What was wrong

1. **S24-BUG-217 (high):** `/investors`, `/investor-overview`, and `/preseed` were
   never served by the App Router. `next.config.mjs` had `beforeFiles` proxy
   rewrites to `https://setu-flow-landing.vercel.app/` plus an `/assets/:path*`
   catch-all. The in-repo `InvestorOverviewPage` component was dead code.
   On the production domain, the PWA service worker
   (`setuflow-offline-v4-lead-queue`) cached **any** same-origin `*.css`
   cache-first with no revalidation and stored failed responses — poisoning the
   proxied Vite stylesheet and stripping every Tailwind responsive breakpoint.
   That is why the page looked clean on vercel.app (no SW) but broken and
   non-responsive on setuflowcrm.com.

2. **S24-UI-218 (medium):** No scalable logo on either version. The dead React
   port squeezed the 1536×1024 raster PNG into an `h-8 w-8` square; the Vite
   landing used a text-only wordmark and a `/favicon.svg` that 404s through the
   proxy. The correct full-lockup SVG was never in the repo.

## What changed (6 files)

| File | Change |
|---|---|
| `src/components/marketing/investor-overview-page.tsx` | **Rewritten.** 1:1 native port of `SetuFlowLanding-master/src/App.tsx`: video hero, scroll-reveal animations, mobile hamburger + slide-in drawer, icon comparison table, full pricing feature lists, unit-economics strip, 12-month milestones, cross-border market card. lucide-react icons replaced with inline SVGs (lucide is not a CRM dependency). |
| `src/components/marketing/boomerang-video-bg.tsx` | **New.** Client-component port of the boomerang video hero (plays forward, replays captured frames backward once, freezes). |
| `src/app/investors/page.tsx` | Metadata aligned to the landing branding ("Setu Flow — Investor Overview \| Pre-Seed"). `/investor-overview` and `/preseed` re-exports unchanged. |
| `next.config.mjs` | Removed the 3 investor proxy rewrites and the `/assets/:path*` catch-all (which also shadowed any future local `/assets`). Kept the `org-search → org-search-v2` rewrite (S24-BUG-214 unaffected). |
| `public/sw.js` | Cache name bumped to `setuflow-offline-v5-investor-css-fix` → activate handler purges all poisoned caches on every client. Removed the generic `.css` cache-first rule (Next CSS is content-hashed under `/_next/static/`, already covered). Non-OK responses are no longer cached. Lockup SVG added to precache. |
| `public/logos/setu-flow-lockup.svg` | **New.** Full SETU Flow lockup, 12-path vector, `viewBox="0 0 1536 1024"` — crisp at every size. Used in the page nav via `LockupLogo` (`h-9 sm:h-10 w-auto`). |

## Verification (regression_test: PASS)

- `node --check` on `public/sw.js` and `next.config.mjs` — PASS
- esbuild TSX syntax validation on all 5 route/component files — PASS
- `tsc --noEmit --strict` on `investor-overview-page.tsx` — exit 0
- Parity audit vs the Vite source: 7/7 section ids (`#problem #market
  #competitive #traction #roadmap #model #round`), 23/23 `<Reveal>` blocks,
  4/4 milestones, 6/6 country flags, 0 lucide imports, 0 browser-storage APIs.

## Deploy notes

1. Drop these files into the repo root (paths match), commit to `main`.
2. After the CRM deploys, the **setu-flow-landing Vercel project can be paused
   or deleted** — nothing references it anymore.
3. Clients with the broken page need no manual cache clearing: the SW cache
   name bump purges old caches on next visit. One hard refresh shows the fix
   immediately if anyone asks.
4. The footer intentionally keeps the text wordmark: the lockup's navy "SETU"
   is low-contrast on the dark `#1f2a1d` footer. If you want a logo there too,
   we need a white/mono variant of the lockup.
5. Do **not** use `uploads/logo.png` anywhere — it is JPEG-encoded (no alpha,
   baked black background) despite the .png extension.
