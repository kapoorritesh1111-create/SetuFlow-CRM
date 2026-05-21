# SF-18-007 Phase 2 Decomposition

This checkpoint continues the large-file decomposition after the Phase 1 wrapper PR.

## What changed

- Extracted quote wizard domain types into `src/features/quotes/components/wizard/quote-wizard-types.ts`.
- Extracted lead drawer local types and helper functions into `src/features/leads/components/drawer/lead-drawer-local-types.ts` and `lead-drawer-local-helpers.ts`.
- Extracted leads workspace types and pure helper functions into `src/features/leads/components/workspace/leads-workspace-types.ts` and `leads-workspace-helpers.ts`.
- Extracted lead server action shared types into `src/features/leads/server/actions/legacy-action-types.ts`.

## Why this is safe

The public entrypoints from Phase 1 remain unchanged. This PR only moves types and pure helper functions out of the legacy implementation modules, then imports them back. It does not change routes, schema, RLS, server action behavior, or UI copy.

## Next follow-up

Continue extracting rendered panels and action domains in smaller PRs:

1. Quote wizard line-items and checkpoint panels.
2. Lead drawer quick scan and quote tab panels.
3. Leads workspace inline command-center sections.
4. Lead server action lifecycle/quote/communication modules.
