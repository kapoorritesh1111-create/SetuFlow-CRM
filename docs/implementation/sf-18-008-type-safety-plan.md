# SF-18-008 Type Safety Remediation Plan

## Issue

SF-18-008 tracks unsafe TypeScript escape hatches across server action code.

## Current checkpoint

This branch was created from live `main` after SF-18-007 was resolved and production was verified.

The tracker-listed entrypoint `src/features/leads/server/actions.ts` is now a small re-export after SF-18-007, so the lead remediation target is the implementation behind it: `src/features/leads/server/actions/legacy-actions.ts` and any newly split server-action modules it exports.

## Implementation strategy

Because this touches high-risk server actions, the work should proceed in PR checkpoints rather than direct production commits.

1. Inventory unsafe casts in server action implementations.
2. Prioritize actions that write to live data:
   - orders execution / documents
   - quotes create/update/send
   - leads mutation and workflow actions
3. Replace inline `as any` casts with generated database row/insert/update aliases from `src/types/database.generated.ts`.
4. Use `unknown` plus narrow helper functions for dynamic metadata, snapshots, and JSON payloads.
5. Add a repo check that fails if ` as any` appears in selected server action files.
6. Merge only after Vercel and targeted workflow smoke checks pass.

## Validation target

- `npx tsc --noEmit --skipLibCheck`
- `npm run build`
- grep/check shows zero ` as any` casts in selected server action files
- Leads, Quotes, and Orders pages continue to open after production deployment
