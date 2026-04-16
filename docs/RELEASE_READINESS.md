# Setu Flow Release Readiness

## Current status
**Sprints 7-8 closed, Sprint 9 active, Sprint 10 queued for demo/release proof before April 21.**

The codebase now reflects a closed Sprint 8 baseline. The main remaining work is Sprint 9 cleanup/hardening plus Sprint 10 demo/release proof, with the product needing to be demo ready before April 21.

## What is already true in code
- Capture -> Lead -> Quote -> Order remains the locked commercial flow.
- Leads, Quotes, Orders, Dashboard, Admin, Products, Contracts, Compliance, Trade Events, and Contact Exchange all exist as live repo surfaces.
- Orders already carry documents, compliance, contract status, and dispatch-readiness context.
- Dashboard closure is now part of the repo baseline rather than a future-only sprint.
- My Card / digital vCard / scan-contact surfaces are present in code as closed Sprint 8 baseline work inside the broader workflow.

## What this repo still needs before release confidence is claimed
1. **Fresh proof refresh**
   - run `npm ci`
   - run `npm run typecheck`
   - run `npm test`
   - run `npm run build`
2. **Sprint 9 cleanup and hardening**
   - split the largest quote/query files, tighten route ownership, and remove remaining drift or trust issues
3. **Sprint 10 buyer-proof assets**
   - refresh demo walkthroughs, proof points, and release narrative from the cleaned baseline before April 21

## Readiness gates
- Product clarity gate
- Workflow trust gate
- Orders execution gate
- Dashboard usefulness gate
- Repo alignment gate
- Fresh verification gate
- Demo / buyer-proof gate

## Honesty rule
Do not describe the repo as fully release-ready until the cleaned baseline has passed a fresh verify run. Historical build logs are helpful context, but they are not the same thing as current proof for this exact repo state.
