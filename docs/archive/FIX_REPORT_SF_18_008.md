# SF-18-008 Combined Cleanup Fix Report

## Scope

Combined fix package for SF-18-008 / SF-18-008A / SF-18-008B / SF-18-008C against the uploaded deployed repository.

## Build-error fixes included in this revision

1. Fixed `src/features/leads/command-center/adapters.ts` / query type drift by adding `whatsapp_number` to the selected lead profile type in the query layer.
2. Fixed the Vercel error in `src/features/leads/server/actions/legacy-actions.ts` where typed Supabase inference narrowed query results to `never`.
3. Ran a focused TypeScript check over `src/features/leads`, `src/features/quotes`, and `src/features/orders`, then fixed additional surfaced issues:
   - Supabase mutation/query clients in affected server action files are now explicitly loose-typed as mutation clients where generated Supabase table typing is incomplete, avoiding `never` inference without using `as any`.
   - Removed problematic `as never` casts in quote pricing repository RPC/select flows.
   - Typed parsed quote approval metadata so `required` and `state` are valid properties.

## Validation performed

- Installed dependencies with `npm install --no-audit --no-fund` locally. `npm ci` was not run.
- Ran focused TypeScript validation:

```bash
npx tsc -p tsconfig.sf18.json --pretty false
```

Result: passed for the affected feature paths:

- `src/features/leads/**/*.ts(x)`
- `src/features/quotes/**/*.ts(x)`
- `src/features/orders/**/*.ts(x)`

- Confirmed targeted exact `as any` casts are absent:

```bash
grep -R " as any" -n src/features/orders src/features/leads src/features/quotes
```

Result: no matches.

## Notes

- A full local `next build` could not be completed in this sandbox because the build remained at the optimized production compile step after mocking Google font responses. The prior Vercel errors were TypeScript validation errors, so the focused TypeScript pass was used to catch the affected feature paths before packaging.
- This revision intentionally keeps the app schema unchanged.
