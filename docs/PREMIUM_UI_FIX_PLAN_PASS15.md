# Pass 15 Premium UI Fix Plan

Last updated: 2026-05-01

## Scope

This plan converts the Pass 15 UX review into implementation work. It does not claim the fixes are complete. The implementation pass must update code, run TypeScript/build checks, and verify no route or import regressions are introduced.

## Workstreams

| Workstream | Required fix | Acceptance criteria |
|---|---|---|
| Shared premium filter command bar | Same height, radius, shadow, labels, active chips, clear action, and apply behavior across modules. | Leads, Orders, Quotes, Dashboard, and Trade Events no longer look like separate filter systems. |
| Leads / Follow-up polish | Compress header/filter stack, show explicit active chips, re-grid row layout. | Lead queue appears higher on screen and rows align cleanly. |
| Orders execution polish | Replace sparse header with execution cockpit, standardize filters, integrate blocker chips/value. | Orders reads as a premium execution workspace. |
| Quotes polish | Remove duplicate mode control, standardize filter bar, improve row hierarchy. | Quotes matches Leads/Orders design language. |
| Trade Events redesign | Add event KPIs, premium event cards, primary capture CTAs, customer-safe proof-boundary treatment. | Trade Events feels like the rest of the command center. |
| Organization Setup redesign | Add true SaaS setup flow with profile, commercial defaults, team setup, reference data, catalog readiness, security/governance, and setup progress. | New customer knows what to complete first and cards either navigate or look static. |

## Verification requirements

Before returning the implementation zip:

```bash
npm run test:all
npm run build
```

If dependencies are unavailable, document the exact failure and at minimum run a targeted import scan. Do not claim the build passed unless it actually passed.

## Non-goals

- Do not apply Supabase remediation migrations in this UI pass.
- Do not mutate Q-00025 or contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`.
- Do not claim production launch approval from visual fixes alone.
