# Client Onboarding

## Goal

Setu Flow onboarding turns a new client request into a configured workspace, a reserved workspace URL, and a first-admin invitation.

The intended business flow is:

```text
Client submits public form -> Setu Flow admin receives notification -> Admin drafts workspace -> Admin sends first admin invite
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
| Markets | Created from onboarding form and editable/removable in Admin. |
| Countries | Created from onboarding form and editable/removable in Admin. |
| Pipelines | Created from onboarding form and editable/removable in Admin. |
| Pipeline stages | Created from onboarding form and editable/removable in Admin. |
| Next steps | Created from onboarding form and editable/removable in Admin. |
| Product categories | Not created by default; client creates after login. |
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
- Draft workspace.
- Move request status forward.
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
RESEND_API_KEY=
SETU_NOTIFICATION_FROM_EMAIL=
SETU_ONBOARDING_ADMIN_EMAIL=admin@setugroups.com
```

The request should save even when email delivery is not configured. In that case the notification status records the missing email environment state.

## Hydration guard

The admin onboarding route uses the authenticated app shell. Shell components must not read browser-only values such as `window.location.href` or `window.location.hostname` during the first client render. Browser URL values should be populated only after hydration with `useEffect`.

Regression test:

```text
tests/pass39-hydration-shell.test.mjs
```
