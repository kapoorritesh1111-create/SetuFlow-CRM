# Setu Flow CRM

Setu Flow CRM is a trade-focused CRM and execution workspace for import-export teams. It organizes the commercial workflow as one governed operating system:

**Capture → Lead → Product / Category Interest → Quote → Approval (when override policy triggers) → Order / Contract → Execution → Freight / Finance follow-through**

This repo is now updated to show the exact readiness state of each module, the remaining PR stack, and investor-friendly workflow surfaces.

## Current readiness snapshot

| Area | Readiness | Status |
|---|---:|---|
| Overall product readiness | 74% | Demoable, not yet diligence-safe |
| Engineering baseline | 86% | Strong |
| Demo readiness | 81% | Strong |
| Buyer readiness | 76% | Partial |
| Investor readiness | 72% | Partial |
| Pending PRs | 6 | Remaining |

## Module-by-module readiness

| Module | Readiness | State |
|---|---:|---|
| Leads | 88% | Strong |
| Pipeline | 82% | Strong |
| Quotes | 78% | Partial |
| Orders / Contracts | 74% | Partial |
| Dashboard | 80% | Strong |
| Contact Exchange | 83% | Strong |
| Settings / Admin | 85% | Strong |
| Product Management | 87% | Strong |
| Trade Workflow | 76% | Partial |
| AI | 63% | Limited |
| Integrations | 42% | Weak |
| Documentation | 91% | Strong |
| Repo Hygiene | 84% | Strong |

## What the product is

Setu Flow is not a generic contact database. It is a trade workflow system for teams that need to:

- capture buyers and suppliers in one governed workspace
- connect product or category demand to the opportunity
- quote from catalog pricing instead of spreadsheet drift
- preserve pricing discipline when overrides happen
- maintain quote-to-contract continuity
- coordinate execution through documents, compliance, release, dispatch, and completion

## What is strongest today

- buyer and supplier coverage is real enough for meaningful demos
- product, category, and variant structure is commercially useful
- the pricing model is the right one: **base price first, override only with reason and approval**
- contact capture and lead creation flows are differentiated
- documentation and internal truth surfaces are now consistent

## What still blocks full investor confidence

- quote acceptance truth needs reconciliation across product surfaces
- approval-governed pricing proof is not yet surfaced in the strongest possible demo path
- orders/contracts need stronger visible execution proof
- integrations are still architecture-led rather than live-proof-led

## Major workflow

The major workflow shown to non-technical viewers should always be:

1. Capture
2. Lead
3. Product / Category Interest
4. Quote
5. Approval if override occurs
6. Order / Contract
7. Execution
8. Freight / Finance follow-through

See `public/internal-dcc/index.html` for the SVG-led investor-friendly workflow view.

## Module workflows

The DCC now also includes one simplified SVG workflow for each module so a non-technical viewer can understand:

- leads
- pipeline
- quotes
- orders/contracts
- dashboard
- contact exchange
- product management
- trade workflow
- AI
- integrations

## Pending PR stack

| PR | Purpose |
|---|---|
| PR-31 | Golden path, quote acceptance reconciliation, approval proof visibility |
| PR-32 | Live integration proof |
| PR-33 | Buyer journey end-to-end verification |
| PR-34 | AI provider and guardrail completion |
| PR-35 | Security, dependency, bootstrap, and hygiene hardening |
| PR-36 | Investor demo package and executive metrics polish |

## Setup

### Requirements

- Node 22.x
- npm 10.x

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Verify

```bash
npm run typecheck
npm test
npm run verify
```

## Key docs

- `public/internal-dcc/index.html` — main internal truth dashboard
- `docs/WORKFLOW_DIAGRAM.md` — written workflow structure
- `docs/ARCHITECTURE.md` — architecture and trust posture
- `docs/RELEASE_READINESS.md` — current release and proof posture
- `docs/BUYER_DEMO_SCRIPT.md` — guided demo sequence
- `docs/REPO_CLEANUP.md` — delete/archive guidance
- `NEXT_PROMPT.md` — next execution step

## Repo cleanup

Delete now:

- `pr26_update.py`
- `update_batch6.py`

Archive or consolidate:

- `docs/Current Schema.md`
- any stale planning docs that compete with the DCC as the active source of truth
