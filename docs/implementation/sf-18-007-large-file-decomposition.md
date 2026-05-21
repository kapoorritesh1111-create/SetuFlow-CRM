# SF-18-007 Large File Decomposition Checkpoint

## Purpose

SF-18-007 tracks four oversized workflow files that were too large to safely edit directly in the live GitHub connector. This checkpoint keeps existing imports stable while moving the current implementations behind explicit legacy implementation modules.

## Canonical entrypoints now stay small

- `src/features/quotes/components/quote-wizard-form.tsx`
- `src/features/leads/components/lead-drawer.tsx`
- `src/features/leads/components/leads-workspace.tsx`
- `src/features/leads/server/actions.ts`

These files now act as stable public entrypoints only. Existing imports should continue to use the original paths.

## Legacy implementation modules created

- `src/features/quotes/components/wizard/quote-wizard-form.legacy.tsx`
- `src/features/leads/components/drawer/lead-drawer.legacy.tsx`
- `src/features/leads/components/workspace/leads-workspace.legacy.tsx`
- `src/features/leads/server/actions/legacy-actions.ts`

## Next safe decomposition passes

1. Split quote wizard legacy implementation into step components under `src/features/quotes/components/wizard/`.
2. Split lead drawer legacy implementation into focused drawer tabs under `src/features/leads/components/drawer/`.
3. Split leads workspace legacy implementation into list, command-center, preview, and quote-review modules under `src/features/leads/components/workspace/`.
4. Split lead server legacy actions into lifecycle, quote handoff, compliance, activity, and communication action modules under `src/features/leads/server/actions/`.
5. Keep existing public imports stable through the original entrypoint files until all consumers are migrated.

## Validation expectation

After applying this checkpoint branch, run:

```bash
npx tsc --noEmit --skipLibCheck
npm run build
```

Then check the Vercel deployment generated from the PR branch before merge.
