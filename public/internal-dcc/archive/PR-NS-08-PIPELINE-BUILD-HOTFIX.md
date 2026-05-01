# PR-NS-08 Pipeline Build Hotfix

## What changed
- Reviewed the pipeline board render path and navigation helpers after repeated Vercel type failures.
- Fixed command-center navigation calls in `src/features/pipeline/components/pipeline-board.tsx` to match the shared helper signature: `navigateToLeadCommandCenter(router, href)`.
- Preserved the existing `buildLeadCommandCenterHref(lead.id)` return-to behavior so pipeline cards still route back correctly.
- Rechecked pipeline icon rendering and stage-group usage to avoid the previous `stage`, `position`, and icon prop type regressions.

## Files reviewed
- `src/features/pipeline/components/pipeline-board.tsx`
- `src/features/pipeline/components/PipelineLaneSection.tsx`
- `src/features/pipeline/ui/lead-card.tsx`
- `src/features/pipeline/types/board.ts`
- `src/features/pipeline/logic/board.ts`
- `src/lib/lead-command-center-navigation.ts`
- `src/features/leads/command-center/ui-system.tsx`

## Build note
This package is focused on the Vercel TypeScript failures reported in the pipeline board. The local container could not complete dependency installation from `npm ci`, so final production confirmation should be done in Vercel or a local Node environment with dependencies installed.
