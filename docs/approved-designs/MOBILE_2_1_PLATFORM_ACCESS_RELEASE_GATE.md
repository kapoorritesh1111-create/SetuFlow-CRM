# Mobile 2.1 — SETU platform access release gate

Status: **approved identity; production provisioning intentionally pending**.

- Primary product organization: SETU Flow (`setu-flow`).
- Designated platform administrator: `admin@setugroups.com`, verified profile ID `180afa12-6ff6-4e16-b8d1-04b13e508970`.
- Existing active platform-support account: `support@setugroups.com`.
- Babin onboarding: explicitly deferred.

## Release procedure (not executed)

After explicit production-change approval, an authorized operator must verify the account identity again, enroll it in the existing `platform_support_users` registry, and invoke the existing `sync_platform_support_memberships` provisioning mechanism. Do not grant product-level access using an email/name check at runtime. Do not bypass tenant membership or customer roles.

## Acceptance tests

1. Registry includes active verified SETU admin and active Support.
2. Both accounts have active `is_internal_support` membership and owner role in all organizations.
3. Both can use the existing `/support` organization picker and switch back to the SETU Flow organization.
4. Module-grants API returns enabled modules for the registered platform identities even for tenant-disabled modules.
5. Unregistered tenant staff cannot switch into another organization, read its records or obtain platform-granted modules.
6. Validate client mobile routes, API direct access, and privileged writes for all role classes before Step 2 closure.
7. Check exact GitHub CI SHA and Vercel deployment; do not confuse a READY preview with a production release.

This document intentionally contains no runnable elevation script or automatic production change.
