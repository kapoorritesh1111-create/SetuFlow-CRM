# TypeFix v7 wide pass

## Summary
This pass fixes the next Vercel TypeScript error and hardens the pipeline readiness typing so the same class of error does not continue surfacing one line at a time.

## Changes
- Annotated the card-level readiness fallback IIFE as `StageMoveReadiness`.
- Annotated the detail-panel `panelReadiness` value as `StageMoveReadiness`, so the no-stage fallback keeps the literal `ready | at_risk | blocked` union instead of widening to `string`.
- Replaced the local `MoveReadiness` shape in `PipelineDetailPanel` with the canonical `StageMoveReadiness` type from `pipeline-stage-gating`.
- Updated the root dashboard HTML comment so leadership-facing release tracking reflects the TypeFix v7 pass.

## Static checks performed
- Searched all `src` TypeScript/TSX files for old positional `buildStageMoveReadiness(...)` and `computeLeadHealth(...)` usage.
- Searched readiness fallback call sites and typed both fallback branches that feed UI props.

## Validation note
The container could not complete dependency installation or a full local `tsc`/`next build` run because npm/tsc processes timed out in this environment. The Vercel-reported error at `pipeline-board.tsx:994` is directly fixed by preserving the canonical `StageMoveReadiness` type through the fallback branch.
