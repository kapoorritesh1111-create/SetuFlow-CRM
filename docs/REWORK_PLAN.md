# Setu Flow Repo Rework Plan

## Goal
Bring the repo back to one truthful state so code, docs, package scripts, and development pages all describe the same product baseline.

## Current truth
- Sprint 6 is closed in the product baseline.
- Sprint 7 dashboard work is already in code.
- Sprint 8 contact-exchange / My Card work is already seeded.
- The repo still needed hygiene work to remove stale docs, dead files, and broken script references.

## This cleanup pass
- align development and markdown status language to the checked-in code
- remove legacy duplicate JSX files no longer imported
- remove stale `.out` artifacts from the repo baseline
- restore lightweight smoke tests and dashboard validation scripts
- make release language honest about proof still needing a fresh verify run

## Next execution order
1. Finish Sprint 7 dashboard canonicalization.
2. Close Sprint 8 outward-share flows.
3. Refresh proof on the cleaned repo.
4. Start Sprint 9 decomposition of the biggest files.
5. Finish Sprint 10 buyer/demo/release proof from the stabilized baseline.
