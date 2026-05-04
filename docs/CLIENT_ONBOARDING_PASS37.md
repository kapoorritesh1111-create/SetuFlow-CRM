# Client Onboarding Pass 38

Date: 2026-05-04

## Product decision

Setu Flow now treats new-client setup as a controlled onboarding flow:

1. Client fills the public onboarding form at `/onboarding` without logging in to Setu Flow.
2. The app stores the request and notifies `admin@setugroups.com` with a direct `/admin/client-onboarding?request=...` setup link.
3. Setu Flow creates the client workspace and reserves `companyname.setuflowcrm.com`.
4. Setu Flow preloads editable workflow defaults: markets, countries, pipelines, pipeline stages, and next steps.
5. Setu Flow sends the first admin login through the existing invitation system.

## Required defaults

When no client logo is supplied, the workspace setup uses `/logos/setu-flow-logo.png`.

| Area | Behavior |
|---|---|
| Pipeline stages | Client receives current/default stages and can edit or remove them. |
| Pipelines | Client receives current/default buyer/supplier pipelines and can edit or remove them. |
| Next steps | Client receives current/default next-step labels and can edit or remove them. |
| Markets | Client receives current/default markets and can edit or remove them. |
| Countries | Client supplies desired countries in the onboarding form; Setu Flow configures them during setup. |
| Product categories | Not pre-created. Client creates categories after first admin login. |
| Pricing rules | Captured as notes because pricing logic varies per client. |

## New routes

| Route | Purpose |
|---|---|
| `/onboarding` | Public client intake form. |
| `/onboarding/received` | Submission confirmation and reserved workspace domain preview. |
| `/admin/client-onboarding` | Internal onboarding command center for reviewing submissions, drafting workspaces, and moving to first-admin invitation. |

## Database migration

Updated `supabase/migrations/20260503_client_onboarding_requests.sql`. The table now records notification email, notification status, notification error, notification timestamp, and the direct admin setup URL.

## Notes

- Wildcard host routing for `*.setuflowcrm.com` still needs production DNS/Vercel configuration.
- The app now records the intended workspace domain as `companyname.setuflowcrm.com` during onboarding.
- First-admin login continues through the existing `/admin/invitations` flow.

## Hydration and public access fix

- `/onboarding` now posts to `/api/public/client-onboarding` with a standard HTML form action instead of binding the public form directly to a React server action.
- The route remains outside the authenticated `(app)` route group, so clients can access it without a Setu Flow login.
- Service-worker/offline sync startup is skipped on `/onboarding` pages to keep the public form lightweight and avoid hydration noise from app-only offline behavior.
- Root body hydration warnings are suppressed to reduce false positives from browser extensions mutating the body before React hydrates.

## Notification requirements

Outbound admin email uses Resend when these environment variables are available:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Sends the admin notification email. |
| `SETU_NOTIFICATION_FROM_EMAIL` | Sender address used by the email provider. |
| `SETU_ONBOARDING_ADMIN_EMAIL` | Optional override. Defaults to `admin@setugroups.com`. |

If the email variables are missing, the onboarding request still saves and records `notification_status = email_env_missing` so admins can see the setup link inside `/admin/client-onboarding`.
