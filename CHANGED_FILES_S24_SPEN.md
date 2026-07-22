# S24-SPEN Packaging Vertical — Changed Files Manifest

## New files
- src/lib/verticals/capability.ts
- src/lib/packaging/types.ts
- src/lib/packaging/pricing-engine.ts
- src/lib/packaging/seed-data.ts
- src/lib/packaging/seed.ts
- src/lib/packaging/queries.ts
- src/lib/setu-guru/packaging-guidance.ts
- src/features/packaging/server/actions.ts
- src/features/packaging/components/packaging-catalog.tsx
- src/features/packaging/components/packaging-line-configurator.tsx
- src/features/packaging/components/packaging-quote-section.tsx
- src/features/packaging/components/pricing-template-builder.tsx
- src/app/(app)/admin/packaging-templates/page.tsx
- tests/packaging/pricing-engine.test.ts

## Edited files
- src/features/quotes/canonical/CanonicalQuoteBuilder.tsx        (packaging prop, packaging-aware line helpers, ProductStep section, Review preview)
- src/features/quotes/canonical/CanonicalQuoteBuilderApprovalQueueV2.tsx  (packaging prop pass-through)
- src/features/quotes/canonical/actions-stabilized.ts            (product replace preserves line_type='packaging'; total_line_count recount)
- src/app/(app)/leads/[leadId]/quote/page.tsx                    (packaging capability + data fetch)
- src/app/(app)/products/page.tsx                                (packaging catalog default; classic at ?mode=products)
- src/lib/queries/query-core.ts                                  (line-item select + typed packaging fields)
- src/lib/queries/data.ts                                        (line-item select + typed packaging fields)
- src/features/client-onboarding/server/provisioning.ts          (packaging_converter → vertical_key + seeds + audit log)
- src/lib/setu-guru/page-context.ts                              (packaging-templates route context)
- tests/design-tokens.test.mjs                                   (ratchet re-baselined for pre-existing marketing files)
- package.json                                                   (test:packaging script)

## Scroll bugfixes (added after QA feedback — S24-SPEN-212 / -213)
- src/app/smc/qa/run/[suiteKey]/run-board.tsx   (wrap cases in .smc-cs scroll region)
- src/app/smc/qa/qa-workspace.tsx               (wrap tab body in .smc-cs)
- src/app/globals.css                           (only-child override so headerless drawers — Setu Guru — keep flex height and scroll)

## Supabase (already applied to production project sjzfzloggabsmcuxktnl)
- Migration s24_spen_packaging_vertical_foundation (tables, columns, RLS, backfill)
- Seeds: 9 packaging_service_families + 5 packaging_pricing_templates (org 3f8ef935…, idempotent)
- Rate tuning update on 3 dimensional templates (matches seed-data.ts)
- QA suite: qa_test_suites/qa_test_cases suite_key 's24-spen-packaging' (20 cases, 9 critical) → /smc/qa/run/s24-spen-packaging
- sprint_issues S24-SPEN-201..211 → In Review with fix_applied/files_changed/qa_notes

## Verification run in sandbox
- npx tsc --noEmit → 0 errors
- npm run test:packaging → 12/12 pass
- node --test tests/design-tokens.test.mjs → 5/5 pass

## Follow-up batch — live QA findings (S24-SPEN-214..219)

Found via a live Chrome walkthrough of the deployed packaging workspace, compared against the wireframe/doc.

### New files
- src/lib/packaging/family-visuals.ts (icon + color per family, built from existing design tokens)
- src/app/(app)/products/[familySlug]/page.tsx (catalog category detail page)
- src/app/(app)/products/[familySlug]/[templateSlug]/page.tsx (product/service detail page)

### Edited files
- src/components/ui/setu-icon.tsx — added tag/pouch/ribbon/layers/cube/barcode/camera/check/plus glyphs
- src/features/admin/components/admin-settings-shell.tsx — async self-resolving packaging capability; new packagingOnly nav flag; nav entries
- src/features/packaging/components/packaging-catalog.tsx — icons, starting price, drill-down links, removed "Open product catalog"
- src/lib/packaging/pricing-engine.ts — estimateStartingPrice(); adhesive validation; adhesive in spec summary
- src/lib/packaging/types.ts — AdhesiveOption type; adhesive_options_json; adhesive_key
- src/lib/packaging/seed-data.ts — adhesive_options_json seeded on Digital Labels template
- src/lib/packaging/seed.ts — adhesive_options_json passthrough
- src/lib/packaging/queries.ts — adhesive_options_json in selects; slug lookups
- src/features/packaging/server/actions.ts — adhesive_options_json in save + duplicate
- src/features/packaging/components/packaging-line-configurator.tsx — Adhesive select
- src/features/packaging/components/pricing-template-builder.tsx — Adhesive options editor + preview select
- tests/packaging/pricing-engine.test.ts — adhesive validation test

