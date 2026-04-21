# Unified Workflow Diagram

This is the current **investor-safe and buyer-safe** workflow statement for the shipped repo and the live demo data.

```text
Capture
  |
  v
Lead
  |
  v
Product / Category Interest
  |
  v
Quote
  |
  +--> Base catalog pricing is default
  |
  +--> Override allowed only with reason
  |
  +--> Approval required when override policy is triggered
  |
  v
Contract / Order
  |
  +--> Quote continuity must persist
  +--> Commercial snapshot must remain auditable
  |
  v
Execution
  |
  +--> Documents
  +--> Compliance
  +--> Release readiness
  +--> Dispatch
  +--> Completion
  |
  v
Freight / Finance follow-through
```

## What the current data supports

The live dataset proves that Setu Flow already has meaningful commercial coverage:

- 35 buyers
- 10 suppliers
- 21 products
- 31 variants
- 8 quotes
- 3 contracts fileciteturn3file0

## What the current data does not fully prove yet

The unified workflow above is the correct product story, but the current live data still has proof gaps:

- quote-level accepted state is not fully reconciled with accepted negotiation events
- approval proof is underrepresented in visible quote records
- execution is still mostly visible in draft posture
- freight/integration proof exists architecturally more than operationally in the current live export fileciteturn3file0turn3file3

## Workflow interpretation rules

### Capture
Sources already present in the dataset include:

- website inbound
- trade event
- referral
- quote backfill
- manual entry fileciteturn3file0

### Lead
Leads are not just contacts. They carry:

- buyer vs supplier identity
- geography
- pipeline placement
- next step posture
- product need context

### Product / Category Interest
The product model is commercially meaningful enough for demo. Buyer leads already carry real product needs such as chips, powders, jaggery, onion, garlic, and fruit/vegetable product families. fileciteturn3file0

### Quote
Pricing integrity rules remain mandatory:

- catalog/base pricing is default
- override must not be casual
- override needs a reason
- approval must remain enforceable

### Contract / Order
Contracts already exist in the live data, but not yet in a way that proves a fully mature accepted-to-executing chain for every demo path. fileciteturn3file3turn3file12

### Execution
Execution exists conceptually and structurally, but the visible examples still show `execution_state = draft`, so execution should be demoed carefully and honestly. fileciteturn3file3turn3file12
