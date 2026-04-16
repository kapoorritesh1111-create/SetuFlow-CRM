# Setu Flow Master Plan

## Product definition
Setu Flow is a trade execution system for import-export sales teams.

## Locked flow
Capture -> Lead -> Quote -> Order

## Current repo baseline
- **Closed baseline:** Sprints 1 through 6 are reflected in live code.
- **Closed lane:** Sprint 7 Dashboard rebuild is now closed in the repo and should be treated as baseline truth.
- **Closed lane:** Sprint 8 My Card / contact-exchange work is now reflected in live code and should be treated as baseline truth.
- **Active lane:** Sprint 9 architecture cleanup and hardening is now the active development lane because large quote/query files, proof refresh, and demo polish still remain.

## What this cleanup pass changes
This repo pass is about **alignment before more feature depth**:
- update development pages so they match the checked-in code
- replace stale markdown that still described Sprint 2 or Sprint 3 as current
- remove legacy duplicate files that were no longer imported
- restore repo-backed smoke tests and lightweight validation scripts
- make readiness language honest: Sprints 7-8 are closed, Sprint 9 is active, and Sprint 10 remains the demo/release proof lane before April 21

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
- status: complete

### Sprint 8 - My Card and outbound share
- finish the outward contact-exchange story already present in code
- keep QR, preview, public-card, and request-quote flows subordinate to the core workflow
- status: complete

### Sprint 9 - Architecture cleanup and hardening
- split large quote/query files
- tighten service and route boundaries
- keep repo proof tooling simple and real
- status: active

### Sprint 10 - Demo and release readiness
- refresh walkthrough assets
- run end-to-end proof on the cleaned baseline
- close buyer-facing readiness honestly
- status: queued · target completion before April 21

## Rework plan
1. **Alignment and hygiene**
   - keep docs, development pages, and repo scripts consistent with the checked-in code
   - remove stale artifacts and dead duplicates
2. **Sprint 9 hardening**
   - refresh proof, reduce architecture risk, and finish demo-quality polish without reopening closed Sprint 7-8 work
3. **Sprint 10 proof closure**
   - finalize buyer walkthroughs, release readiness, and end-to-end proof before April 21
4. **Architecture cleanup**
   - break up the largest files and remove remaining route/query friction while protecting the closed baseline

## No-drift rules
- Keep Capture -> Lead -> Quote -> Order as the primary operating path.
- Do not describe seeded or partial work as fully closed.
- Do not leave markdown, development pages, and checked-in scripts speaking different timelines.
- Do not add new top-level product stories when a capability belongs inside the locked flow.
- Pair any roadmap change with updates to the shared status contract and development pages.