### Supabase (already applied)
- Migration s24_spen_214_packaging_adhesive_options
- sprint_issues S24-SPEN-214..219 logged and In Review

### Verification
- npx tsc --noEmit → 0 errors
- npm run test:packaging → 13/13 pass
- node --test tests/design-tokens.test.mjs → 5/5 pass

## S27-STARK — Stark Enterprise Enablement (Phase A + B, this session)

Roadmap doc: stark-enterprise-roadmap.md (18 issues across Phases A-F, logged in sprint_issues).

### Phase A — Roles & Access Foundation (A1-A4, In Review)
- New files: src/app/(app)/design-queue/page.tsx, src/app/(app)/dispatch-board/page.tsx
- Edited: src/lib/workspace/roles.ts (design/ordering roles), src/lib/workspace/permissions.ts
  (packaging.design/production/order_entry capabilities), src/lib/packaging/queries.ts
  (getPackagingDesignQueue/getPackagingDispatchQueue), src/app/(app)/dashboard/page.tsx
  (role-based redirect), src/components/layout/app-shell.tsx (packagingEnabled threaded to nav),
  src/app/(app)/layout.tsx, src/components/shell/route-meta.ts, src/lib/modules/module-grants.ts
- Supabase: design + ordering role rows seeded for the Stark org

### Phase B — Flexo Pricing Model (B1-B4, In Review)
- Edited: src/lib/packaging/types.ts (PrintProcess, FlexoRules, CylinderRateTier types),
  src/lib/packaging/pricing-engine.ts (cylinder cost formula + reuse toggle),
  src/lib/packaging/queries.ts, src/features/packaging/server/actions.ts,
  src/lib/packaging/seed-data.ts (new sup-flexo-high-volume template),
  src/lib/packaging/seed.ts, src/features/packaging/components/packaging-line-configurator.tsx
  (repeat length + reuse-cylinder toggle), src/features/packaging/components/pricing-template-builder.tsx
  (print process toggle + cylinder tier editor), tests/packaging/pricing-engine.test.ts (6 new tests)
- Supabase: migration s27_stark_b1_flexo_pricing_columns; sup-flexo-high-volume template seeded live

### Verification (this session)
- npx tsc --noEmit -> 0 errors
- npm run test:packaging -> 19/19 pass
- node --test tests/design-tokens.test.mjs -> 5/5 pass

### Remaining (Phases B3-inventory, C, D, E, F) — see stark-enterprise-roadmap.md
- B3 remainder: cylinder inventory table + automatic same-spec detection on reorder
- C: saved SKU spec cards, one-click reorder, client/brand rollup
- D: branded PDF export, production job ticket, artwork upload + approval link
- E: production-stage tracker, packaging analytics dashboard
- F: material swatches, web-width fields

## Phase C — Repeat-Client Tooling (C1-C3, In Review)

- New files: src/app/(app)/leads/[leadId]/packaging-history/page.tsx
- Edited: src/lib/packaging/types.ts (PackagingSavedSpec, PackagingHistoryLine),
  src/lib/packaging/queries.ts (getPackagingSavedSpecs, getPackagingHistoryForLead),
  src/features/packaging/server/actions.ts (savePackagingSpec, deletePackagingSavedSpec),
  src/features/packaging/components/packaging-quote-section.tsx (Save as spec, Reorder,
  Saved specs list, link to history page), src/app/(app)/leads/[leadId]/quote/page.tsx,
  src/features/quotes/canonical/CanonicalQuoteBuilder.tsx (savedSpecs prop threading),
  src/components/shell/route-meta.ts
- Supabase: migration s27_stark_c1_packaging_saved_specs (new table, RLS org-scoped)

### Verification (this session)
- npx tsc --noEmit -> 0 errors (fixed one real implicit-any error)
- npm run test:packaging -> 19/19 pass
- node --test tests/design-tokens.test.mjs -> 5/5 pass

