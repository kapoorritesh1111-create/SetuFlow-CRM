# SETU Flow — Catalog & Price List Workstream · Full Handoff

**Workstream:** Make Price Lists a natural extension of `/products` (single source of truth) — correct pricing, no duplicate catalog universe, premium discoverable UX.
**Status:** All reported issues addressed. 4 genuinely-open follow-ups remain on the board (down from 40 In Review). Code + DB changes applied to live Supabase (`sjzfzloggabsmcuxktnl`). Full `npm run verify` must be run on your machine before deploy (no `node_modules` in the build sandbox).

---

## 1. Everything reported in this chat → status

| # | Reported issue | Status | Where fixed |
|---|---|---|---|
| 1 | Catalog/Price List a duplicate universe; Products should be source of truth | ✅ Done | Resolver + IA + `/catalog` demoted to Buyer Shares |
| 2 | "Missing Price" on products that are actually priced | ✅ Done | Canonical resolver + RLS read policies + backfill |
| 3 | Price List editor: Base Unit Price empty (no auto-fill) | ✅ Done | Resolver + RLS (rules readable) |
| 4 | Price Lists not in left nav / not reachable from Products | ✅ Done | Nav entry + header links + breadcrumbs |
| 5 | Buyer-segment dropdown polluted with product categories | ✅ Done | Options API: removed `leads.product_type` |
| 6 | Share Wizard flags priced products as "no price" | ✅ Done | Wizard reads canonical pricing |
| 7 | **MOQ + pack size not auto-populating** (price did) | ✅ Done | **Root cause: missing RLS on `product_variants`** — added member-read policy |
| 8 | **Missing image treated as a blocker** | ✅ Done | Image now optional; only price gates; neutral note in wizard |
| 9 | **Products with base price still show "price on request"** in share | ✅ Done | Wizard preview now shows product base price; buyer page already falls back |
| 10 | **Catalog Hub not premium / poor whitespace use** | ✅ Done | Premium KPIs, pill tabs, content surface, 2-col Shared Links with playbook rail |
| — | Setu Guru product suggestions | 👍 Working (kept, praised) | — |
| 11 | Reconcile Catalog KPI vs Products count (S34-CATALOG-044) | ✅ Resolved | Not a bug: active-total (40) vs filtered-visible (37) — different metrics by design |
| 12 | Seed `exchange_rates` for FX (045) | ✅ Done | Seeded USD→EUR/GBP/INR/AED/CAD (`manual-seed`) |
| 13 | Plan flat-column retirement (046) | ⏳ Open (future) | Plan documented; kept open |

---

## 2. The decisive root cause (this pass)

`product_variants` and `product_pricing_rules` had **RLS enabled but zero policies**, so the org-member (user-context) client read **nothing** from them, while `products` (which has policies) read fine. Consequences:

- The price *appeared* to auto-fill (1.35) only because the previous backfill populated `products.fob_price`; the resolver's `product_pricing_rules` read was actually returning empty.
- **MOQ / pack / lead time** live only on `product_variants`, which returned empty → those fields never auto-filled.

Fix: added member SELECT policies mirroring `products`. This makes MOQ auto-fill work **and** makes the pricing resolver genuinely canonical across the entire app.

---

## 3. Code changes (full list)

**Pricing source (turn 2 + extended turn 3)**
- `src/lib/catalog-share/pricing-resolver.ts` *(new)* — `resolveProductPricing()` canonical EXW/FOB (per-unit USD) from rules, flat fallback for CIF/DDP.
- `src/app/api/price-lists/products/route.ts` — overlays canonical pricing + variant MOQ/pack/lead onto product rows; feeds picker, Catalog Hub, readiness badge, Share Wizard.
- `src/app/api/price-lists/options/route.ts` — removed `leads.product_type` from buyer segments; curated B2B defaults; returns `fxRates`.

**Price List Manager**
- `src/app/(app)/price-lists/price-list-manager.tsx` — Products breadcrumb; FX-aware auto-fill into list currency.

**Navigation / IA**
- `src/features/products/components/products-spreadsheet-page.tsx` — Price Lists + Buyer shares header actions.
- `src/lib/routes/manifest.json` — Price Lists left-nav entry.
- `src/app/(app)/catalog/catalog-hub.tsx` — demoted to **Buyer Shares**; removed duplicate Products editor tab; **premium redesign** (KPI cards with icons/accents, pill tabs, content surface, 2-col Shared Links + sharing-playbook rail, richer empty state).

**Sharing / readiness (turn 3)**
- `src/lib/catalog-share/types.ts` — image is optional; only price gates readiness.
- `src/components/catalog/share-catalog-wizard.tsx` — image warning softened to a neutral optional note; price-list preview shows product **base price** fallback instead of "price on request".

**DB migrations (in repo + applied live)**
- `supabase/migrations/s34_catalog_039_pricing_source_backfill.sql` — backfilled flat columns from canonical rules (Banana Chips 110→1.45; ~19 NULLs filled; 17→22 priced).
- `supabase/migrations/s34_catalog_040_variant_pricing_rls_read.sql` — member-read RLS on `product_variants` + `product_pricing_rules`.
- Seed: `exchange_rates` USD→EUR/GBP/INR/AED/CAD (`manual-seed`).

---

## 4. Issue tracker — board cleaned

**Before:** 40 issues "In Review" (the entire shipped Sprint 34 catalog build + fixes).
**After:** **42 Resolved, 4 In Review.**

Resolved this workstream: S34-CATALOG-001→023, 026→034, 036→043, 044, 045, 047, 048 (047/048 newly created for this pass's image + RLS fixes).

**Still open (genuinely pending — these are your real backlog):**
- **S34-CATALOG-024** — Share room mobile responsiveness & buyer polish (needs device QA).
- **S34-CATALOG-025** — QA, regression, permissions, production readiness (the verify/QA gate — keep open until `npm run verify` + live QA pass).
- **S34-CATALOG-035** — Buyer-specific pricing & approval workflow (planning/future build).
- **S34-CATALOG-046** — Retire flat `products.*_price` columns once all readers use the resolver (future migration).

Resolved build issues carry a board-cleanup note; reopen any that device/QA review finds incomplete.

---

## 5. Verification

Done in sandbox: all edited TS/TSX transpile clean (esbuild); route/manifest/repo-alignment contract tests pass (2 unrelated pre-existing failures in `globals.css` and the profile vCard editor — untouched here); live DB dry-runs + post-change counts confirmed.

**You must run before deploy** (sandbox has no `node_modules`):
```
npm install
npm run verify        # typecheck + contracts + rollback + tests + build
```
Then live QA: `/products` → Price Lists → create FOB list → Add Beetroot Chips → confirm **price AND MOQ + pack** auto-fill; `/catalog` shows premium Buyer Shares (no duplicate Products tab, playbook rail); buyer-segment dropdown has no categories; Share Wizard shows base prices (not "price on request") and a neutral image note.

---

## 6. Pending / recommended next

1. Run `npm run verify` and live QA; then close **S34-CATALOG-025**.
2. Replace `manual-seed` FX with a live FX feed (cron into `exchange_rates`).
3. Mobile pass on the buyer share room (**-024**).
4. Plan + execute the flat-column drop (**-046**) once you confirm no other code reads `products.*_price` directly.
5. Scope buyer-specific pricing & approval (**-035**) if still wanted.

> Reminder: a parallel agent pushes to the same repo — pull-rebase before applying this zip.
