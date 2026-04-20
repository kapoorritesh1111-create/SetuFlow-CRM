# Setu Flow CRM

Setu Flow CRM is a trade-focused CRM and execution workspace for import-export teams. It turns fragmented commercial inputs into a controlled operating flow:

**Capture -> Lead -> Quote -> Order**

The current repo baseline includes:
- canonical app routes aligned through `src/lib/routes/manifest.json`
- action-first dashboard workflow
- refactored leads, pipeline, and quotes domains
- explicit trade workflow signals across quotes and orders
- workflow-aware AI scoring
- explicit integrations architecture with mock freight and ERP connectors
- an internal-only Development Command Center at `public/internal-dcc/index.html`

## Product overview

Setu Flow is designed to help trade teams:
- capture buyer and supplier inputs quickly
- qualify and move opportunities through a visible pipeline
- build and revise quotes with stronger commercial context
- convert accepted quotes into execution-ready orders
- track trade readiness, delay risk, and connector posture without losing operational trust

## Architecture map

```text
[Next.js App Shell]
   |
   +-- Dashboard
   +-- Leads
   +-- Pipeline
   +-- Quotes
   +-- Orders
   +-- Admin
   +-- Contact Exchange
   |
   +-- feature ui / logic / server / types boundaries
          |
          +-- trade workflow signals
          +-- AI intelligence scoring
          +-- integrations connector registry
          +-- shared data/query utilities
                |
                +-- Supabase / DB
```

A more detailed product-facing architecture reference lives in:
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_DIAGRAM.md`

## Route map

The canonical route source of truth is:
- `src/lib/routes/manifest.json`

Primary shipped app routes:
- `/dashboard`
- `/leads`
- `/pipeline`
- `/quotes`
- `/orders`
- `/admin/users`
- `/contact-exchange/scan`
- `/contact-exchange/vcard`

Internal-only route:
- `/internal-dcc/`

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

### Build

```bash
npm run build
```

### Full verification

```bash
npm run verify
```

## Deploy

This repo is configured as a Next.js application.

Typical deployment flow:
1. install dependencies
2. run `npm run verify`
3. deploy the built application to the target environment
4. confirm canonical routes and key product surfaces
5. verify the internal DCC still matches the repo after release changes

## Production vs internal-only rules

### Production surfaces
Production routes and shell truth must stay aligned to `src/lib/routes/manifest.json`.

### Internal-only surfaces
The Development Command Center is internal-only:
- `public/internal-dcc/index.html`

It is the planning and readiness source of truth, but it does **not** replace product-facing documentation.

### Non-negotiable rules
- Do not reintroduce `/development`, `/workspace`, `/previews`, or `/planning` surfaces into the shipped app.
- Keep shell navigation, tests, and contracts aligned with the manifest.
- Refresh the DCC after every repo-changing pass.
- Keep product-facing docs customer-safe and implementation-honest.

## Demo and release materials

- Buyer demo script: `docs/BUYER_DEMO_SCRIPT.md`
- Trade-show script: `docs/TRADE_SHOW_SCRIPT.md`
- Workflow diagram: `docs/WORKFLOW_DIAGRAM.md`
- Architecture diagram: `docs/ARCHITECTURE_DIAGRAM.md`
- Release checklist: `docs/RELEASE_READINESS.md`

## Internal planning note

For internal readiness tracking, PR progress, risk, blockers, and engineering summaries, use:
- `public/internal-dcc/index.html`