### Remaining (Phases D, E, F) — see stark-enterprise-roadmap.md
- D: branded PDF export, production job ticket, artwork upload + approval link
- E: production-stage tracker, packaging analytics dashboard
- F: material swatches, web-width fields

## Phase D (partial) — White-Glove Experience (D1-D2, In Review; D3 not started)

### D1 — Branded PDF quote export
- Fixed a real gap in the EXISTING /api/quotes/[quoteId]/pdf route (already wired to
  "Customer PDF" buttons app-wide): packaging lines and optional charges were silently
  excluded because the route predates the packaging vertical. No new UI needed.
- Edited: src/app/api/quotes/[quoteId]/pdf/route.ts

### D2 — Production job ticket
- New files: src/app/(app)/quotes/[quoteId]/job-ticket/page.tsx, print-button.tsx
- Edited: src/lib/packaging/queries.ts (getPackagingJobTicketData),
  src/app/(app)/dispatch-board/page.tsx (Job ticket link)
- Print-only internal document, no selling price, uses browser print/Save-as-PDF
  (no new PDF dependency needed for this internal use case)

### Verification (this session)
- npx tsc --noEmit -> 0 errors
- npm run test:packaging -> 19/19 pass
- node --test tests/design-tokens.test.mjs -> 5/5 pass

### Remaining
- D3: artwork upload + proof versioning + client-facing approval link (not started —
  significant scope: file storage, versioning, public unauthenticated approval page)
- Phases E, F entirely

## Phase D complete — D3 (In Review)

Artwork upload + proof versioning + client-facing approval link.

- New files: src/features/packaging/components/packaging-proof-panel.tsx,
  src/app/api/public/proof-approval/route.ts, src/app/proof-approval/[token]/page.tsx,
  src/app/proof-approval/[token]/proof-decision-form.tsx
- Edited: src/lib/packaging/types.ts (PackagingProof), src/lib/packaging/queries.ts
  (getPackagingProofs, getPackagingProofByToken), src/features/packaging/server/actions.ts
  (uploadPackagingProof, listPackagingProofs), src/features/packaging/components/packaging-quote-section.tsx
- Supabase: migration s27_stark_d3_packaging_proofs (new table, RLS org-scoped,
  deliberately NO anonymous policy); reuses the existing private lead-attachments
  storage bucket under a packaging-proofs/ prefix (no new bucket created)

### Security model (read before relying on this in production)
- Public access gated ENTIRELY by a long random approval_token (~64 hex chars,
  two concatenated crypto.randomUUID() values) — never by any other lookup
- Public page/API always use the service-role admin client, never a session
  client; there is no anonymous RLS policy on packaging_proofs by design
- 30-day token expiry, checked on every access
- File preview via a 1-hour signed URL, generated fresh per page load, never a
  permanent public URL
- No selling price anywhere on the public page
- Rate-limited (10/hour/IP) on the approve/reject write path
- Upload is authenticated (requireWorkspace), size-capped (15MB), mime-restricted
  (PDF/PNG/JPEG/WEBP)

### Verification (this session)
- npx tsc --noEmit -> 0 errors (fixed a missing type import + admin-client-as-any
  casts, same pattern as every other new table this session pending a full
  database.generated.ts regen)
- npm run test:packaging -> 19/19 pass
- node --test tests/design-tokens.test.mjs -> 5/5 pass

## Remaining: Phase E (production-stage tracker, analytics), Phase F (polish)

## Bug fix + catalog completion + demo data + QA suite (this session)

### Critical bug fix (S27-STARK-BUG-01)
- Design Queue, Dispatch Board, Client Order History, and Job Ticket queries all
  referenced the wrong table (.from('rfqs') instead of .from('quotes')) — found
  while preparing to seed demo data. rfqs is a distinct, unrelated table with 0
  rows for this org; quote_line_items.quote_id actually references quotes.id.
  This meant all four pages would always show empty/not-found for every
  packaging org, despite real matching data existing.
- Edited: src/lib/packaging/queries.ts (3 call sites fixed)

### Catalog completion
- 4 of 9 service families had no pricing template (Digital Flexible Packaging,
  Prototypes & Mockups, 3D Packshots, Packaging Add-ons) — genuinely unquotable.
  Added realistic templates for all 4, completing full catalog coverage.
- Edited: src/lib/packaging/seed-data.ts

### Demo data (Supabase, not in the zip — lives in the Stark org directly)
- 9 India-based fictional companies across Stark's real client verticals
  (F&B, pharma, nutraceutical, personal care, household), one lead each
