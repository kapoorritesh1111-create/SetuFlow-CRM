# Setu Flow Release Readiness

## Current status
**Buyer-demo hardening interstitial applied on top of the locked baseline.**

This repo now removes public pathways into development pages, redirects workspace preview routes back to their canonical product routes, and hardens the My Card / public card / scan surfaces for safer buyer demos.

## What changed in this hardening pass
- Removed the homepage CTA that exposed development pages.
- Added route protection and redirects for `/development/*` and `/workspace/*`.
- Removed sprint and deadline language from the main buyer-facing app surfaces touched in this pass.
- Replaced third-party QR generation with local QR rendering.
- Fixed My Card defaults, buttons, brand styling, and public-card action behavior.
- Removed fake scan-page extraction content and simplified the scan experience to review-first messaging.

## Verification completed on this baseline
- `npm install`
- `npm run typecheck` ✅
- `npm test` ✅

## Remaining verification / blockers
1. **Fresh production build completion proof**
   - `npm run build` was started in this environment and reached the production-build phase, but did not emit a final completion line before the container session ended. Re-run once in the target environment to capture the final proof artifact for this exact baseline.
2. **Sprint 9 work still not started**
   - large-file cleanup, deeper architecture refactors, and broader route ownership cleanup remain for the next sprint.
3. **Optional polish still available**
   - broader copy cleanup in internal-only development assets and any remaining secondary preview components can be handled later because the public pathways are already closed.

## Honesty rule
Do not describe this repo as fully release-ready until a fresh production build completes on this exact hardened baseline.
