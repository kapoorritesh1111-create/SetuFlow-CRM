# Setu Flow CRM workflows

## Canonical golden workflow

```text
Capture / Lead
  -> Product or Category Interest
  -> Quote from catalog baseline
  -> Override only if needed
  -> Override reason required
  -> Approval required when policy threshold is met
  -> Accepted quote
  -> Order / Contract continuity
  -> Execution
```

## Workflow interpretation rule

Every workflow shown in the DCC must remain understandable to a non-technical viewer. The major workflow should always be shown first. Module workflows exist to explain how each part of the product supports that major commercial journey.

## Why this workflow is canonical

This is the best commercially coherent path already present in the repo narrative and product behavior:

- product management establishes catalog/base pricing
- quote workflow allows manual price changes only with explicit reason capture
- approval routing remains visible when approval is required
- orders page is intentionally limited to accepted quotes
- contracts preserve quote continuity through `quote_id`
- contract line items preserve catalog price, final unit price, override status, and override reason

## Proven workflow checkpoints

### 1. Capture / lead
A buyer or supplier enters the system through capture and becomes a working lead record.

### 2. Interest
The lead is tied to product or category demand so the deal does not drift into generic CRM notes.

### 3. Quote
Quote building begins from the catalog baseline, not spreadsheet drift.

### 4. Override governance
If quote pricing differs from the catalog baseline:

- the override must be explicit
- the override must include reason
- the approval posture must remain visible

### 5. Order / contract truth
Orders represent accepted commercial work, not any quote in flight.

### 6. Execution
Execution state, documents, compliance, and operational blockers continue the commercial record, even though the strongest visible runtime examples are still not the most mature proof set.

## Module workflows

### Leads
Capture source -> Lead creation -> Qualification -> Owner and next step

### Pipeline
New stage -> Qualified stage -> Commercial stage -> Next action

### Quotes
Catalog base price -> Quote line build -> Override with reason if needed -> Approval if policy triggers -> Send / accept

### Orders / Contracts
Accepted quote only -> Contract linked by quote_id -> Contract line continuity -> Execution readiness

### Dashboard
Metrics -> Priorities -> Drill-down -> Action

### Contact Exchange
Card / vCard -> Extraction -> Create or update lead -> Route owner

### Product Management
Category -> Product -> Variant and pack -> Catalog price truth

### Trade Workflow
Buyer need -> Product match -> Quote and terms -> Operational follow-through

### AI
Context -> Suggestion -> Human review -> Apply or dismiss

### Integrations
Business event -> Adapter -> Replay / govern -> Live proof still pending
