# Setu Flow Master Plan

## Product definition
Setu Flow is a trade execution system for import-export sales teams.

## Locked flow
Capture -> Lead -> Quote -> Order

## Current state
Sprint 2 is complete.

A clean production build has already been verified and deployed successfully.
There are currently no confirmed build blockers in the latest verified baseline.

Next phase: Sprint 3 is ready to start.

## Operating pages
Use these pages before any implementation work:
- /development
- /development/master-plan
- /development/readiness
- /development/backlog
- /development/product
- /development/architecture
- /development/ux-rules
- /development/screens/leads-capture

## Sprint roadmap

### Sprint 1 - Product foundation closeout
- keep one active development workplace at `/development`
- keep Sprint 1 aligned to Leads, Capture, and Quote entry only
- complete real-environment build and deployment validation
- status: complete

### Sprint 2 - Capture foundation
- create unified Capture entry under Leads
- deepen intake review for vCard, business card, and document upload
- add confidence states and duplicate detection depth
- status: complete

### Sprint 3 - Lead simplification
- reduce lead surface complexity
- make Create Quote the dominant CTA
- unify activity and next-action surfaces

### Sprint 4 - Quote builder core
- build guided quote builder steps
- define data model for draft, pricing, and review
- add version history and send checkpoints

### Sprint 5 - Trust layer
- Batch 1 started with a safe runtime slice: surface the approval gate contract in the quote fast lane
- Batch 1 started with a safe runtime slice: surface the audit-event map for checkpoint, approval, send, and lock transitions
- Batch 1 started with a safe runtime slice: surface quote lock posture after send and outcome without opening deeper enforcement

### Sprint 6 - Orders foundation
- create Orders module and accepted quote snapshot path
- fold documents and compliance into order detail

### Sprint 7 - Dashboard rebuild
- make dashboard action-first
- add trade map and geographic drill-down
- remove passive vanity metrics

### Sprint 8 - My Card and outbound share
- build My Card page
- add QR, public card page, and request-quote CTA path

### Sprint 9 - Architecture cleanup
- split god files
- re-home services into clearer domains
- reduce route sprawl and legacy paths

### Sprint 10 - Demo and release readiness
- prepare buyer demo script
- prepare leadership walkthrough
- verify end-to-end readiness against release criteria

## No-drift rules
- Stay in the active sprint until its validation is complete
- Do not redesign the product structure
- Do not add new top-level modules without deliberate product approval
- Do not create alternate workflow paths outside the locked flow
- Keep planning inside the HTML development workplace instead of scattered markdown files
- Keep later sprint work visible in the in-app backlog instead of losing it between cleanup passes
