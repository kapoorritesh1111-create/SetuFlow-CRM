# Sprint 47 — Setu Guru Experience Redesign

_Last updated: 2026-07-12_

## Release summary

Sprint 47 turns Setu Guru from a primarily route-help assistant into a first-class operating layer across SETU Flow CRM. The release introduces a Trade Growth Command Center, contextual Smart actions, pricing intelligence, supplier and revenue workspaces, direct outreach actions, and a global Growth Center entry while preserving human approval and existing CRM source-of-truth rules.

Release branch: `feature/s47-guru-experience-redesign`  
Merged pull request: `#55`  
Merge commit: `ea596b320ae6707922e19071573e5900b4403606`

## New features and functions

### Growth Center

Route: `/growth-agent`

- Trade Growth Command Center business brief.
- Today work queue with Do First, Revenue, Suppliers, Trade Events, Opportunities, and Completed views.
- Context panel with why-now, business impact, status, next step, and one primary action.
- Revenue workspace for quote follow-up and at-risk commercial actions.
- Supplier workspace with document readiness, RFQ status, compliance, and supplier comparison.
- Research workspace using existing grounded research services.
- Trade Event workspace using existing event and follow-up services.
- Pricing Intelligence workspace with full catalog-pricing and commercial-readiness suggestions.

### Global Growth Center access

- One global Growth Center entry in the authenticated top bar.
- Uses the Setu Guru visual identity.
- Routes directly to `/growth-agent`.
- No duplicate left-rail or floating Growth Center entry.

### Lead Smart actions

- Lead Detail now exposes compact Smart actions instead of a permanent intrusive Guru stack.
- Research, outreach drafting, reply analysis, quote readiness, and supplier RFQ assistance remain available in lead context.
- Buyer and supplier workflows continue to use the existing lead, quote, RFQ, and activity services.

### Outreach Generator

- Generates reviewable outreach drafts.
- Direct WhatsApp action using the stored WhatsApp/phone number.
- Direct email action using the stored email address.
- Copy and Save as draft activity remain available.
- No message is sent automatically.
- Developer-facing grounding details were removed from the customer UI.

### Product and Catalog Pricing Intelligence

Routes:

- `/products`
- `/products?mode=pricing`
- `/growth-agent?workspace=pricing`

Functions:

- Compact pricing-intelligence summary in Catalog/Product pricing view.
- Full recommendation list in Growth Center.
- Detects catalog pricing gaps separately from broader commercial-readiness suggestions.
- Reviews missing EXW/FOB pricing, stale prices, missing MOQ, incomplete market layers, and missing pricing-rule coverage.
- Opens the exact product and variant for the relevant pricing or MOQ action.
- Uses stored SETU Flow pricing evidence only; it does not claim external competitor pricing without verified market data.

### Suggested price-list workflow

- Generates a reviewable market-specific draft price list.
- Uses selected market, current currency, Incoterm, buyer segment, stored product pricing, pricing hierarchy, margins, MOQ, and FX evidence.
- Reuses the existing Price Lists workflow.
- Nothing is activated or shared without user review.

### Dashboard integration

- Compact Setu Guru attention strip on Dashboard.
- Routes users into the Growth Center rather than duplicating full recommendation panels.
- Preserves buyer/supplier workspace filters and existing dashboard KPIs.

### Setu Guru drawer

- Route-aware quick starts and contextual help.
- Single application-shell Setu Guru identity.
- Drawer layout hardened so header, conversation, and composer are separate regions.
- Conversation area owns scrolling; composer remains inside the drawer.

## UX and design changes

- Reduced intrusive Guru surfaces on Lead Detail and Catalog.
- Added compact, action-oriented summaries instead of large recommendation cards where operational work should remain primary.
- Restored SETU Flow navy, teal, and blue contrast in Lead Detail and Quote surfaces.
- Improved light-mode readability, muted-text contrast, focus treatment, and reduced-motion support.
- Removed duplicate Growth Center and Guru entry points.

## Data and service reuse

Sprint 47 does not introduce a competing source of truth. It reuses:

- leads, follow-ups, activities, pipelines, quotes, quote versions, and quote line items;
- suppliers, RFQs, documents, compliance, and existing supplier comparison services;
- products, variants, pricing rule sets, product pricing rules, price lists, price-list items, MOQ, market, country, currency, FX, and margin data;
- trade events and trade-event entries;
- Setu Guru research, help registry, activity, and AI suggestion services.

## Human-control and AI guardrails

- Setu Guru recommendations are assistive.
- No automatic send, approval, price activation, product master overwrite, quote approval, RFQ state change, or compliance state change.
- Market-price suggestions are based on stored SETU Flow evidence and configured margin logic.
- External competitor claims require verified external market data.

## Important implementation files

- `src/features/setu-guru/growth-center.tsx`
- `src/features/setu-guru/growth-center-redesign.tsx`
- `src/features/setu-guru/growth-center-workspaces.tsx`
- `src/features/setu-guru/revenue-workspace.tsx`
- `src/features/setu-guru/global-growth-center-entry.tsx`
- `src/features/setu-guru/lead-guru-tools.tsx`
- `src/features/setu-guru/outreach-generator-panel.tsx`
- `src/features/setu-guru/setu-guru-widget.tsx`
- `src/features/products/components/product-pricing-intelligence.tsx`
- `src/features/products/components/product-pricing-intelligence-panel.tsx`
- `src/features/products/components/product-pricing-deep-link-drawer.tsx`
- `src/features/products/components/suggested-price-list-button.tsx`
- `src/app/api/price-lists/suggested/route.ts`
- `src/components/RightDrawer.tsx`
- `src/app/s47-lead-guru-tuning.css`

## Validation and release evidence

- Feature branch completed successfully on Vercel before merge.
- Pull request `#55` merged to `main`.
- Merge commit: `ea596b320ae6707922e19071573e5900b4403606`.
- Sprint 47 tracker items cover Growth Center, workspaces, dashboard/mobile behavior, UX polish, QA/hardening, and Product Pricing Intelligence.
- Production smoke testing should cover Dashboard, Leads, Growth Center, Catalog pricing view, Suggested Price List, Quotes, Orders, Trade Events, and the Setu Guru drawer.
