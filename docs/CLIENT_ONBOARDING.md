# Client Onboarding

## Goal

Setu Flow onboarding turns a new client request into a configured workspace, a reserved workspace URL, and a first-admin invitation.

The intended business flow is:

```text
Client submits public form -> Setu Flow admin receives notification -> Admin runs provisioning wizard -> system creates org tenant and first owner invite -> client accepts invite into their workspace
```

## Public client form

Route:

```text
/onboarding
```

Requirements:

- Must be accessible without Setu Flow login.
- Must not sit behind the authenticated app shell.
- Must not depend on server actions for browser submission.
- Submits through:

```text
POST /api/public/client-onboarding
```

The form captures:

- Company name
- Website
- Logo URL, optional
- Headquarters country
- First admin name
- First admin email
- Desired markets
- Countries
- Desired pipelines
- Pipeline stages
- Next steps
- Pricing rule notes
- Trade-event preference
- Product/category notes

## Logo behavior

If the client does not provide a logo, Setu Flow uses:

```text
/logos/setu-flow-logo.png
```

## Workspace URL rule

New workspace URLs follow:

```text
companyname.setuflowcrm.com
```

The company name is normalized into a lowercase slug before reservation.

## Defaults created during setup

When the admin drafts the workspace, Setu Flow preloads editable defaults:

| Item | Behavior |
|---|---|
| Markets | Created from default/requested setup and editable/removable in Admin. |
| Countries | All countries are copied from the Setu platform country reference list for every new organization. Client-entered countries are treated as focus countries only. |
| Pipelines | Created from onboarding form and editable/removable in Admin. |
| Pipeline stages | Created from onboarding form and editable/removable in Admin. |
| Next steps | Created from onboarding form and editable/removable in Admin. |
| Product categories | Not created by default; client creates after login. |
| Roles | Owner, admin, sales, operations, and viewer roles are seeded for the new organization. |
| Pricing engine settings | Starter settings are created; pricing notes are retained for admin review. |
| Pricing rules | Captured as notes for admin review because each client may price differently. |

## Admin command center

Route:

```text
/admin/client-onboarding
```

Capabilities:

- Review submitted onboarding requests.
- See requested workspace domain.
- Review company, first admin, market, country, pipeline, stage, next-step, pricing, and product-category notes.
- Run the SaaS provisioning wizard.
- Create a unique organization row and tenant-scoped setup package.
- Seed all countries, markets, pipelines, stages, next steps, roles, and pricing settings.
- Prepare the first owner invitation for the primary admin.
- Move request status forward.
- Resend the internal admin onboarding notification through Mailtrap when email configuration was added after the original request or an earlier send failed.
- Handoff to Admin -> Invitations to send the first admin login.

Deep link from notification:

```text
/admin/client-onboarding?request=<request_id>
```

## Notification

Default recipient:

```text
admin@setugroups.com
```

Environment variables:

```env
SETU_EMAIL_PROVIDER=mailtrap
MAILTRAP_API_KEY=
MAILTRAP_USE_SANDBOX=false
MAILTRAP_SANDBOX_ID=
SETU_NOTIFICATION_FROM_EMAIL=Setu Flow <help@setugroups.com>
SETU_ONBOARDING_ADMIN_EMAIL=admin@setugroups.com
# Optional fallback only if switching SETU_EMAIL_PROVIDER=resend
RESEND_API_KEY=
```

`SETU_NOTIFICATION_FROM_EMAIL` must be a sender on a Mailtrap-verified domain. `SETU_ONBOARDING_ADMIN_EMAIL` is the recipient for new-client setup alerts. Keep `MAILTRAP_USE_SANDBOX=false` in production delivery; set it to `true` only for sandbox capture.

The request saves even when email delivery is not configured. In that case the notification status records the missing email environment state. After fixing Vercel environment variables, use **Send admin email** on `/admin/client-onboarding` to send the notification for the same existing record.

## Hydration guard

The admin onboarding route uses the authenticated app shell. Shell components must not read browser-only values such as `window.location.href` or `window.location.hostname` during the first client render. Browser URL values should be populated only after hydration with `useEffect`.

Regression test:

```text
tests/hydration-shell.test.mjs
```

## SaaS isolation

Setu Flow uses one Supabase project with tenant-scoped rows. Each client gets a unique `organizations.id`; operational tables store that value in `organization_id`, and Row Level Security policies restrict reads/writes through membership checks such as `is_org_member(organization_id)` and `is_org_admin(organization_id)`. Client data does not bleed between organizations because users only receive memberships in their own organization.

`/admin/client-onboarding` is Setu-internal only. It is hidden from client workspaces and direct route access is guarded by the Setu platform organization check. The RLS policy for `client_onboarding_requests` is also restricted to Setu platform admins.

## Domains

Wildcard workspace routing is supported by `*.setuflowcrm.com` in Vercel. New client workspaces use `companyname.setuflowcrm.com`; the app resolves the host slug to the matching organization row.
