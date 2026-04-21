# Setu Flow Architecture Contract

## Current code shape
The repo is organized around:
- `src/app/` for route entry points and page shells
- `src/features/` for domain and feature implementations
- `src/components/` for shared UI
- `src/lib/` for contracts, queries, workflow logic, services, and shared utilities
- `public/` for public assets, including the internal-only DCC

## Product ownership lanes
- **Dashboard** owns action-first operating visibility and evidence-backed next-action routing.
- **Leads** owns qualification, contact context, commercial follow-up posture, and category-only versus confirmed-product interest.
- **Pipeline** owns governed stage movement and next-action visibility.
- **Quotes** owns pricing, revisions, risk posture, and quote-to-contract handoff while preserving strict override governance.
- **Contracts** owns signed commercial commitments, locked continuity snapshots, and contract progression posture.
- **Orders** owns accepted commercial truth carried into execution, including state progression and evidence gates.
- **Admin / governance** owns users, org setup, audit, analytics, catalog governance, and settings.
- **Supporting lanes** such as documents, compliance, contact exchange, integrations, AI assist, and trade workflow modules reinforce the core operating flow.

## Architecture rules
- Route truth must remain aligned to `src/lib/routes/manifest.json`.
- Product, tests, and status contracts must describe the same shipped routes.
- Internal planning belongs in `public/internal-dcc/index.html`, not in product-facing routes.
- Feature work should keep moving toward owned `ui`, `logic`, `server`, and `types` boundaries.
- Shared query and utility layers must not become silent monoliths.
- Repo changes that affect governed workflow behavior should update the SOP/runbook pack in the same pass.

## Current architecture strengths
- canonical route truth is manifest-backed
- shell truth, tests, and status contracts are aligned
- contracts and orders now share explicit commercial continuity and execution-state models
- document and compliance rules are computed through shared requirement logic
- trade workflow, AI intelligence, and integrations now exist as explicit modules instead of only implicit behavior
- integrations and AI both reuse governed blocker truth instead of introducing parallel state machines

## Current architecture risks
- large shared query surfaces still need long-term tightening
- some quote and dashboard-heavy files still deserve further decomposition
- release-gate proof still depends on a fully provisioned environment for fresh install, typecheck, and build verification
- future workflow changes could create documentation drift unless the DCC and SOP pack are refreshed together

## Reference diagrams
- `docs/ARCHITECTURE_DIAGRAM.md`
- `docs/WORKFLOW_DIAGRAM.md`
- `docs/SOP_RUNBOOK_INDEX.md`
