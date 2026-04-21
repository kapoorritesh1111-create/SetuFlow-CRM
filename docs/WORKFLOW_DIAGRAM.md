# Setu Flow CRM workflows

## Major workflow

```text
Capture
  -> Lead
  -> Product / Category Interest
  -> Quote
  -> Approval (if override is triggered)
  -> Order / Contract
  -> Execution
  -> Freight / Finance follow-through
```

## Module workflows

### Leads
Capture source -> Lead creation -> Qualification -> Owner / next step

### Pipeline
New stage -> Qualified stage -> Commercial stage -> Action / next step

### Quotes
Catalog base price -> Quote line build -> Override with reason if needed -> Approval if triggered -> Send quote

### Orders / Contracts
Accepted quote -> Contract continuity -> Commercial lock -> Execution readiness

### Dashboard
Metrics -> Priorities -> Drill-down -> Action

### Contact Exchange
Scan / vCard -> Extraction -> Create/update lead -> Route owner

### Product Management
Category -> Product -> Variant + MOQ -> Base price source of truth

### Trade Workflow
Buyer need -> Catalog match -> Quote build -> Operational follow-through

### AI
Context -> Suggestion -> Human review -> Apply or dismiss

### Integrations
Business event -> Adapter -> Replay/govern -> Live external proof

## Workflow interpretation rule

Every workflow shown in the DCC must remain understandable to a non-technical viewer. The major workflow should always be shown first. Module workflows exist to explain how each part of the product supports that major commercial journey.
