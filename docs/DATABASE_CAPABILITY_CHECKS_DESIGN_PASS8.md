# Database-Level Capability Checks Design — Pass 8

Date: 2026-04-30

This design mirrors the current app-layer permission model. It is not an applied migration.

## Existing app-layer model

Source files:

- `src/lib/workspace/permissions.ts`
- `src/lib/workspace/roles.ts`
- `tests/security/rls-boundaries.test.ts`
- `tests/security/order-auth-boundaries.test.ts`

### Capabilities

The app defines six workspace capabilities:

1. `catalog.manage`
2. `settings.manage`
3. `lead.manage`
4. `quote.send`
5. `compliance.review`
6. `reporting.view`

### Roles

The app recognizes nine roles: `owner`, `admin`, `manager`, `sales`, `operations`, `sourcing`, `procurement`, `contributor`, and `viewer`.

The role alias `ops` resolves to `operations`. Multi-role behavior is additive: if any normalized role has a capability, the user has that capability.

## Capability mapping

| Capability | Required for | Roles allowed |
|---|---|---|
| `catalog.manage` | Product/catalog/pricing writes | owner, admin, manager |
| `settings.manage` | Reference data, organization settings, admin lists | owner, admin, manager |
| `lead.manage` | Leads, quick edits, lead queue, order document upload/progress gate where currently used | owner, admin, manager, sales, operations, sourcing, procurement, contributor |
| `quote.send` | Quote send/final commercial actions | owner, admin, manager, sales |
| `compliance.review` | Compliance and document blocker review | owner, admin, manager, operations |
| `reporting.view` | Reporting and audit history | owner, admin, manager, sales, operations, contributor, viewer |

## Why DB-level checks are needed

App-layer checks are necessary but not sufficient when SECURITY DEFINER functions are exposed through PostgREST RPC endpoints. A signed-in user, and in some current advisor findings an anonymous user, may be able to call exposed RPCs directly unless the function itself verifies organization membership and capability.

Database-level checks should act as a backup enforcement layer for high-risk write RPCs.

## Proposed helper

```sql
-- Draft only. Do not apply until schema/signatures are reviewed.
public.app_has_workspace_capability(
  p_organization_id uuid,
  p_user_id uuid,
  p_capability text
) returns boolean
```

Expected behavior:

- Return `false` when user is null, organization is null, capability is unknown, or membership is inactive.
- Normalize role aliases such as `ops` to `operations`.
- Support multi-role membership if the DB schema permits multiple active rows per user/workspace.
- Return `true` only when at least one active membership role maps to the requested capability.

Required lookup:

- `organization_members.organization_id`
- `organization_members.user_id`
- role field used by the current schema
- active/enabled membership field if present

## Negative test plan

| Scenario | Expected result |
|---|---|
| viewer cannot progress order | RPC rejects |
| viewer cannot update compliance | RPC rejects |
| sales cannot catalog manage | RPC rejects |
| operations cannot send quote if not allowed | RPC rejects |
| anon cannot execute privileged RPCs | Permission denied before function body |
| inactive member cannot execute privileged RPCs | RPC rejects |
| cross-workspace member attempts write | RPC rejects |

## Non-claims

No DB helper was applied in Pass 8. No RPC has been modified to call the helper yet. This is the design that should guide Pass 9 implementation if authorized.
