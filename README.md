# Setu Flow CRM

Setu Flow CRM is a trade-focused CRM and execution workspace for import-export teams. It is designed to move commercial work through one governed operating flow:

**Capture → Lead → Product / Category Interest → Quote → Approval (when override policy triggers) → Contract / Order → Execution → Freight / Finance follow-through**

This repository now reflects the **actual repo state plus the live Supabase demo data posture** rather than an assumed “complete” investor story.

## What the product is

Setu Flow is not a generic contact manager. It is a trade workflow system for teams that need to:

- capture buyer and supplier demand in one place
- keep product/category interest attached to the opportunity
- generate quotes from catalog pricing instead of spreadsheet drift
- preserve pricing discipline when overrides happen
- convert commercial truth into contracts/orders with auditable continuity
- run document, compliance, release, dispatch, and completion work from one governed workspace

## Who it is for

Setu Flow is for:

- import-export operators
- trade sales teams
- buyer development teams
- supplier sourcing teams
- founders or commercial leads running food ingredient / packaged product export workflows

## Why it exists

Most trade teams still split work across WhatsApp, email, spreadsheets, PDFs, and memory. Setu Flow exists to reduce hidden handoffs and keep commercial truth visible as work moves from early lead management into quoting and execution.

## Live demo data snapshot

The uploaded live dataset currently proves the following:

- **35 buyers**
- **10 suppliers**
- **21 products**
- **31 variants**
- **8 quotes**
- **3 contracts**
- **7 documents**
- **0 integrations configured** fileciteturn3file0

The pricing configuration also shows that quote overrides are intended to remain governed:

- `require_approval_for_override = true`
- `approval_threshold_percent = 5`
- default validity = 7 days
- default display currency = USD fileciteturn3file11

## What the live data proves well

The current live data is strong enough for a structured buyer/investor demo in these areas:

- buyer and supplier coverage is real, not placeholder-scale
- product and variant coverage is meaningful enough for product/category selling
- quote creation is being used in the workspace
- contract/order continuity exists at least partially
- catalog-backed price continuity shows up in some contract line snapshots fileciteturn3file6turn3file15

## What the live data still does **not** prove cleanly

The repo and data are **not yet at a “claim everything is complete” posture**.

Current gaps visible in the uploaded data:

- top-level quote summary still shows **0 accepted quotes** even though quote negotiation events show multiple `accepted` events for specific quotes fileciteturn3file0turn3file1
- the current quotes shown in the export still surface `approval_required = false` at quote level despite policy configuration saying override approval is required when triggered fileciteturn3file0turn3file11
- contracts exist, but the visible examples remain in `execution_state = draft` with `approval_state = not_required` fileciteturn3file3turn3file12
- some contract line items carry continuity snapshots and source quote line IDs, while others are still sparse and look backfilled from seeded lead coverage rather than a full governed conversion chain fileciteturn3file6turn3file9turn3file14
- integrations are not yet configured in the live dataset, so buyer/investor claims about integrations must stay narrow and honest fileciteturn3file0

## Core workflow

### 1. Capture
Entry can start from:

- trade-show capture
- website inbound
- referral
- quote backfill
- manual entry
- contact exchange flows

### 2. Lead
Leads store:

- buyer vs supplier mode
- company/contact identity
- market and country context
- pipeline stage
- next step
- source provenance
- commercial notes and needs

### 3. Product / Category Interest
The product model and lead interest model support a more trade-relevant workflow than a generic CRM:

- category-level need discovery
- confirmed product linkage where known
- downstream quote relevance

### 4. Quote
Quotes are the commercial control point.

Required product rule:

1. products carry catalog/base pricing
2. quote lines may override price only in governed conditions
3. override reason must exist
4. approval logic must not be weakened

### 5. Contract / Order
Accepted or converted commercial posture should move into contracts/orders while preserving:

- source quote linkage
- line continuity
- currency and pricing basis
- override visibility where applicable

### 6. Execution
Execution should become operationally visible across:

- documents
- compliance
- release readiness
- dispatch
- completion

## Architecture overview

Repo structure:

- `src/app/` — route entry points and app shell
- `src/features/` — domain workspaces and feature logic
- `src/components/` — shared UI
- `src/lib/` — contracts, workflow utilities, pricing logic, approval helpers, execution logic
- `public/internal-dcc/index.html` — internal truth dashboard
- `docs/` — product, workflow, release, demo, SOP, and cleanup docs

Key architecture principle:

> The internal DCC is the planning and readiness truth surface, but product claims must stay aligned to actual data and executable repo behavior.

## Main product surfaces

Primary shipped routes:

- `/dashboard`
- `/leads`
- `/pipeline`
- `/quotes`
- `/orders`
- `/admin/users`
- `/contact-exchange/scan`
- `/contact-exchange/vcard`

Supporting workspaces:

- `/contracts`
- `/documents`
- `/compliance`
- `/integrations`
- `/ai-suggestions`
- `/products`

Internal-only truth surface:

- `public/internal-dcc/index.html`

## AI capabilities

The repo has bounded AI positioning, not a fully proven autonomous AI product story.

The right claim today is:

- AI assists review and next-action visibility
- AI should remain operator-reviewed
- AI must not bypass approval, compliance, or execution controls

Do **not** sell the AI layer as autonomous decision-making.

## Integrations

The architecture includes integration lanes, but the uploaded live data currently shows **0 integrations configured**. Any investor or buyer demo must present integrations as an extensibility direction or controlled architecture surface, not as already-proven live production breadth. fileciteturn3file0

## Demo instructions

Recommended demo posture:

1. start in the dashboard
2. open one buyer lead with clear product needs
3. show product/category linkage
4. open the related quote
5. explain catalog pricing and override policy
6. show continuity into contract/order where present
7. close on execution visibility and governance

Use:

- `docs/BUYER_DEMO_SCRIPT.md`
- `docs/WORKFLOW_DIAGRAM.md`
- `docs/DEMO_DATA_AUDIT.md`

## Setup

### Requirements

- Node `22.x`
- npm `10.x`

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Typecheck

```bash
npm run typecheck
```

### Test

```bash
npm test
```

### Full verification

```bash
npm run verify
```

## Limitations

Current limitations that should be stated plainly:

- quote acceptance truth is not fully reconciled between top-level quote counts and negotiation events
- approval proof is configured at policy level, but live demo data does not yet show a clean approval-required example at quote level
- contract execution is present but still visually draft-heavy
- integrations are architected but not yet evidenced in live configured form
- some seeded continuity appears strong while some still looks partial/backfilled

## Current readiness posture

- **Engineering baseline:** strong
- **Demo readiness:** good, but requires curation
- **Buyer readiness:** promising, but not yet frictionless
- **Investor readiness:** credible, but not yet fully diligence-safe

## Documents to use now

- `public/internal-dcc/index.html` — internal source of truth
- `docs/WORKFLOW_DIAGRAM.md` — commercial workflow
- `docs/ARCHITECTURE.md` — repo and workflow architecture
- `docs/RELEASE_READINESS.md` — current release/readiness posture
- `docs/BUYER_DEMO_SCRIPT.md` — buyer/investor walkthrough
- `docs/DEMO_DATA_AUDIT.md` — live data audit from Supabase export
- `docs/REPO_CLEANUP.md` — recommended cleanup actions
- `NEXT_PROMPT.md` — next focused build pass
