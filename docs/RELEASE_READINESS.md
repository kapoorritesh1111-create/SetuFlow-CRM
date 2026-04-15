# Setu Flow Release Readiness

## Current status
**Repo aligned, proof refresh pending.**

The codebase now reflects a closed Sprint 6 baseline, active Sprint 7 dashboard work, and seeded Sprint 8 contact-exchange work. What is still missing is a **fresh verification run on this cleaned baseline** after dependencies are installed.

## What is already true in code
- Capture -> Lead -> Quote -> Order remains the locked commercial flow.
- Leads, Quotes, Orders, Dashboard, Admin, Products, Contracts, Compliance, Trade Events, and Contact Exchange all exist as live repo surfaces.
- Orders already carry documents, compliance, contract status, and dispatch-readiness context.
- Dashboard has active implementation in the repo rather than being a blank future-only sprint.
- My Card / digital vCard / scan-contact surfaces are seeded in code and linked into the broader workflow.

## What this repo still needs before release confidence is claimed
1. **Fresh proof refresh**
   - run `npm ci`
   - run `npm run typecheck`
   - run `npm test`
   - run `npm run build`
2. **Dashboard closure**
   - finish canonical action-first dashboard behavior and remove lingering preview/fallback drift
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
