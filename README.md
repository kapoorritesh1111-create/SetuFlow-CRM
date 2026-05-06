# SETU Flow CRM

SETU Flow CRM is a Next.js CRM for export-led sales teams. It combines lead intake, pipeline management, RFQ/quote workflows, pricing/catalog operations, compliance/document readiness, trade-event capture, mobile field workflows, onboarding, and admin setup into one Supabase-backed workspace.

## Current baseline

- **Cleanup pass:** 2026-05-05
- **Working package:** `SetuFlow-CRM-Current 55.zip`
- **Primary app stack:** Next.js App Router, TypeScript, Tailwind, Supabase, Vercel
- **Database reviewed before this README update:** live Supabase project `SETU Flow CRM` (`sjzfzloggabsmcuxktnl`), status `ACTIVE_HEALTHY`, region `us-west-2`, Postgres `17.6.1.063`
- **Reference HTML status:** paused and removed from the active repo package for now. Product truth now lives in React source, tests, and Markdown docs.

## What this cleanup pass changed

The active repo has been consolidated around source-controlled app code and Markdown documentation.

| Area | Cleanup result |
| --- | --- |
| Reference HTMLs | Removed `public/reference-html/`, `public/internal-dcc/`, and `public/setuflow-architecture.html`. |
| Local Supabase state | Removed `supabase/.temp/` so local CLI/project metadata is not shipped in repo packages. |
| One-off patch scripts | Removed root patch scripts that were no longer part of the active development workflow. |
| Mobile docs | Consolidated root `MOBILE_README.md` into `docs/MOBILE.md`. |
| Scan production docs | Moved root `MOBILE_SCAN_PRODUCTION.md` into `docs/MOBILE_SCAN_PRODUCTION.md`. |
| Tests | Updated smoke tests so they protect the no-reference-HTML cleanup policy instead of requiring deleted handoff pages. |
| README/docs | Rebuilt the documentation map around the live Supabase schema review and current repo structure. |

## Product modules

| Module | Current role |
| --- | --- |
| Dashboard | Leadership view for pipeline health, follow-ups, market/country coverage, and operational alerts. |
| Leads | Buyer/supplier lead management, stage movement, owner assignment, product/market interests, activities, and follow-ups. |
| Pipeline | Stage-based operating surface over the same lead truth. |
| RFQs | Supplier request workflow with line items and fanout/audit support. |
| Quotes | Versioned quote workflow with approval, negotiation, send, and accepted-version continuity. |
| Orders / Contracts | Accepted quote handoff into execution readiness and contract/order state. |
| Products / Catalog | Product, variant, pricing, category, and import surfaces. |
| Pricing | Catalog pricing SSOT, freight profiles, calculator defaults, and quote-version line calculation records. |
| Documents / Compliance | Document review, requirement rules, and compliance workflow support. |
| Trade Events | Event setup and raw booth/field intake before qualification/conversion. |
| AI Assist | Reviewable AI draft/suggestion workflow. AI does not auto-send. |
| Mobile | Phone-first dashboard/leads/capture/quote/notifications/settings plus Share vCard and signed-in identity preservation. |
| Client Onboarding | Public intake, admin notification, and workspace/admin setup flow. |

## Live Supabase review summary

The README was updated after reviewing the live Supabase project, not just the checked-in files.

### Project

| Item | Value |
| --- | --- |
| Project | `SETU Flow CRM` |
| Ref | `sjzfzloggabsmcuxktnl` |
| Status | `ACTIVE_HEALTHY` |
| Region | `us-west-2` |
| Postgres | `17.6.1.063` |
| Applied migration reported by Supabase | `20260504022303_fix_client_onboarding_notification_columns` |

### Schema shape

The live database currently exposes a broad public schema with tables covering:

- organization/profile/membership/role permissions
- lead, pipeline, follow-up, product-interest, market, activity, and audit flows
- RFQ, quote, quote version, quote line, negotiation, contract, and order/execution continuity
- product, variant, category, pricing rule, pricing engine, freight, and calculator defaults
- documents, requirement rules, compliance, communication history, AI suggestions, trade events, onboarding requests, imports/staging, and saved view preferences

Important source-of-truth guidance from the live schema:

