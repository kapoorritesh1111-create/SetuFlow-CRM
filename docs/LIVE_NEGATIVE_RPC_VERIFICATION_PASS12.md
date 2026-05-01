# Pass 12 — Live Negative RPC Verification

No safe test database, test credentials, or explicit authorization to execute mutation-prone live RPC checks was provided. Therefore Pass 12 does **not** run live negative RPC checks against production.

Existing pure assertion coverage remains in:

- `tests/security/rpc-grant-hardening.test.ts`
- `tests/security/db-capability-design.test.ts`
- `tests/security/rls-boundaries.test.ts`
- `tests/security/order-auth-boundaries.test.ts`

| Negative check | Expected result | Evidence | Status |
|---|---|---|---|
| `anon` cannot execute privileged RPCs | Privileged mutation RPCs should reject unauthenticated callers after grant hardening. | Draft grant-hardening plan and tests only; live grants not changed. | Pending live test DB / authorization |
| Viewer cannot progress order | Viewer lacks `lead.manage` / `compliance.review`; progression must be rejected. | App-layer tests cover this; live RPC verification pending. | Pending live safe check |
| Viewer cannot update compliance | Viewer lacks `compliance.review`; compliance update must be rejected. | App-layer tests cover this; DB-level enforcement pending. | Pending remediation |
| Sales cannot catalog manage | Sales lacks `catalog.manage`; catalog writes must be rejected. | App-layer role tests cover this; DB helper pending. | Pending remediation |
| Operations cannot send quote if not allowed | Operations lacks `quote.send`; direct quote-send RPC should be rejected. | App-layer tests cover this; direct RPC verification pending. | Pending remediation |
| Inactive member cannot execute privileged RPCs | DB helper should reject inactive memberships. | DB capability design exists only. | Pending implementation |
| Cross-workspace user cannot mutate records | DB helper/RLS must reject organization mismatch. | Design and tests pending live safe DB. | Pending implementation |

## Live verification boundary

Do not execute these against production until a safe test organization, non-golden records, scoped credentials, and rollback plan are confirmed.
