# Next-Sprint Prompt (ready to paste)

I'm continuing Sprint 24 on SetuFlow CRM (Next.js 14 App Router, Supabase project sjzfzloggabsmcuxktnl, repo kapoorritesh1111-create/SetuFlow-CRM, main branch).

Context from the last session (S24-BUG-217 + S24-UI-218, both resolved):
- /investors, /investor-overview, /preseed are now served NATIVELY by the App Router. The next.config.mjs proxy rewrites to setu-flow-landing.vercel.app (and the /assets/:path* catch-all) were REMOVED. Do not re-add them.
- The investor page lives in src/components/marketing/investor-overview-page.tsx ('use client', inline SVG icons — lucide-react is NOT a dependency) with src/components/marketing/boomerang-video-bg.tsx for the hero video.
- Service worker is now setuflow-offline-v5-investor-css-fix. It must NEVER cache-first a generic *.css pattern — only /_next/static/, /logos/, /icons/, *.woff2 — and must never cache non-OK responses. Keep this invariant in any future SW edits.
- The scalable brand lockup is /public/logos/setu-flow-lockup.svg (viewBox 0 0 1536 1024). Use it for any light-background page-level branding. setu-flow-logo.png is a raster — avoid. A white/mono lockup variant is still needed for dark backgrounds (footer currently uses a text wordmark).
- The standalone setu-flow-landing Vercel project is now unreferenced and can be paused/deleted after the deploy is verified.

Open Sprint 24 items: S24-DOC-209 (SMC docs), S24-DOC-212 (pricing calculator), S24-DOC-213 (trial brief), S24-BUG-214 (org-search-v2 no-op — note: the /api/setu-guru/org-search → org-search-v2 rewrite in next.config.mjs was deliberately preserved).

Standing rules: Node --check before every push; chunked file writes for large TSX; every docs pass must update the root HTML with the same structure; Setu Guru UI must use /setu-guru/guru-avatar-128.png (inline) and /setu-guru/guru-logo-navbar.png (hero); client orgs (e.g. Avanti Foods db32ef11) never see internal tooling; all tracker issues attributed to "Ritesh Kapoor" with fix_applied, regression_test ("PASS — ..."), files_changed, resolved_at, verified_at; deliverables as downloadable zip + next-sprint prompt.

Today's task: [DESCRIBE TASK]
