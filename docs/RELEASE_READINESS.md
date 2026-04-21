# Release Readiness Checklist

## Current repo truth
- PR-01 through PR-29 are complete.
- DCC updated through PR-29.
- Release proof is tracked in `docs/RELEASE_PROOF.md`.
- TypeScript check, dashboard freeze, and repo consistency checks are wired into one governed release gate.

## Verification
- [x] Fresh install proof
- [x] Fresh typecheck proof
- [x] DCC / manifest / release-proof consistency checks pass
- [x] Release proof command added to the governed baseline

## Release gate
- verification command: `npm run release:proof`
- clean step: `npm run clean:verification`
