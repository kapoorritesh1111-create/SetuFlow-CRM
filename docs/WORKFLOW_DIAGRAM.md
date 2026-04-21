# Workflow Diagrams

## End-to-end trade workflow

![Trade workflow](./diagrams/trade-workflow.svg)

Canonical shipped flow remains:

**Capture -> Lead -> Quote -> Order**

Supporting governed surfaces sit around that flow rather than replacing it:
- **Contracts** receive accepted-quote commercial lock snapshots and line continuity.
- **Documents / Compliance** gate quote send and contract progression through requirement rules and review status.
- **Orders** enforce execution-state progression across draft, ready, released, dispatched, and completed posture.
- **Dashboard** surfaces commercial, compliance, release, dispatch, and completion blockers as action-forcing evidence cards.
- **AI** explains the next safe action from repo-backed blockers and guardrails; it does not mutate workflow truth automatically.
- **Integrations** validate payloads, preserve continuity-aware events, and queue governed outbound syncs without outrunning contract or execution truth.

## Feature workflows

### Leads
![Leads workflow](./diagrams/leads-workflow.svg)

### Pipeline
![Pipeline workflow](./diagrams/pipeline-workflow.svg)

### Quotes
![Quotes workflow](./diagrams/quotes-workflow.svg)

### Orders
![Orders workflow](./diagrams/orders-workflow.svg)

### Dashboard
![Dashboard workflow](./diagrams/dashboard-workflow.svg)

### AI
![AI workflow](./diagrams/ai-workflow.svg)

### Integrations
![Integrations workflow](./diagrams/integrations-workflow.svg)
