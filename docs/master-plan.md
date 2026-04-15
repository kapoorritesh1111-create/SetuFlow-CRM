# Setu Flow Master Plan

## Product definition
Setu Flow is a trade execution system for import-export sales teams.

## Locked flow
Capture -> Lead -> Quote -> Order

## Current repo baseline
- **Closed baseline:** Sprints 1 through 6 are reflected in live code.
- **Active lane:** Sprint 7 Dashboard rebuild is already in progress in the repo and should now be treated as the active product lane.
- **Seeded lane:** Sprint 8 My Card / contact-exchange work exists in code, but it stays subordinate to Sprint 7 until the dashboard lane is stabilized.
- **Cleanup lane:** Sprint 9 architecture cleanup remains necessary because large quote/query files and legacy route duplication still exist.

## What this cleanup pass changes
This repo pass is about **alignment before more feature depth**:
- update development pages so they match the checked-in code
- replace stale markdown that still described Sprint 2 or Sprint 3 as current
- remove legacy duplicate files that were no longer imported
- restore repo-backed smoke tests and lightweight validation scripts
- make readiness language honest: code is ahead of the old docs, but fresh proof still needs a new verify run after install

## Operating pages
Use these pages before implementation work:
- /development
- /development/master-plan
- /development/readiness
- /development/backlog
- /development/product
- /development/architecture
- /development/ux-rules
- /development/screens/leads-capture

## Delivery roadmap

### Sprint 1 - Product foundation closeout
- establish the locked commercial flow
- keep one development workplace in the repo
- close initial build/deployment readiness
- status: complete

### Sprint 2 - Capture foundation
- unify inbound capture under Leads
- support vCard, card scan, inquiry text, and document intake
- keep review-before-save trust visible
- status: complete

### Sprint 3 - Lead simplification
- keep Leads quote-first
- make Create Quote / Continue Quote dominant
- keep support surfaces quieter and secondary
- status: complete

### Sprint 4 - Quote builder core
- maintain the guided Product -> Pricing -> Terms -> Review -> Send flow
- preserve exact remediation loops and checkpoint continuity
- keep send-state enforcement inside the builder
- status: complete

### Sprint 5 - Trust layer
- preserve approval visibility, audit events, lock enforcement, AI draft assist, and production-safe rate limiting
- keep trust behavior stable while surrounding surfaces evolve
- status: complete

### Sprint 6 - Orders foundation
- keep Orders live from accepted and sent quotes
- preserve document, compliance, contract, and dispatch-readiness context per order
- status: complete

### Sprint 7 - Dashboard rebuild
- canonicalize the dashboard around actions first
- keep trade-map and geographic drill-down meaningful
- remove passive/fallback reporting language and duplicate preview drift
- status: active in repo

### Sprint 8 - My Card and outbound share
- finish the outward contact-exchange story already seeded in code
- keep QR, preview, public-card, and request-quote flows subordinate to the core workflow
- status: seeded, not the primary lane

### Sprint 9 - Architecture cleanup
- split large quote/query files
- tighten service and route boundaries
- keep repo proof tooling simple and real
- status: queued after Sprint 7/8 stabilization

### Sprint 10 - Demo and release readiness
- refresh walkthrough assets
- run end-to-end proof on the cleaned baseline
- close buyer-facing readiness honestly
- status: queued

## Rework plan
1. **Alignment and hygiene**
   - keep docs, development pages, and repo scripts consistent with the checked-in code
   - remove stale artifacts and dead duplicates
2. **Sprint 7 closure**
   - finish the canonical action-first dashboard story and its drill-down behavior
3. **Sprint 8 closure**
   - finish My Card / contact-exchange outward sharing without creating a detached product lane
4. **Proof refresh**
   - reinstall dependencies and run typecheck, smoke tests, and production build on the cleaned baseline
5. **Architecture cleanup**
   - break up the largest files only after product/status truth is stable again

## No-drift rules
- Keep Capture -> Lead -> Quote -> Order as the primary operating path.
- Do not describe seeded or partial work as fully closed.
- Do not leave markdown, development pages, and checked-in scripts speaking different timelines.
- Do not add new top-level product stories when a capability belongs inside the locked flow.
- Pair any roadmap change with updates to the shared status contract and development pages.
