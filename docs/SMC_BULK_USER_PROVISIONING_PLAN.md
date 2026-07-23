# SMC Bulk Client User Provisioning Plan

## Purpose

Add an internal-only Setu Mission Control workflow that allows authorized SETU Flow operators to create multiple login-ready users for any client organization.

This is intended for onboarding new SaaS customers, demos, migrations, and controlled test-account setup. It must not be exposed inside client workspaces.

## Access Model

The screen is available only to authenticated users who:

1. Belong to the SETU Flow internal organization.
2. Have an active SMC team record.
3. Have `can_manage_clients = true`, `can_manage_access = true`, or SMC role `owner`.

Client organization owners and admins must never be able to access this screen.

Recommended route:

```text
/smc/client-users
```

Recommended navigation placement:

```text
SMC → Growth → Client Orgs → User Setup
```

The page should also be reachable from the selected client organization through a `Set up users` quick action.

## Proposed Screen

### Header

```text
Client User Setup
Create login-ready users for a client organization
Internal only · All changes are audited
```

### Step 1 — Select Organization

Use a searchable organization picker showing:

- Organization name
- Workspace slug
- Plan
- Billing status
- Current active users
- Seat limit
- Remaining seats

The SETU Flow internal organization must be excluded from the picker.

After selection, show a compact organization summary card:

```text
Packaging
packaging.setuflowcrm.com
Plan: Enterprise
Users: 2 of 15
Available seats: 13
```

### Step 2 — Add Users

Display an editable grid with one row per user.

Columns:

- Full name
- Username
- Email
- Role
- Account method
- Temporary password
- Status
- Remove row

Actions:

- `+ Add user`
- `Paste rows`
- `Upload CSV`
- `Use role template`

Initial implementation should support manual rows and pasted CSV-style rows. File upload can be a second enhancement.

### Account Method

Two supported methods:

1. `Create login now`
   - Creates Supabase Auth user.
   - Marks email confirmed.
   - Requires a temporary password.
   - Does not require a working inbox.

2. `Send invitation`
   - Uses the existing invitation workflow.
   - Requires a real email inbox.
   - User chooses their password.

Default method for client onboarding should be `Send invitation` when emails are real. `Create login now` is intended for test accounts, demos, migrations, or customer-approved temporary credentials.

### Step 3 — Validation Preview

Before applying, show a validation table:

- Valid rows
- Duplicate emails in the batch
- Existing Auth users
- Existing organization members
- Invalid or unavailable usernames
- Missing roles
- Seat-limit impact
- Accounts that will be created
- Accounts that will be updated
- Accounts that will be skipped

No database or Auth changes should happen during validation.

### Step 4 — Confirmation

Require an explicit confirmation checkbox:

```text
I confirm these users should receive access to the selected client organization.
```

For password-based creation, require a second confirmation:

```text
I understand that temporary passwords must be shared securely and will not be stored in Setu Flow.
```

Primary action:

```text
Create 7 users
```

### Step 5 — Result

Show a per-user result table:

- Created
- Updated
- Skipped
- Failed
- Membership created
- Role assigned
- Password reset required

Allow export of a one-time onboarding CSV containing:

- Full name
- Username
- Email
- Assigned role
- Temporary password only when generated during the current operation
- Login URL

The password must never be saved to Supabase, audit logs, browser storage, or application logs.

## Role Behavior

The role picker must load:

1. Organization-specific roles for the selected organization.
2. Canonical global roles only when no same-name organization role exists.

The UI must deduplicate role names.

Recommended role ordering:

1. Owner
2. Admin
3. Manager
4. Sales
5. Operations
6. Design
7. Ordering
8. Sourcing
9. Procurement
10. Contributor
11. Viewer

Only an SMC owner or operator with `can_manage_access` should be able to assign the `owner` role.

## Backend Design

### API Route

Recommended endpoint:

```text
POST /api/smc/client-users/validate
POST /api/smc/client-users/provision
```

