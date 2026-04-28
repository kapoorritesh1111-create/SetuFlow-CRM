# PR-NS-08 Build Hotfix — Pipeline Board Type Safety

## Change
- Fixed the production TypeScript error in `src/features/pipeline/components/pipeline-board.tsx`.
- The Kanban render now uses `visualStageGroups`, which explicitly includes:
  - `stage`
  - `leads`
- Added a `VisualStageGroup` type so lane rendering can safely access `group.stage.*` and `group.leads`.

## Build Error Fixed
`Property 'stage' does not exist on type '{ name: string; stages: Stage[]; sort_order: number; ref: Stage; }'.`

## Impact
- No schema changes.
- No routing changes.
- No UI redesign changes.
- Pipeline grouping and drag/drop persistence logic remain intact.
