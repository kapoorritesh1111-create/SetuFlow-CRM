# Setu Flow CRM

Setu Flow CRM is the current baseline for a trade-focused CRM used by import/export teams. It combines lead capture, buyer/supplier follow-up, quotes, approvals, orders/execution, trade events, catalog governance, and client workspace onboarding.

## Current baseline

This repo is now treated as the clean baseline. Historical pass/archive documents and duplicate DCC/reference files have been removed from the active tree. The active source of truth is:

- `README.md`
- `CHANGES.md`
- `docs/DOCUMENT_INDEX.md`
- `docs/CURRENT_RELEASE_STATUS.md`
- `docs/CLIENT_ONBOARDING.md`
- `docs/PRODUCT_OVERVIEW.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/RELEASE_READINESS.md`
- `docs/RELEASE_PROOF.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_SCHEMA.md`
- `public/internal-dcc/index.html`
- `public/internal-dcc/mobile-blueprint.html`
- `public/reference-html/*.html`

## Primary routes

| Route | Purpose | Access |
|---|---|---|
| `/onboarding` | Public client workspace request form | No login required |
| `/onboarding/received` | Public confirmation after form submission | No login required |
| `/admin/client-onboarding` | Setu-internal SaaS provisioning wizard for onboarding requests | Setu platform admin only |
| `/admin/invitations` | Send first admin login after workspace setup | Admin login required |
| `/dashboard` | Leadership overview | Authenticated |
| `/leads` | Follow-up workspace | Authenticated |
| `/quotes` | Quote workspace | Authenticated |
| `/approval-send` | Approval and send readiness | Authenticated |
| `/orders` | Order/execution workspace | Authenticated |
| `/pipeline` | Pipeline/risk view | Authenticated |
| `/trade-events` | Trade event command center | Authenticated |
| `/products` | Catalog workspace | Authenticated |

## Client onboarding behavior

The client onboarding flow is intentionally controlled:

1. Client submits `/onboarding` without logging in.
2. The request saves through `POST /api/public/client-onboarding`.
3. Admin notification is sent to `admin@setugroups.com` when email configuration is present, and admins can resend that notification from `/admin/client-onboarding` if an earlier attempt failed or environment variables were added later.
4. The notification includes a setup link to `/admin/client-onboarding?request=<request_id>`.
5. Setu Flow admin runs the SaaS provisioning wizard.
6. The wizard creates a unique organization ID, seeds all countries and editable reference defaults, creates the first owner invitation, and the client lands in their own workspace after accepting the invite.

Workspace URL format:

```text
companyname.setuflowcrm.com
```

If the client does not provide a logo, the Setu Flow logo is used as the default workspace logo.

Defaults preloaded during setup:

- All countries from the Setu platform country reference list
- Markets
- Pipelines
- Pipeline stages
- Next steps
- Owner/admin/sales/operations/viewer roles
- Pricing engine starter settings

Client-created after login:

- Product categories
- Product records
- Client-specific pricing rules

## Environment variables

Core production variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://setuflowcrm.com
```

Onboarding notifications:

```text
SETU_EMAIL_PROVIDER=mailtrap
MAILTRAP_API_KEY=
MAILTRAP_USE_SANDBOX=false
MAILTRAP_SANDBOX_ID=
SETU_NOTIFICATION_FROM_EMAIL=Setu Flow <help@setugroups.com>
SETU_ONBOARDING_ADMIN_EMAIL=admin@setugroups.com
# Optional fallback only if switching SETU_EMAIL_PROVIDER=resend
RESEND_API_KEY=
SETU_INTERNAL_ORG_SLUG=setu-flow
```

`SETU_EMAIL_PROVIDER=mailtrap` makes onboarding alerts use Mailtrap. `SETU_NOTIFICATION_FROM_EMAIL` must be a sender on a Mailtrap-verified domain, and `SETU_ONBOARDING_ADMIN_EMAIL` is the internal recipient. Use `MAILTRAP_USE_SANDBOX=true` only when you want messages captured in the sandbox instead of delivered to real inboxes.

Mobile scan provider variables are documented in `MOBILE_SCAN_PRODUCTION.md`.

## Install and run

```bash
npm install
npm run dev
```

## Verification

Primary repo verification:

```bash
npm test
```

Current expected test summary for this baseline:

```text
68/68 tests passed
```

Full release verification script:

```bash
npm run verify
```

The release verification script runs clean verification, typecheck, contract checks, dashboard freeze checks, tests, and build. In constrained containers, `npm run typecheck` or `npm run build` may time out if dependencies are not fully installed or the build process exceeds the execution window.

## Repo structure

```text
src/                    Next.js app, components, features, libraries
supabase/migrations/    Database migrations retained as deployment history
public/internal-dcc/    Current internal DCC and mobile blueprint HTML
public/reference-html/  Current reference HTML surfaces
docs/                   Current product, release, architecture, and operations docs
tests/                  Current regression tests
scripts/                Verification and smoke-check scripts
mitigation/             Retained SQL mitigation assets and execution notes
```

## Clean-baseline policy

- Do not add pass-numbered docs for new work.
- Do not reintroduce archive folders, duplicate DCC files, or retired reference HTMLs.
- Keep the README, CHANGES, current docs, DCC HTML, and reference HTMLs updated together.
- Keep old implementation history out of the active repo unless it is required migration history or an active regression test.
