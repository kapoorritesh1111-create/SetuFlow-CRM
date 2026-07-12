# Sprint 47 — Setu Guru Experience Redesign

_Released to `main`: 2026-07-12_

## Release summary

Sprint 47 turns Setu Guru from a scattered helper into a connected operating layer across SETU Flow CRM. The release introduces a first-class Growth Center, contextual workspaces for revenue and supplier operations, route-aware smart actions, product pricing intelligence, suggested price-list generation, and a more consistent global Guru experience.

The release was merged through PR #55 from `feature/s47-guru-experience-redesign` into `main`.

- Merge commit: `ea596b320ae6707922e19071573e5900b4403606`
- Final feature-branch commit before merge: `1d0e51c4600b93626e9e632b6801a90e7bbb2563`
- Vercel preview checks: passed
- Runtime error review before release: no active runtime error clusters found

## New features and functions

### 1. Trade Growth Command Center

Route: `/growth-agent`

The Growth Center is now a dedicated business workspace rather than a generic assistant page. It provides:

- Today work queue
- Revenue actions
- Supplier readiness and RFQ attention
- Trade-event follow-up
- Opportunity and research context
- Completed work review
- Pricing Intelligence workspace
- Executive business brief and action-at-risk counts
- One clear primary action per recommendation

### 2. Global Growth Center access

A Growth Center entry is available from the authenticated application shell so users can move from any operating workspace into Setu Guru's command center.

The implementation avoids duplicate floating Guru launchers and keeps the contextual Setu Guru drawer separate from the Growth Center destination.

### 3. Revenue workspace

The Revenue workspace provides a portfolio-level quote follow-up queue with:

- Quote status and age
- Buyer and lead context
- Revenue impact
- Follow-up urgency
- Direct route into the relevant quote or lead

Invalid quote-to-lead lookups that previously produced `Lead not found` states were removed.

### 4. Supplier workspace

The Supplier workspace now shows:

- Supplier verification readiness
- Document completion
- RFQ response and open counts
- Composite supplier fit/readiness
- Compliance status
- Overdue RFQ actions

The workspace reuses existing supplier, RFQ, and compliance services rather than creating a parallel data model.

### 5. Research and opportunity support

Setu Guru now reuses the existing ICP, Opportunity Finder, and grounded research services to provide:

- Opportunity matching
- Fit context
- Missing-information visibility
- Source-aware research signals
- Direct next actions

Research remains review-first and does not write to product, pricing, or compliance records automatically.

### 6. Lead Smart Actions

Lead Detail now exposes compact Smart Actions instead of a permanent stack of Setu Guru controls.

Available actions include:

- Research
- Draft outreach
- Analyze reply
- Quote readiness
- Supplier RFQ assistance

The outreach generator supports:

- Email draft generation
- WhatsApp draft generation
- Copy action
- Direct `mailto:` handoff
- Direct `wa.me` handoff
- Save as draft activity

Nothing is sent automatically.

### 7. Product and Catalog Pricing Intelligence

Routes:

- `/products?mode=pricing`
- `/growth-agent?workspace=pricing`

Pricing Intelligence uses existing product and pricing data to identify:

- Catalog pricing gaps
- Missing EXW or FOB coverage
- Missing CIF, DDP, distributor, or retail layers
- Missing MOQ
- Stale prices
- Missing pricing rule coverage
- Missing market-layer references
- Discount-readiness risk

Catalog keeps the intelligence summary compact. Growth Center shows the full recommendation set.

Recommendations link to the affected product and variant where possible.

### 8. Suggested market price lists

Setu Guru can now prepare a suggested price-list workflow using stored SETU Flow data.

Inputs include:

- Market
- Currency
- Incoterm
- Buyer segment
- Existing EXW, FOB, CIF, or DDP pricing
- Stored margin or markup rules
- MOQ and lead time
- Saved FX context

The output is a reviewable draft. SETU Flow does not activate or share the list automatically.

Setu Guru does not claim external competitor pricing unless verified external market data has been stored.

### 9. Setu Guru drawer and UI hardening

The release includes:

- Route-aware drawer help
- Fixed Guru identity and global entry behavior
- Improved light-mode readability on Lead Detail and Quote Builder
- Reduced duplicate Guru surfaces
- Drawer layout hardening
- Internal conversation scroll ownership
- Responsive and reduced-motion support

### 10. Dashboard integration

The Dashboard now includes a compact Setu Guru business brief that shows the current attention count and routes users into the Growth Center without turning the Dashboard into a second recommendation center.

## Data and service reuse

Sprint 47 intentionally reuses existing SETU Flow services and source-of-truth tables, including:

- Leads and follow-ups
- Quotes and quote versions
- Supplier and RFQ services
- Compliance and documents
- Product variants
- Pricing rule sets and product pricing rules
- Price lists and price-list items
- Communications
- AI suggestions and activity history
- Trade events

No replacement pricing or recommendation database was introduced.

## AI and operator-control rules

- Setu Guru recommendations are assistive.
- No outreach is sent automatically.
- No price is changed automatically.
- No suggested price list is activated automatically.
- No supplier, compliance, or quote state is approved automatically.
- Users must review and confirm commercial actions.
- Suggested pricing must be grounded in stored SETU Flow data.

## Key implementation files

### Growth Center

- `src/app/(app)/growth-agent/page.tsx`
- `src/features/setu-guru/growth-center.tsx`
- `src/features/setu-guru/growth-center-redesign.tsx`
- `src/features/setu-guru/growth-center-workspaces.tsx`
- `src/features/setu-guru/revenue-workspace.tsx`

### Global Setu Guru experience

- `src/features/setu-guru/setu-guru-widget.tsx`
- `src/features/setu-guru/global-growth-center-entry.tsx`
- `src/features/setu-guru/setu-guru-dashboard-strip.tsx`
- `src/features/setu-guru/setu-guru-dashboard-popover.tsx`
- `src/components/RightDrawer.tsx`
- `src/app/s47-lead-guru-tuning.css`

### Lead Smart Actions

- `src/features/setu-guru/lead-guru-tools.tsx`
- `src/features/setu-guru/outreach-generator-panel.tsx`
- `src/app/(app)/leads/[leadId]/page.tsx`

### Pricing Intelligence

- `src/app/(app)/products/page.tsx`
- `src/features/products/components/product-pricing-intelligence.tsx`
- `src/features/products/components/product-pricing-intelligence-panel.tsx`
- `src/features/products/components/product-pricing-deep-link-drawer.tsx`
- `src/features/products/components/suggested-price-list-button.tsx`
- `src/app/api/price-lists/suggested/route.ts`

## Validation and release evidence

- Sprint 47 recommendation regression tests passed in the final feature branch build.
- Vercel preview checks passed for the release head.
- The release branch was 74 commits ahead of `main` before merge.
- PR #55 merged successfully into `main`.
- Production deployment is expected to follow the repository's normal Vercel deployment flow from `main`.

## Known product boundaries

- Trade-event discovery from live public web sources is not yet a dedicated research mode.
- External competitor-price intelligence is not claimed without verified data.
- Suggested pricing is only as complete as the stored cost, FX, freight, margin, market, country, and price-list data.
- Database security-advisor follow-ups remain separate hardening work.

## Tracker mapping

Sprint tracker references:

- `S47-GURU-001` through `S47-GURU-011`

The tracker should contain the issue-level implementation notes, affected files, QA evidence, and resolution rationale. This document is the consolidated release-level product and engineering summary.