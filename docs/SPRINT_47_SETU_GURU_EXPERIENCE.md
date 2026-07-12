# Sprint 47 — Setu Guru Experience Redesign

_Last updated: 2026-07-12_

## Release summary

Sprint 47 turns Setu Guru from a mostly contextual help drawer into a broader trade-growth operating layer across SETU Flow CRM. The release adds a dedicated Growth Center, business-priority workspaces, smarter lead actions, pricing intelligence, suggested price-list generation, global navigation, and final UX/accessibility hardening.

The release was merged to `main` through PR #55.

- Feature branch: `feature/s47-guru-experience-redesign`
- Merge commit: `ea596b320ae6707922e19071573e5900b4403606`
- Final feature commit before merge: `1d0e51c4600b93626e9e632b6801a90e7bbb2563`
- Vercel preview validation: passed
- Production runtime error check at release: no current runtime errors reported

## New user-facing features

### 1. Growth Center

Route: `/growth-agent`

The Growth Center is the central Setu Guru operating workspace for trade-growth actions. It is available from a single global top-bar entry and organizes attention into business outcomes instead of generic AI prompts.

Core areas:

- Today / Do First
- Revenue
- Suppliers
- Trade Events
- Opportunities / Research
- Completed
- Pricing Intelligence

Each work item shows:

- the related business record
- why it needs attention
- value or business impact
- current status
- one primary next action

### 2. Business Brief and priority queue

The Growth Center opens with a compact executive summary of:

- actions at risk
- revenue actions
- completed work
- new opportunities

The queue is filterable by outcome and keeps the right-side context panel synchronized with the selected record.

### 3. Revenue workspace

The Revenue workspace provides a portfolio view of quote follow-up activity and commercial risk.

It replaces the earlier one-record-at-a-time design and avoids invalid lead lookups that previously caused “Lead not found” errors.

Capabilities include:

- quote follow-up prioritization
- days since sent
- status and buyer context
- value / impact
- one next action
- direct navigation to the relevant quote or lead

### 4. Supplier workspace

The Supplier workspace adds a comparison and attention view using existing supplier, RFQ, document, and compliance data.

It includes:

- supplier readiness comparison
- document completeness
- RFQ response/open counts
- RFQ attention queue
- compliance status
- direct navigation to supplier or RFQ records

No supplier pricing or lead-time information is invented when it is not stored.

### 5. Research and opportunity workspace

The Research workspace reuses the existing ICP, Opportunity Finder, and grounded entity-research services.

It adds:

- evidence-based opportunity matching
- buyer/supplier fit context
- source-aware signals
- missing-information visibility
- one next action

The workspace stays operational and record-focused rather than presenting as a general chatbot.

### 6. Trade Event workspace

The Trade Event workspace reuses existing trade-event and Sprint 46 assistant services.

It provides:

- event summaries
- pre-show and post-show attention
- event follow-up priorities
- links to the relevant Trade Event Assistant
- organization-scoped event context

### 7. Lead Detail smart actions

Lead Detail now uses a compact Smart Actions entry instead of multiple competing Setu Guru surfaces.

Available tools include:

- research
- outreach generation
- reply analysis
- quote readiness
- supplier RFQ assistance where applicable

The outreach generator now supports:

- direct WhatsApp handoff
- direct email handoff
- copy draft
- save as draft activity

Nothing is sent automatically.

### 8. Product and Catalog Pricing Intelligence

Pricing Intelligence is available in two modes:

- Catalog / Product Pricing view: compact summary with prioritized suggestions
- Growth Center: full pricing-intelligence workspace with all suggestions

The intelligence layer reviews stored SETU Flow data for:

- missing EXW / FOB pricing
- missing pricing rule sets
- stale prices
- missing MOQ
- missing CIF / DDP / distributor / retail layers
- market-layer readiness
- discount and margin context
- price-list readiness

Pricing gaps use the same definition as the Catalog KPI. MOQ, stale prices, and missing market layers remain separate commercial-readiness suggestions and do not inflate the pricing-gap count.

### 9. Suggested market price lists

Setu Guru can now generate a draft suggested price-list workflow grounded in stored data.

The user chooses:

