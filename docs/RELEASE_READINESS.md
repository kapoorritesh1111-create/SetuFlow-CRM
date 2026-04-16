# Setu Flow Release Readiness

## Current status
**Sprint 7 closed, Sprint 8 ready, proof refresh recommended at kickoff.**

The codebase now reflects a closed Sprint 7 baseline, with Sprint 8 outward-share work ready as the next lane in development. The main remaining release task is to refresh verification on this updated baseline after dependencies are installed.

## What is already true in code
- Capture -> Lead -> Quote -> Order remains the locked commercial flow.
- Leads, Quotes, Orders, Dashboard, Admin, Products, Contracts, Compliance, Trade Events, and Contact Exchange all exist as live repo surfaces.
- Orders already carry documents, compliance, contract status, and dispatch-readiness context.
- Dashboard closure is now part of the repo baseline rather than a future-only sprint.
- My Card / digital vCard / scan-contact surfaces are present in code and ready for Sprint 8 execution inside the broader workflow.

## What this repo still needs before release confidence is claimed
1. **Fresh proof refresh**
   - run `npm ci`
   - run `npm run typecheck`
   - run `npm test`
   - run `npm run build`
2. **Sprint 8 outward-share execution**
   - finish My Card, QR/public card, save-contact, and quote-request flows on top of the closed Sprint 7 baseline
3. **Architecture cleanup**
   - split the largest quote/query files and keep route ownership clearer
4. **Buyer-proof assets**
   - refresh demo walkthroughs, proof points, and release narrative from the cleaned baseline

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
