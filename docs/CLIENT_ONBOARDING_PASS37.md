# Client Onboarding Pass 37

Date: 2026-05-03

## Product decision

Setu Flow now treats new-client setup as a controlled onboarding flow:

1. Client fills the public onboarding form at `/onboarding`.
2. Setu Flow reviews the request in `/admin/client-onboarding`.
3. Setu Flow creates the client workspace and reserves `companyname.setuflowcrm.com`.
4. Setu Flow preloads editable workflow defaults.
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

Added `supabase/migrations/20260503_client_onboarding_requests.sql`.

## Notes

- Wildcard host routing for `*.setuflowcrm.com` still needs production DNS/Vercel configuration.
- The app now records the intended workspace domain as `companyname.setuflowcrm.com` during onboarding.
- First-admin login continues through the existing `/admin/invitations` flow.
