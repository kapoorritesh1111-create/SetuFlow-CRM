# Mobile 2.1 consolidated source candidate - NOT RELEASE CERTIFIED

Source: uploaded feat/mobile-2-1-adaptive-workspace archive, October 12, 2026.

## Changes made against the uploaded source
- Trade Show offline queue no longer silently discards unsynced captures after seven days or when more than 150 entries are present.
- Queue-full or storage-unavailable errors now clearly indicate that the new lead was not saved offline.
- Offline capture UI clarifies the retention/sync state.
- Regression tests updated and added for retention and current grant behavior.

## Verified
- `node --test tests/mobile-v2-1-*.test.mjs tests/trade-events-premium.test.mjs` -> 43 passed / 0 failed.
- `node --test tests/mobile-*.test.mjs tests/trade-events-premium.test.mjs` -> 77 passed / 18 failed, including pre-existing mobile capture/lead surface assertions. These require actual resolution; do not dismiss them as merely outdated.

## Unverified; blocks release certification
- `npm ci` failed in the provided execution environment; dependencies are unavailable. No trustworthy TypeScript or `next build` verification can be reported.
- Device/browser visual tests at 375 / 390 / 430px, Wallet provider tests, tenant-authenticated Orders/Mail tests, customer quote artwork/KLD mapping, and offline reconnection device QA remain outstanding.
- The uploaded source is a ZIP without `.git`; no commit can be inferred from the archive itself.

## Release restriction
- DO NOT merge or deploy to production based solely on this ZIP. This is a SOURCE CANDIDATE, not a compiled production build.
- Do not overwrite the feature branch without reconciling live GitHub HEAD.
