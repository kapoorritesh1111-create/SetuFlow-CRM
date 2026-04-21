# Setu Flow Architecture

## Architecture posture

Setu Flow is a trade workflow application built on a Next.js + Supabase stack. The architecture is strongest when understood as a **governed commercial-to-execution system**, not as a generic CRM shell.

## Repo structure

- `src/app/` — route entry points and shell composition
- `src/features/` — domain workspaces and feature-owned UI / actions
- `src/components/` — shared UI building blocks
- `src/lib/` — workflow rules, pricing logic, approvals, execution, analytics, and repo contracts
- `src/types/` — generated and hand-authored data contracts
- `public/` — public assets and internal DCC
- `docs/` — readiness, workflow, architecture, runbooks, demo materials, and cleanup docs

## Core architecture thesis

The most valuable architectural idea in Setu Flow is this:

> commercial truth should not disappear when work moves from lead management into quoting and then into contracts/orders and execution.

That principle shows up in:

- approval routing
- catalog pricing logic
- quote workflow logic
- contract lock logic
- order execution logic
- document/compliance requirements

## What the live data confirms

The uploaded Supabase export confirms that the repo is not empty or hypothetical. It has live operating data across:

- buyers and suppliers
- product catalog and variants
- quotes and contracts
- documents
- pricing settings

Specifically:

- 35 buyers
- 10 suppliers
- 21 products
- 31 variants
- 8 quotes
- 3 contracts
- 7 documents fileciteturn3file0

## What the architecture supports correctly

### 1. Trade-native opportunity handling
The lead model supports real buyer/supplier context, not just generic CRM contacts.

### 2. Catalog-aware quoting
The product and pricing model is capable of treating catalog/base pricing as the starting point.

### 3. Override governance
Pricing policy currently shows `require_approval_for_override = true` with a 5% threshold. That is the correct commercial direction and must remain intact. fileciteturn3file11

### 4. Downstream continuity
Contracts and contract line items show at least partial continuity from quote lines into downstream records, including catalog amounts and source quote line references in some cases. fileciteturn3file6turn3file15

## Current architecture risks

### 1. Truth mismatch between summary state and event state
The uploaded data shows accepted quote events in `quote_negotiation_events`, while the summary block still reports zero accepted quotes. That weakens buyer and investor trust unless reconciled. fileciteturn3file0turn3file1

### 2. Approval proof is underexposed in live records
The pricing policy is correct, but the visible top-level quote records still show `approval_required = false`, so the strongest commercial rule is not yet clearly evidenced in the demo dataset. fileciteturn3file0turn3file11

### 3. Execution proof is still immature
Contracts are present, but visible examples remain in draft execution posture, which means the execution story is real structurally but not yet fully proven operationally. fileciteturn3file3turn3file12

### 4. Integrations are an architecture lane, not a live proof lane yet
The current live data shows zero integrations configured. fileciteturn3file0

## Recommended architecture message for investors

The right claim today is:

- the architecture is **credible and commercially thoughtful**
- the quote/order continuity model is stronger than a basic CRM
- the repo is **not yet fully diligence-clean** because event truth, approval proof, and execution proof still need tightening

## Internal truth surfaces

- `public/internal-dcc/index.html` — internal readiness dashboard
- `docs/DEMO_DATA_AUDIT.md` — data-backed reality check
- `docs/RELEASE_READINESS.md` — current release posture
- `docs/WORKFLOW_DIAGRAM.md` — single end-to-end commercial flow
