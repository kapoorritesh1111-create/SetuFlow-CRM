# SETU Flow PR Tracker

NorthStar rebuild is active. PR-NS-09A hotfix is closed in this repo pass; PR-NS-09 full pass is the active next implementation step.

## Current completed pass

### PR-NS-09A — Hotfix: Trade Show Nav · Quote Constraint · Orders Workspace · Open Order

Status: Completed

Fixes applied:
- `category_type: 'general'` → `'chips'` in `leads/server/actions.ts` — resolves constraint violation on inline quote wizard (edit quote, Terms/Review/Send Gate steps).
- `/trade-events` added to `PRIMARY_LABELS` in `navigation.tsx` — Trade Events now visible in sidebar as "Events" with calendar icon.
- "Trade Show" button added to global topbar (`app-shell.tsx`) beside + Quick Lead.
- Orders empty state replaced: old `PageHeader`/`SectionCard` workspace replaced with full NS Orders Desk shell (topbar, stats strip, empty queue card with CTAs).
- "Open order" button fixed: was `#anchor` scroll → now navigates to `leads?leadId=...&handoff=order-open&quoteId=...`.
- Removed unused imports from orders page.


Goal: make Quotes, Orders, Pipeline, and Catalog look and feel like the redesign HTML, not just behave correctly.

Completed alignment:
- Quotes uses the shared NorthStar command hero, exact Quotes Workspace language, All/Buyers/Suppliers switch, Export, + New quote, status/date/company filters, KPI rhythm, approval queue, quote table, detail panel, FX/override visibility, and workflow CTAs from the quotes redesign.
- Orders uses the shared NorthStar command hero, Orders Execution Desk language, Open order, View quote, Upload document, Export, All/Buyers/Suppliers switch, execution KPI cards, order lifecycle, blockers, and dispatch readiness context from the orders redesign.
- Pipeline uses the redesign language for Pipeline / Risks and Kanban Board, with Quick Lead, Follow-up Queue, Dashboard link, blocker-first filters, KPI cards, lane board, stage movement guards, and quote/order handoff CTAs.
- Catalog uses Catalog — Products, Pricing & Variants language, Products/Pricing/Spreadsheet modes, Export, Add product, Pricing gaps, KPI coverage, product table pricing columns, inline USD baseline editing, drawer editing, and quote-ready signals.
- Shared workspace surface tokens were tightened so the four pages use the same rounded command-card, metric-card, CTA, and table-shell feel.
- Internal DCC, Release Proof, root page, and NorthStar reference notes now mark PR-NS-07.5 complete and keep PR-NS-08 as the active next development step.

Acceptance proof:
- Quotes, Orders, Pipeline, and Catalog are now visually aligned to their redesign HTML patterns across command header, filters, KPI rhythm, CTAs, tables/cards, right/detail context, and workflow language.
- Existing quote FX, quote override, order execution, pipeline gating, and catalog pricing logic were not changed.

## Completed NorthStar sequence

- PR-NS-01 — Leads foundation rebuild
- PR-NS-02 — Lead Command Center workflow depth
- PR-NS-02B — Leads Reference Fidelity Lock
- PR-NS-03 — Quote Builder governed workflow
- PR-NS-04 — Quotes Workspace rebuild
- PR-NS-05 — Pipeline execution board rebuild
- PR-NS-06 — Orders execution desk rebuild
- PR-NS-07 — Catalog operational rebuild
- PR-NS-07.5 — NorthStar visual parity hardening

## Active next step

### PR-NS-08 — Catalog-to-Quote data wiring hardening

Scope:
- Harden catalog baselines into Quote Builder.
- Carry selected product, variant, USD catalog baseline, market/currency, pricing tier, missing-price warnings, FX lock reuse, and override approval thresholds across create, edit, revise, and duplicate quote flows.
- Preserve the visual parity layer completed in PR-NS-07.5.

## Next prompt

PR-NS-08 — Catalog-to-Quote data wiring hardening

### PR-NS-07.6 — Vercel build recovery + redesign reference lock

Status: Completed in this repo pass.

- Fixed the Pipeline board production type failure from the visual parity pass by adding an explicit visual stage group model that exposes the representative `stage` and filtered lane `leads` used by the NorthStar board renderer.
- Preserved the grouped-stage pipeline behavior used to avoid duplicate buyer/supplier lanes.
- Re-locked the four attached redesign HTML files into `/public/reference-html/` for Quotes, Orders, Pipeline, and Catalog so the repo references match the latest uploaded designs.
- Visual/functionality review found remaining parity work is mostly exact interaction/data wiring, not the shell rhythm: Catalog drawer/wizard behavior, Orders document upload state, Pipeline drag/drop persistence, and Quotes version/revise/approval persistence need PR-NS-08+ hardening.

Next active development remains PR-NS-08 — Catalog-to-Quote data wiring hardening.
