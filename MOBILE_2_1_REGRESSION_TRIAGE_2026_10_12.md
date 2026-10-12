# Mobile 2.1 regression repair (October 12, 2026)

**Local result:** `node --test tests/mobile-*.test.mjs tests/trade-events-premium.test.mjs`: 95 tests, 95 pass, 0 fail.

The 18 previously failing assertions were caused by tests targeting obsolete component locations, historic markup, or TypeScript path aliases in Node's raw test runner. Assertions were retargeted to the current lead-drawer implementation, Orders route layout, shared navigation, and pricing quote entrypoints. The role-aware fixture tests now execute an isolated copy of the same source with a relative import for the pure search dependency. The 15 MB server-action setting was preserved rather than lowered to obsolete 4 MB expectation.

**Scope limitations:** These are primarily regression-test repairs, not proof of end-to-end runtime behavior. Full Next.js/TypeScript local build remains unavailable because dependency installation is incomplete. Authenticated client QA, vCard Wallet provider, responsive device testing and licensed-module acceptance remain unverified. No production authorization is inferred; do not merge or deploy from this archive alone.