A single endpoint with `mode: validate | apply` is also acceptable, but separate endpoints are easier to audit and test.

### Server-only Supabase Client

Use:

```text
src/lib/supabase/service-role.ts
```

The service-role key must never be sent to the browser.

### Required Server Checks

Every request must verify:

1. Authenticated user exists.
2. User is an active member of the SETU Flow internal organization.
3. User has SMC client/access management permission.
4. Target organization exists.
5. Target organization is not the SETU Flow internal organization.
6. Target roles are valid for the selected organization.
7. Requested seats do not exceed the organization entitlement unless the operator has explicitly increased the seat limit first.
8. Batch size is within a safe limit, recommended maximum 50 users per request.

### Provisioning Sequence

For each row:

1. Normalize email and username.
2. Find existing Supabase Auth user by email.
3. Create or update Auth user through `auth.admin`.
4. Upsert `public.profiles`.
5. Create or reactivate `organization_members`.
6. Assign exactly one role using `app_update_member_role_tx`.
7. Set `active_organization_id` in Auth metadata.
8. Write an audit event.

The operation should be idempotent. Re-running the same valid batch should update or reuse the same users rather than creating duplicates.

## Audit Requirements

Write one batch-level audit event:

```text
smc_client_users_bulk_provisioned
```

Payload should include:

- Target organization ID and name
- Actor user ID
- Requested row count
- Created count
- Updated count
- Skipped count
- Failed count
- Role assignments
- Source: `smc_client_user_setup`

Never include passwords, service keys, tokens, or full invitation tokens in audit logs.

Each member role assignment should continue to use the existing role-change transaction and audit pattern.

## Security Requirements

- Internal organization membership alone is not enough; require SMC client/access permission.
- Do not allow browser-side use of the service-role client.
- Do not insert directly into `auth.users`.
- Do not store temporary passwords.
- Do not expose whether an email belongs to another organization beyond the minimum operational message.
- Protect the existing organization owner from accidental replacement.
- Do not delete existing roles or memberships from unrelated users.
- Rate-limit the provision endpoint.
- Add CSRF-safe same-origin handling through the existing authenticated Next.js route pattern.

## Recommended File Structure

```text
src/app/smc/client-users/page.tsx
src/app/smc/client-users/client-user-setup.tsx
src/app/api/smc/client-users/validate/route.ts
src/app/api/smc/client-users/provision/route.ts
src/lib/smc/client-user-provisioning.ts
tests/smc-client-user-provisioning.test.mjs
scripts/seed-packaging-role-test-users.mjs
```

## Delivery Sequence

### Phase 1 — Safe Foundation

- Keep the Packaging seed script in the repository.
- Add shared normalization and role-resolution helpers.
- Add SMC permission guard.
- Add validation endpoint.
- Add tests for access, duplicate detection, role resolution, and seat limits.

### Phase 2 — Internal UI

- Add `/smc/client-users`.
- Add organization selector.
- Add editable user grid.
- Add validation preview.
- Add confirmation step.
- Add result summary.

### Phase 3 — Client Onboarding Integration

- Add `Set up users` to Client Orgs quick actions.
- Preselect the client organization when launched from Client Orgs.
- Update onboarding stage after successful initial-user provisioning.
- Show user setup completion in the client health summary.

### Phase 4 — Enhancements

- CSV upload.
- Downloadable CSV template.
- Invitation mode.
- Password generator with one-time export.
- Resend/reset actions.
- Role templates by industry.

## Acceptance Criteria

- Only authorized SMC users can open the page or call the APIs.
- The internal SETU Flow organization cannot be targeted.
- A batch of at least 20 users can be validated and provisioned.
- Existing Auth users are reused safely.
- Existing organization members are reactivated instead of duplicated.
- Every user receives exactly one selected role.
- Organization-specific and global roles are deduplicated.
- Seat limits are enforced.
- Temporary passwords are never persisted.
- Every apply operation creates an audit trail.
- Existing owners are not removed or downgraded.
- Client users cannot access the screen or endpoints.
