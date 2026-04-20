# Setu Flow Architecture Contract

## Current code shape
The repo is organized around:
- `src/app/` for route entry points and page shells
- `src/features/` for domain and feature implementations
- `src/components/` for shared UI
- `src/lib/` for contracts, queries, workflow logic, services, and shared utilities
- `public/` for public assets, including the internal-only DCC

## Product ownership lanes
- **Dashboard** owns action-first operating visibility.
- **Leads** owns qualification, contact context, and commercial follow-up posture.
- **Pipeline** owns stage movement and next-action visibility.
- **Quotes** owns pricing, revisions, risk posture, and quote-to-order handoff.
- **Orders** owns accepted commercial truth carried into execution.
- **Admin / governance** owns users, org setup, audit, analytics, and settings.
- **Supporting lanes** such as contact exchange, integrations, AI assist, and trade workflow modules support the core commercial flow.

## Architecture rules
- Route truth must remain aligned to `src/lib/routes/manifest.json`.
- Product, tests, and status contracts must describe the same shipped routes.
- Internal planning belongs in `public/internal-dcc/index.html`, not in product-facing routes.
- Feature work should keep moving toward owned `ui`, `logic`, `server`, and `types` boundaries.
- Shared query and utility layers must not become silent monoliths.

## Current architecture strengths
- canonical route truth is manifest-backed
- shell truth, tests, and status contracts are aligned
- leads, pipeline, and quotes all have clearer domain ownership
- trade workflow, AI intelligence, and integrations now exist as explicit modules instead of only implicit behavior

## Current architecture risks
- large shared query surfaces still need long-term tightening
- some quote and dashboard-heavy files still deserve further decomposition
- full production verification still depends on a fully provisioned environment

## Reference diagrams
- `docs/ARCHITECTURE_DIAGRAM.md`
- `docs/WORKFLOW_DIAGRAM.md`
