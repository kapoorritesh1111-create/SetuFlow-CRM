# Release Proof

## Latest release pass

### PR-NS-07.5 — NorthStar visual parity hardening

Status: Complete

Release proof:
- Quotes, Orders, Pipeline, and Catalog were reviewed against their redesign HTML references and tightened for shared NorthStar visual rhythm.
- Shared workspace surface tokens were updated for command-card, KPI-card, panel, and table-shell consistency.
- Quotes now keeps redesign CTAs/workflows visible: Export, + New quote, Bulk action, Review, Approve & allow send, Reject override, Approval Status, Revise, Duplicate, and Create order.
- Orders now uses Orders Execution Desk language and keeps Open order, View quote, Upload document, Export, execution state, blocker, and dispatch lifecycle visible.
- Pipeline now uses Pipeline / Risks and Kanban Board language with Quick Lead, Follow-up Queue, Dashboard, blocker-first filters, stage gates, and quote/order handoff actions.
- Catalog now uses Catalog — Products, Pricing & Variants language with Export, Add product, Pricing gaps, product/variant/pricing controls, USD baseline editing, quote-ready status, and quote handoff context.
- Internal DCC, PR tracker, release proof, root page, and NorthStar reference documentation were updated.

Checks:
- npm test / individual smoke suite available in this repo pass.
- typecheck may depend on local node_modules availability in the execution environment.

Next:
PR-NS-08 — Catalog-to-Quote data wiring hardening.

Release command reminder: release:proof runs the repo verification chain through package scripts.

### PR-NS-07.6 — Vercel build recovery + redesign reference lock

Status: Completed in this repo pass.

- Fixed the Pipeline board production type failure from the visual parity pass by adding an explicit visual stage group model that exposes the representative `stage` and filtered lane `leads` used by the NorthStar board renderer.
- Preserved the grouped-stage pipeline behavior used to avoid duplicate buyer/supplier lanes.
- Re-locked the four attached redesign HTML files into `/public/reference-html/` for Quotes, Orders, Pipeline, and Catalog so the repo references match the latest uploaded designs.
- Visual/functionality review found remaining parity work is mostly exact interaction/data wiring, not the shell rhythm: Catalog drawer/wizard behavior, Orders document upload state, Pipeline drag/drop persistence, and Quotes version/revise/approval persistence need PR-NS-08+ hardening.

Next active development remains PR-NS-08 — Catalog-to-Quote data wiring hardening.
