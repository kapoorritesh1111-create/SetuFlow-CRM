# Setu Flow Repo Rework Plan

## Goal
Bring the repo back to one truthful state so code, docs, package scripts, and development pages all describe the same product baseline.

## Current truth
- Sprint 6 is closed in the product baseline.
- Sprint 7 dashboard work is now closed in the baseline.
- Sprint 8 contact-exchange / My Card work is now closed in the baseline.
- The repo now needs Sprint 9 cleanup/hardening and Sprint 10 demo/release proof on top of the cleaned baseline.

## This cleanup pass
- align development and markdown status language to the checked-in code
- remove legacy duplicate JSX files no longer imported
- remove stale `.out` artifacts from the repo baseline
- restore lightweight smoke tests and dashboard validation scripts
- make release language honest about Sprint 7-8 closure, Sprint 9 hardening, and Sprint 10 proof

## Next execution order
1. Execute Sprint 9 cleanup and hardening on top of the closed Sprint 8 baseline.
2. Refresh install, typecheck, smoke tests, and production build proof on the updated repo.
3. Decompose the biggest files and reduce route/query friction.
4. Polish the demo-critical surfaces for buyer confidence.
5. Finish Sprint 10 buyer/demo/release proof from the stabilized baseline before April 21.