- market
- current currency
- Incoterm
- buyer segment

The system then prepares a reviewable draft using available:

- EXW, FOB, CIF, or DDP pricing
- pricing hierarchy and margin rules
- saved FX assumptions
- MOQ
- product and variant information
- distributor / retail layers

The result remains a draft until the user reviews and saves it. Setu Guru does not claim external competitor pricing unless verified market data is stored.

### 10. Global Growth Center navigation

A single Growth Center action is available in the authenticated top bar.

The implementation removes duplicate top-bar and left-rail entries and keeps the App Shell as the single owner of the global destination.

### 11. Setu Guru drawer and layout hardening

The Setu Guru drawer was reworked to keep the conversation usable inside the viewport.

The intended layout contract is:

1. fixed header
2. scrollable conversation area
3. fixed composer/footer

The implementation removes viewport-height minimums from the widget and constrains the conversation area with `min-height: 0` and explicit overflow ownership.

### 12. Light-mode and brand polish

Final UI corrections include:

- stronger navy text in light mode
- readable quote and lead headers
- Setu Flow navy/teal/blue brand treatment
- reduced-opacity text removal where it harmed contrast
- focus-visible states
- reduced-motion support
- compact premium surfaces instead of large intrusive Guru cards

## Important behavior and guardrails

- Setu Guru is assistive, not autonomous.
- No email, WhatsApp message, price, approval, quote, compliance state, or price list is sent or activated automatically.
- Pricing suggestions are grounded in stored SETU Flow pricing, margin, market, country, and currency data.
- External competitor pricing must not be claimed without verified source data.
- Organization-scoped data and existing RLS/service boundaries remain authoritative.
- Existing quote, RFQ, supplier, trade-event, pricing, and communication services are reused rather than duplicated.

## Main implementation files

### Growth Center

- `src/app/(app)/growth-agent/page.tsx`
- `src/features/setu-guru/growth-center.tsx`
- `src/features/setu-guru/growth-center-redesign.tsx`
- `src/features/setu-guru/growth-center-workspaces.tsx`
- `src/features/setu-guru/revenue-workspace.tsx`

### Global navigation and Setu Guru

- `src/app/(app)/layout.tsx`
- `src/features/setu-guru/global-growth-center-entry.tsx`
- `src/features/setu-guru/setu-guru-widget.tsx`
- `src/features/setu-guru/setu-guru-dashboard-strip.tsx`
- `src/features/setu-guru/setu-guru-dashboard-popover.tsx`
- `src/components/RightDrawer.tsx`
- `src/app/s47-lead-guru-tuning.css`

### Lead actions

- `src/app/(app)/leads/[leadId]/page.tsx`
- `src/features/setu-guru/lead-guru-tools.tsx`
- `src/features/setu-guru/outreach-generator-panel.tsx`

### Pricing Intelligence

- `src/app/(app)/products/page.tsx`
- `src/app/api/price-lists/suggested/route.ts`
- `src/features/products/components/product-pricing-intelligence.tsx`
- `src/features/products/components/product-pricing-intelligence-panel.tsx`
- `src/features/products/components/product-pricing-deep-link-drawer.tsx`
- `src/features/products/components/suggested-price-list-button.tsx`

### UI polish

- `src/components/shell/s47-final-ui-polish.tsx`

## Validation and release evidence

- Sprint 47 feature branch was 74 commits ahead of `main` before merge.
- Final preview commit passed Vercel checks.
- PR #55 merged successfully into `main`.
- Production merge commit: `ea596b320ae6707922e19071573e5900b4403606`.
- Runtime-error check performed at release reported no active errors.
- User completed manual review across Dashboard, Leads, Growth Center, Catalog, Product Pricing, Quote Builder, Orders, Trade Events, and Setu Guru drawer behavior.

## Follow-up guidance

Future improvements should extend, not duplicate, this model:

- add verified external trade-event discovery with source citations
- add external market-price evidence only through verified sources
- improve buyer-specific price-plan recommendations when more buyer-plan data exists
- keep Growth Center as the central action workspace
- keep contextual Setu Guru drawer help lightweight and route-aware
- preserve one global Growth Center entry and one Setu Guru identity
