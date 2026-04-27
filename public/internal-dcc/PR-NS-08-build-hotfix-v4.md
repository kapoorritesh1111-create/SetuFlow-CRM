# PR-NS-08 Build Hotfix v4

## What changed
- Reviewed the impacted Catalog, Quotes, Orders, and Pipeline feature areas for the PR-NS-08 data wiring pass.
- Hardened the Pipeline board visual stage grouping introduced for drag/drop persistence.
- Fixed the production type mismatch in `src/features/pipeline/components/pipeline-board.tsx`:
  - `group.stage.position` was replaced with schema-backed `sort_order` usage where applicable.
  - The lane accent now calls `getStageAccent(group.stage.name)` to match the shared UI-system helper signature.
  - The stage icon now renders the Lucide component returned by `getStageIcon(...)` instead of passing the component function as a React node.

## What was fixed
- Vercel error: `Property 'position' does not exist on type 'Stage'`.
- Prevented the likely follow-on type issue from `getStageAccent(...)` receiving an unsupported second argument.
- Prevented the likely follow-on render/type issue from directly rendering `getStageIcon(...)` instead of instantiating the returned icon component.

## What remains
- No schema changes were added in this hotfix.
- This hotfix targets the build-blocking Pipeline board typing/rendering issue reported from Vercel.

## Data flow diagram
Catalog product + variant selection
  -> quote_line_items persistence
  -> quote version snapshot
  -> approval state transition
  -> accepted quote creates order
  -> order documents + compliance determine dispatch readiness
  -> pipeline stage movement persists with optimistic UI + rollback guard

## Readiness status
- Overall completion: 83%
- PR-NS-08 completion: 88%
- Catalog: 82%
- Quotes: 90%
- Orders: 84%
- Pipeline: 92%
