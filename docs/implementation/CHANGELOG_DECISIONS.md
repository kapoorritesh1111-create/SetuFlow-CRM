# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-08 — Sprint 6 rollback of quote compliance DOM enhancer

Decision:

- Production screenshots and console logs showed the quote compliance blocker remained after quote waiver/defer attempts.
- The temporary `QuoteComplianceFixEnhancer` DOM injection also caused React production runtime errors `#425` and `#422` in the browser console.
- Removed the enhancer from the authenticated app shell so it no longer mutates the rendered quote builder after hydration.
- The quote blocker is still a Sprint 6 blocker and must be fixed in the real quote review component and/or quote gate source of truth, not through DOM patching.
- Next implementation must make the quote review gate treat reviewed quote waiver/defer records as clearing the send gate, and must expose any fix action as first-class React UI owned by the quote review panel.

Files:

- `src/app/(app)/layout.tsx`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No schema change.
- No quote PDF/share/send changes.
- No silent quote send.
- No hidden DOM injection.
- No duplicate compliance page routing.

---

## 2026-05-07 — Sprint 6 inline quote-review compliance fix attempt

Decision:

- Production screenshot showed the separate Compliance Assist page still felt disconnected from quote builder, and defer was not visibly saving in the quote workflow.
- An inline DOM enhancer was added as a temporary quote-review repair path.
- Follow-up production testing showed that this approach was not acceptable for SaaS UX and caused React runtime instability, so it is no longer the accepted path.

Protected next direction:

- Implement the fix directly inside `leads-workspace.tsx` or a proper quote review child component.
- Do not use layout-level DOM mutation for quote workflow controls.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100% complete.
