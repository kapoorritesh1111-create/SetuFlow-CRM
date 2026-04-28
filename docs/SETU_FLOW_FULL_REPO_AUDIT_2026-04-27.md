# SETU Flow CRM Full Repo Audit + Runtime Stabilization

Date: 2026-04-27
Baseline: `SetuFlow-CRM-main Current 427 907p.zip`

## Runtime Error Diagnosis

The supplied browser log shows repeated minified React runtime errors `#425`, `#418`, and `#423`. These are consistent with hydration/text mismatches and client takeover during hydration. The repo-wide review found a global shell mismatch source: `AppShell` rendered current date and absolute browser origin during the server/client render path. Because the app shell wraps nearly every authenticated route, one hydration mismatch in this component can surface as runtime errors across almost all pages.

### Fixes applied

- `src/components/layout/app-shell.tsx`
  - Moved current topbar date calculation to a post-mount `useEffect` state update.
  - Moved `window.location.origin` usage to post-mount state.
  - Made QR, copy link, and mailto share hrefs use the stable mounted origin state.
  - Prevented server-rendered text from differing from the first client render.

- `public/internal-dcc/index.html`
  - Rebuilt the DCC as the current source of truth.
  - Added required tabs: Module readiness + workflow readiness, Reference HTML coverage, PR Change Requirements, Schema Status, Next Prompt.
  - Realigned readiness numbers, blocked PRs, reference coverage, and schema posture.

- `tests/dcc-alignment.test.mjs`
  - Updated DCC assertions to match the new required DCC tabs and runtime stabilization truth.

- `tests/routes-presence.test.mjs`
  - Updated route expectations so Settings no longer appears as a primary route and `/settings/lists` remains a redirect into `/admin?section=markets`.

## Module Gap Analysis

### Page: Dashboard

UI Gaps:
- Dashboard reference coverage is partially complete; the page still needs a focused parity pass after core runtime stabilization.

Workflow Gaps:
- Dashboard functions as leadership support, not a daily operating lane.
- Needs final checks that intervention queues link into the right module deep links.

Data/Supabase Gaps:
- No proven Supabase schema gap.

Runtime Errors:
- Affected by global AppShell hydration mismatch; fixed in shell.

Cross-page Workflow Gaps:
- Dashboard should remain a triage surface that links to Leads, Pipeline, Quotes, and Orders.

Design System Gaps:
- Must stay on 68px sidebar, 56px topbar, one 24px route gutter.

### Page: Leads

UI Gaps:
- Leads reference parity still needs a future polish pass.

Workflow Gaps:
- Quick Lead and lead drawer flow remain central. Need live QA for quick lead links from Catalog quote readiness.

Data/Supabase Gaps:
- No proven Supabase schema gap.

Runtime Errors:
- Affected by global AppShell hydration mismatch; fixed in shell.

Cross-page Workflow Gaps:
- Leads must remain the handoff point from Capture and the source for Quote creation.

Design System Gaps:
- Must avoid duplicate route hero/panels that shift content from the shell grid.

### Page: Catalog / Products

UI Gaps:
- Catalog reference parity is high but CIF is visible/read-only because current APIs do not expose a safe CIF write path.

Workflow Gaps:
- Quote-readiness gating exists; final smoke should verify Quick Lead + autoQuote handoff.

Data/Supabase Gaps:
- No required schema migration proven. Existing pricing tables contain product pricing rules, variants, and currencies.

Runtime Errors:
- Previous TypeScript mismatch in gap states was already corrected to use `pricing_gap`, `bulk_gap`, `review`, and `inactive`.

Cross-page Workflow Gaps:
- Catalog feeds Quotes through quote-readiness, base price, and override reason logic.

Design System Gaps:
- Table and drawer use reference rhythm; continue avoiding route-level duplicate topbars.

### Page: Pipeline

UI Gaps:
- Pipeline parity is high; final QA should confirm detail panel and drag/drop behavior in browser.

Workflow Gaps:
- Stage updates moved into the lead detail panel. Drag/drop remains a fast stage update path.

Data/Supabase Gaps:
- No proven Supabase schema gap.

Runtime Errors:
- Pipeline board is client-rendered with `ssr:false`; global shell hydration patch addresses the repeated route-level runtime symptoms.

Cross-page Workflow Gaps:
- Pipeline is the rescue and risk lane, not a replacement for the Leads workflow.

Design System Gaps:
- Board rhythm is route nav -> filters -> six stats -> kanban.

### Page: Quotes

UI Gaps:
- Quote table, approval queue, detail slide-in, version history, and safe CTAs are restored.
- Full send-provider workflow remains outside visual parity scope.

Workflow Gaps:
- Approval and send CTAs route through governed handoffs instead of unsafe client-only server actions.

Data/Supabase Gaps:
- No required Supabase schema migration proven. The supplied schema includes quotes, quote versions, quote version line items, communications, contracts, and approval fields.

Runtime Errors:
- Route avoids hard crash on recoverable quote query issues by rendering a recoverable data issue state.
- Global AppShell hydration mismatch fixed.

Cross-page Workflow Gaps:
- Quotes connect Leads, Approval & Sending, and Orders.

Design System Gaps:
- Must continue using shared shell stats rhythm and no duplicate route topbar.

### Page: Orders

UI Gaps:
- Orders reference coverage is below Admin/Catalog/Pipeline/Quotes and is queued for PR-NS-05.

Workflow Gaps:
- Needs a full execution parity pass to prove accepted quote -> order -> docs -> dispatch readiness.

Data/Supabase Gaps:
- No proven Supabase schema gap from current review.

Runtime Errors:
- Affected by global AppShell hydration mismatch; fixed in shell.

Cross-page Workflow Gaps:
- Orders must be the execution desk, not just accepted quote state.

Design System Gaps:
- Must maintain shared shell and six-stat rhythm when PR-NS-05 is implemented.

### Page: Admin / Settings

UI Gaps:
- Unified Admin workspace exists with left nav and DCC-aligned sections.

Workflow Gaps:
- Settings is intentionally redirected to `/admin?section=markets`.
- Admin owns governance, reference lists, audit, AI analytics, and security.

Data/Supabase Gaps:
- No proven Supabase schema gap. Current schema includes organizations with `approval_threshold_pct`, invitations, roles, user roles, markets, countries, categories, stages, pipelines, trade events, and audit logs.

Runtime Errors:
- Previous audit type mismatches were corrected in prior buildfixes.

Cross-page Workflow Gaps:
- Governance chips deep-link into Admin sections.

Design System Gaps:
- Admin should keep 220px left nav inside the shared 68px/56px shell.

## Schema Status

No Supabase changes required.

No missing fields, relations, RLS rules, indexes, or migrations were proven by this repo review. The current schema context already supports the reviewed workflows: organizations, approval threshold, invitations, roles, reference lists, pricing rules, quotes, quote versions, communications, contracts, and audit logs.

## Verification Performed

- DCC alignment test: passed.
- Route presence/admin navigation test: passed after updating the expected route contract.
- Syntax transpilation spot-checks passed for:
  - `src/components/layout/app-shell.tsx`
  - `src/app/(app)/quotes/page.tsx`
  - `src/app/(app)/admin/page.tsx`
  - `src/features/products/components/products-table.tsx`

## Verification Not Completed Locally

- Full `npm ci` and `next build` could not be completed in this container because dependency installation did not finish in the available environment. Vercel previously installed dependencies successfully, so this handoff focuses on code/runtime patches and DCC/test realignment.
