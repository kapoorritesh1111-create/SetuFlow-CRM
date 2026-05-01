# TypeFix v6

Patched the follow-up TypeScript errors exposed after TypeFix v5.

## Changes
- Updated pipeline detail-panel readiness to use the current object-input readiness flow via `getStageMoveReadinessForLead`.
- Updated detail-panel health to use the current `computeLeadHealth({ ... })` object-input API.
- Aligned `PipelineDetailPanel` move-readiness typing with `StageMoveReadiness.status` (`ready | at_risk | blocked`).

## Validation
- Static scan found no remaining old-style `buildStageMoveReadiness(...)` or `computeLeadHealth(...)` positional calls.
- Full local `npm run build` was not completed in this environment because dependency/typecheck execution became unstable.
