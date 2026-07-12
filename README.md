# SETU Flow CRM

SETU Flow CRM is a Next.js CRM for export-led sales teams. It combines lead intake, pipeline management, RFQ/quote workflows, pricing/catalog operations, compliance/document readiness, trade-event capture, mobile field workflows, onboarding, administration, and Setu Guru intelligence in one Supabase-backed workspace.

## Current production baseline

- **Latest release:** Sprint 47 — Setu Guru Experience Redesign
- **Released:** 2026-07-12
- **Production merge:** PR `#55`
- **Merge commit:** `ea596b320ae6707922e19071573e5900b4403606`
- **Documentation package:** `docs/SPRINT_47_SETU_GURU_RELEASE.md`
- **Primary app stack:** Next.js App Router, TypeScript, Tailwind, Supabase, Vercel
- **Supabase project:** `sjzfzloggabsmcuxktnl`

## Sprint 47 — what is new

Sprint 47 makes Setu Guru a first-class operating layer rather than only a route-help assistant.

| Feature | New function |
| --- | --- |
| Growth Center | Trade Growth Command Center at `/growth-agent` with Today, Revenue, Suppliers, Research, Trade Events, Opportunities, and Pricing Intelligence workspaces. |
| Global access | One Growth Center entry in the authenticated top bar using the Setu Guru identity. |
| Lead Smart actions | Compact lead-context tools for research, outreach, reply analysis, quote readiness, and supplier RFQ support. |
| Outreach Generator | Reviewable drafts with direct WhatsApp and email handoff, copy, and Save as draft activity. Nothing sends automatically. |
| Pricing Intelligence | Compact Product/Catalog summary and full Growth Center recommendations for pricing gaps, stale pricing, MOQ, rule coverage, and missing market layers. |
| Suggested price lists | Market-specific, currency-aware draft price-list generation using stored pricing hierarchy, margins, MOQ, Incoterm, buyer segment, and FX evidence. |
| Dashboard | Compact attention strip that routes into Growth Center instead of duplicating large recommendation panels. |
| Setu Guru drawer | Route-aware help with a dedicated scrollable conversation region and fixed composer area. |
| UX polish | Reduced intrusive AI surfaces, stronger Setu Flow navy/teal contrast, light-mode readability, focus states, and reduced-motion support. |

Read the full release package in `docs/SPRINT_47_SETU_GURU_RELEASE.md`.

## Product modules

| Module | Current role |
| --- | --- |
| Dashboard | Leadership view for pipeline health, follow-ups, market/country coverage, operational alerts, and a compact Setu Guru brief. |
| Growth Center | Cross-workspace business intelligence, prioritized actions, supplier/revenue/event/research workspaces, and full Pricing Intelligence. |
| Leads | Buyer/supplier lead management, stage movement, owner assignment, product/market interests, activities, follow-ups, and contextual Smart actions. |
| Pipeline | Stage-based operating surface over the same lead truth. |
| RFQs | Supplier request workflow with line items and fanout/audit support. |
| Quotes | Versioned quote workflow with approval, negotiation, send, and accepted-version continuity. |
| Orders / Contracts | Accepted quote handoff into execution readiness and contract/order state. |
| Products / Catalog | Product, variant, category, import, pricing, compact pricing intelligence, and exact product/variant deep links. |
| Price Lists | Reusable and suggested market/buyer price lists with currency, Incoterm, MOQ, tiers, validity, and review-before-share behavior. |
| Pricing | Catalog pricing SSOT, freight profiles, calculator defaults, pricing hierarchy, market layers, and quote-version line calculation records. |
| Documents / Compliance | Document review, requirement rules, and compliance workflow support. |
| Trade Events | Event setup, field intake, follow-up, and Growth Center event intelligence. |
| Setu Guru | Route-aware help, grounded recommendations, outreach assistance, research, pricing guidance, and approval-bounded draft workflows. |
| Mobile | Phone-first dashboard/leads/capture/quote/notifications/settings plus Share vCard and signed-in identity preservation. |
| Client Onboarding | Public intake, admin notification, and workspace/admin setup flow. |

## Source-of-truth guidance

| Data area | Current SSOT guidance |
| --- | --- |
| Catalog pricing | `pricing_rule_sets` + `product_pricing_rules` are the authoritative pricing model. |
| Legacy prices | `product_prices` is compatibility-only and should not be the primary runtime pricing truth. |
| Quote commercial truth | `quote_versions` + `quote_version_line_items` are the primary versioned quote truth. |
| Communications | `communications` is the Phase 1 SSOT for intro, follow-up, quote, and compliance communication history. |
| AI drafts | `ai_suggestions` is the reviewable AI-assisted draft and operator-decision truth. |
| Trade-show intake | `trade_event_entries` is the SSOT for raw booth/field intake before lead conversion. |
| Public onboarding | `client_onboarding_requests` stores submitted onboarding requests and admin notification state. |

