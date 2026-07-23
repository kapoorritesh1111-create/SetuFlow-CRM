# FIX REPORT — S37-UX-009 / UX-010 / UX-011 (Premium build)

**Status:** In Review · **DB migrations:** none (all three reuse existing data + verified backend)

Built the three premium screens to match the approved mockups, on top of the corrected routing and the
verified backend spine. All wired to **real data**; `tsc --noEmit` = **0 errors**.

## S37-UX-009 — Lead Detail (`/leads/[leadId]`)
New `src/features/leads/lead-detail/LeadDetailPremium.tsx`, rendered by the route in place of the legacy
command-center component. From real `LeadProfileSnapshot` + `LeadProfileData`:
- Header: company, stage badge, location/source, contact chips; **Share Price List**, **Create Quote**,
  **Open Current Quote** actions.
- Readiness stat strip: score, current quote (vN + approval posture), products selected, parent quote
  status, next step.
- **Lead Status** timeline from `pipeline.stages` (completed / current / upcoming).
- **About Buyer** (description + Account / Deal value / Market / Owner).
- **Quotes on this Lead**: v1/v2 cards with version status + first-class **approval chips**
  (pending / approved / rejected) and current / superseded / locked markers; authority footnote.
- **Setu Guru** guidance + **Recent Activities**.

## S37-UX-010 — Quote Builder (`/leads/[leadId]/quote`)
The route was already premium + backend-wired (hero, 5-step stepper, `QuoteWorkspace` editor,
`enrichQuoteVersionsWithApprovals`, send guard). Added the mockup's right-rail via new
`src/features/quotes/quote-builder/QuoteVersionRail.tsx`:
- **Version History** with status + approval chips and current / locked / superseded markers.
- **What happens on save** (sent version stays locked → new version → `approval_requests` filed → audit).
- **Setu Guru** rail (version safety, approval posture from the current version, send guard).
Reads `approval_requests` as the source of truth; never writes `quotes.status` (DB-derived).

## S37-UX-011 — Share Price List (NEW route `/leads/[leadId]/share-price-list`)
New `src/features/leads/share-price-list/SharePriceListPremium.tsx` + route. Matches the mockup:
- Header + **Preview Buyer View / Copy Share Link / Share Now**.
- **Buyer Details**, **Price List Items** from the lead's linked products (best-effort catalog pricing
  via `/api/price-lists/products`), **Message to Buyer** (500-char composer), **Share Options** toggles,
  and a curated dark **preview card** with summary.
- Share / Preview launch the proven Sprint-34 **`ShareCatalogWizard`** prefilled with this lead —
  reusing the existing secure share-room + open-tracking backend (no new share infra).

## Also
- Deleted the orphaned `src/lib/leads/lead-quote-gate.ts` (parallel-agent duplicate, unused) in favour of
  the canonical `src/lib/quote-gate.ts`.
- New premium grids are responsive (Tailwind `grid-cols-1 lg:grid-cols-[…]`), so the pages render at all
  widths rather than the old `hidden md:block` desktop-only gate.

## Remaining
- **S37-TEST-012** (E2E + regression for the quote lifecycle) is the only Open item — test authoring, best
  done after a Vercel preview smoke test of these screens.