| Data area | Current SSOT guidance |
| --- | --- |
| Catalog pricing | `pricing_rule_sets` + `product_pricing_rules` are the authoritative pricing model. |
| Legacy prices | `product_prices` is compatibility-only and should not be the primary runtime pricing truth. |
| Quote commercial truth | `quote_versions` + `quote_version_line_items` are the primary versioned quote truth. |
| Legacy quote/RFQ/contract lines | `quote_line_items`, `rfq_line_items`, and `contract_line_items` remain compatibility tables. |
| Communications | `communications` is the Phase 1 SSOT for intro, follow-up, quote, and compliance communication history. |
| AI drafts | `ai_suggestions` is the Phase 4 SSOT for reviewable AI-assisted drafts and operator decisions. |
| Trade-show intake | `trade_event_entries` is the SSOT for raw booth/field intake before lead conversion. |
| Public onboarding | `client_onboarding_requests` stores submitted onboarding requests and admin notification state. |

### Supabase advisor follow-ups

No database DDL was changed in this cleanup pass. The live advisor review shows follow-up work remains:

- Several RLS-enabled tables have no policies yet.
- `active_product_pricing_rules_v` is flagged as a security-definer view.
- Multiple functions need explicit immutable search paths.
- Multiple `SECURITY DEFINER` RPCs are executable by `anon` and/or `authenticated` roles and should be reviewed deliberately before release hardening.
- Leaked password protection is currently disabled in Auth.

Treat these as security/backlog items for a dedicated database-hardening migration, not as README-only work.

## Documentation map

| File | Purpose |
| --- | --- |
| `README.md` | Main consolidated repo handoff and runbook entry point. |
| `CHANGES.md` | Change history and cleanup notes. |
| `docs/DOCUMENT_INDEX.md` | Canonical active documentation list. |
| `docs/CURRENT_RELEASE_STATUS.md` | Current release posture, readiness, and known follow-ups. |
| `docs/CURRENT_SCHEMA.md` | Live Supabase schema summary and SSOT notes. |
| `docs/ARCHITECTURE.md` | System architecture and route/data-flow guidance. |
| `docs/PRODUCT_OVERVIEW.md` | Product/module overview. |
| `docs/MOBILE.md` | Mobile app scope, routes, identity, vCard, and field capture notes. |
| `docs/MOBILE_SCAN_PRODUCTION.md` | Production setup for mobile business-card scanning. |
| `docs/CLIENT_ONBOARDING.md` | Public onboarding and admin setup workflow. |
| `docs/OPERATIONS_RUNBOOK.md` | Operator runbook and production checks. |
| `docs/RELEASE_READINESS.md` | Release gate status and outstanding hardening work. |
| `docs/RELEASE_PROOF.md` | Proof commands and regression evidence structure. |
| `docs/SECURITY_POLICY.md` | Security expectations. |
| `docs/AI_GUARDRAILS.md` | AI usage and review boundaries. |
| `docs/UX_RULES.md` | UX consistency rules. |
| `mitigation/README.md` | Legacy SQL mitigation package notes retained for database investigation context. |

## Repo structure

```text
src/                  Application routes, features, shared UI, server helpers, and route manifest
docs/                 Active Markdown documentation
scripts/              Verification and production-readiness scripts
tests/                Node smoke/regression tests
supabase/migrations/  Source-controlled SQL migrations and database history
public/               Icons, logos, manifest, static app assets, service worker, and map data
mitigation/           Retained SQL mitigation notes and scripts for DB investigation context
```

Reference HTML handoff folders are intentionally absent from the active structure.

## Environment

Use `.env.production.example` as the checklist source. Core variables include:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=
CONTACT_SCAN_PROVIDER=
CONTACT_SCAN_FALLBACK_PROVIDER=
GOOGLE_CLOUD_VISION_API_KEY=
```

See `docs/MOBILE_SCAN_PRODUCTION.md` for the mobile scan provider matrix and readiness endpoint.

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

Notes:

- `npm test` runs checked-in Node smoke tests.
- `npm run verify` is the release-proof wrapper and should remain the pre-build gate.
- `npm run build` should be run in a normal development/CI environment with dependencies installed.

## Cleanup policy going forward

- Keep source truth in React/TypeScript, Supabase migrations, tests, and Markdown docs.
- Do not reintroduce static reference HTMLs unless a future sprint explicitly restores them as generated artifacts.
- Keep `README.md`, `docs/DOCUMENT_INDEX.md`, `docs/CURRENT_RELEASE_STATUS.md`, and `docs/CURRENT_SCHEMA.md` aligned after every major repo or Supabase change.
- Review live Supabase before claiming schema/readiness status in README.
- Keep AI outputs draft/review based. No automatic sending, approval, or customer-facing action without operator review.