Sprint 47 does not add a competing business-data source of truth. Growth Center and Setu Guru reuse existing organization-scoped services and records.

## AI and commercial-control boundary

Setu Guru is assistive and review-first.

It may:

- summarize governed CRM data;
- prioritize work and explain why attention is needed;
- draft outreach and next-step guidance;
- suggest pricing layers from stored pricing, margin, market, country, currency, MOQ, Incoterm, and FX evidence;
- generate a draft suggested price list for operator review.

It may not:

- send messages automatically;
- activate or share prices automatically;
- invent competitor pricing;
- approve quotes or overrides;
- clear compliance or document blockers;
- advance RFQ, quote, order, or execution state without authorized human action.

See `docs/AI_GUARDRAILS.md`.

## Documentation map

| File | Purpose |
| --- | --- |
| `README.md` | Current product baseline and repository entry point. |
| `CHANGES.md` | Chronological change and release history. |
| `docs/SPRINT_47_SETU_GURU_RELEASE.md` | Complete Sprint 47 feature, UX, data, guardrail, implementation, and validation package. |
| `docs/DOCUMENT_INDEX.md` | Canonical active documentation list. |
| `docs/CURRENT_RELEASE_STATUS.md` | Current release posture, production status, and known follow-ups. |
| `docs/CURRENT_SCHEMA.md` | Live Supabase schema summary and SSOT notes. |
| `docs/ARCHITECTURE.md` | System architecture and route/data-flow guidance. |
| `docs/PRODUCT_OVERVIEW.md` | Product and workspace overview. |
| `docs/MOBILE.md` | Mobile scope, routes, identity, vCard, and field capture notes. |
| `docs/MOBILE_SCAN_PRODUCTION.md` | Production setup for mobile business-card scanning. |
| `docs/CLIENT_ONBOARDING.md` | Public onboarding and admin setup workflow. |
| `docs/OPERATIONS_RUNBOOK.md` | Operator runbook and production checks. |
| `docs/RELEASE_READINESS.md` | Release-gate checklist and hardening work. |
| `docs/RELEASE_PROOF.md` | Proof commands and regression evidence structure. |
| `docs/SECURITY_POLICY.md` | Security expectations. |
| `docs/AI_GUARDRAILS.md` | AI usage, pricing-intelligence, and review boundaries. |
| `docs/UX_RULES.md` | UX consistency, Growth Center, Smart actions, and compact-intelligence rules. |
| `docs/setu-guru/` | Setu Guru knowledge base and research/playbook documentation. |

## Repo structure

```text
src/                  Application routes, features, shared UI, server helpers, and route manifest
docs/                 Active Markdown documentation
scripts/              Verification and production-readiness scripts
tests/                Node smoke/regression tests
supabase/migrations/  Source-controlled SQL migrations and database history
public/                Icons, logos, manifest, static app assets, service worker, and map data
mitigation/            Retained SQL mitigation notes and scripts for DB investigation context
```

## Environment

Use `.env.production.example` as the checklist source. Core variables include:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=
OPENAI_API_KEY=
SETU_GURU_MODEL=
SETU_GURU_LIVE_SEARCH=
SETU_GURU_ALLOW_WRITEBACK=false
SETU_GURU_REQUIRE_ADMIN_APPROVAL=true
OPENAI_CONTACT_SCAN_MODEL=
CONTACT_SCAN_PROVIDER=
CONTACT_SCAN_FALLBACK_PROVIDER=
GOOGLE_CLOUD_VISION_API_KEY=
```

## Local development

```bash
npm install
npm run dev
```

Do not commit local Supabase CLI state from `supabase/.temp/`.

## Verification

```bash
npm test
npm run clean:verification
npm run verify
npm run build
```

Release verification must include Dashboard, Leads, Growth Center, Catalog pricing view, suggested price lists, Quotes, Orders, Trade Events, and the Setu Guru drawer.

## Documentation rule going forward

After every production sprint:

1. Add or update a dedicated release document.
2. Update `README.md`, `CHANGES.md`, `docs/CURRENT_RELEASE_STATUS.md`, `docs/PRODUCT_OVERVIEW.md`, and `docs/DOCUMENT_INDEX.md`.
3. Update `docs/UX_RULES.md` and `docs/AI_GUARDRAILS.md` when interaction or AI behavior changes.
4. Keep schema claims grounded in the live Supabase project.
5. Keep AI outputs draft/review based. No automatic sending, approval, price activation, or customer-facing writeback without operator review.