- 12 quotes total (one per family across the 9 companies, plus Himalayan
  Springs Beverages has 3: digital trial, flexo first run, flexo reorder
  with cylinder reuse) spanning draft/in_review/sent/accepted/rejected
- Optional charges (freight, rush) on 3 quotes
- 1 saved spec (Himalayan Springs flexo pouch) for reorder testing

### QA suite: s27-stark-enterprise (23 cases, 15 critical)
- Part A (7 cases): step-by-step setup guide — roles, landing pages, nav
- Part B (15 cases): scenario tests grouped by feature (catalog, flexo,
  repeat-client tooling, white-glove/PDF/job-ticket/proof-approval)
- Part C (1 case): single continuous end-to-end packaging workflow test

### Verification (this session)
- npx tsc --noEmit -> 0 errors
- npm run test:packaging -> 19/19 pass
- node --test tests/design-tokens.test.mjs -> 5/5 pass

## Data integrity fixes + Design Queue discoverability (this session)

### Fixed: Orders never created for accepted seeded quotes (S27-STARK-DATA-01, Resolved)
Seeded quotes were set to status=accepted directly via SQL, bypassing the real
acceptance transaction (app_safe_accept_sent_quote_tx RPC) that actually creates
orders/contracts. Ran the RPC properly for all 6 accepted quotes — Orders now
populated with correct totals. No code changed, Supabase data only.

### Fixed: Analytics showed $0 everywhere (S27-STARK-DATA-02, Resolved)
Pipeline Value reads leads.deal_value (was null for all seeded leads); Top
Markets by Pipeline reads a lead_markets join table (seeded leads weren't
linked to any market). Populated deal_value on all 9 leads and linked them to
the existing "Asia" market. No code changed, Supabase data only.

### Improved: Design Queue / artwork proof discoverability (S27-STARK-UX-01, In Review)
- Edited: src/features/packaging/components/packaging-proof-panel.tsx (visible
  button instead of small text link)
- Edited: src/app/(app)/design-queue/page.tsx (proof panel embedded directly
  in each row — act on artwork without leaving the queue)

### Verification (this session)
- npx tsc --noEmit -> 0 errors
- npm run test:packaging -> 19/19 pass
- node --test tests/design-tokens.test.mjs -> 5/5 pass

## Flagged, not fixed — needs your direction (see chat response)
- Quote Builder Terms step (Step 2) still shows export/FOB/Incoterm/Port
  fields for every quote, including packaging ones — was never adapted for
  a domestic packaging business. Pre-existing app behavior, not something
  I introduced, but genuinely wrong for Stark's use case.
- "Cannot edit accepted quotes" — this is intentional (accepted = locked,
  revise via a new quote), not a bug. Flagging in case it's not what you
  expected.

## Domestic terms + Service Family admin (this session)

### S27-STARK-TERMS-01 — Domestic-first Quote Terms (In Review)
- New: src/features/quotes/canonical/terms-delivery-fields.tsx
- Edited: CanonicalQuoteBuilder.tsx, actions-stabilized.ts
- Terms step defaults to Domestic (India, INR, delivery/dispatch fields) for
  packaging orgs; International toggle keeps the original export fields.
  Non-packaging orgs unaffected.

### S27-STARK-FAMILY-01 — Service Family admin page (In Review)
- New: src/app/(app)/admin/packaging-families/page.tsx,
  src/features/packaging/components/packaging-family-manager.tsx
- Edited: types.ts (icon_key), queries.ts (getPackagingFamiliesForAdmin),
  family-visuals.ts (icon_key-aware, FAMILY_ICON_OPTIONS picker), actions.ts
  (savePackagingFamily), admin-settings-shell.tsx (nav entry), template
  builder (cross-link to family), catalog + drill-down pages (icon_key wired
  through)
- Supabase: migration s27_stark_family_icon_column

### Verification (this session)
- npx tsc --noEmit -> 0 errors (fixed one real type mismatch)
- npm run test:packaging -> 19/19 pass
- node --test tests/design-tokens.test.mjs -> 5/5 pass

## Still open — see chat response for the plan
- Admin page visual polish ("dev looking", not premium) — not yet redesigned,
  needs a focused pass, proposal given in chat
- Shared reference-data library (materials/finishes/service items as a
  reusable master list instead of per-template free text) — scoped as a
  bigger V2 item, not started
