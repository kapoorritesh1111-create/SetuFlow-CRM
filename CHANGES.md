# Changelog
- Added first-admin invite email flow: Setu admins can now send the client-facing owner/admin account creation link from onboarding without manually creating Supabase Auth users.

## Current clean baseline

- Added SaaS Workspace Provisioning Wizard for client onboarding.
- Provisioning now creates/uses a unique organization ID, seeds all country reference rows, markets, pipelines, stages, next steps, roles, pricing starter settings, and first owner invitation metadata.
- Client Onboarding is now Setu-internal only at route/sidebar/RLS-policy levels.
- Wildcard workspace domain model supports `companyname.setuflowcrm.com` via `*.setuflowcrm.com`.
- Added admin-side onboarding notification retry: each submitted request now has a **Notify Setu admin** action backed by Mailtrap.
- Consolidated onboarding email delivery into `src/features/client-onboarding/server/notifications.ts` so public submission and admin resend use the same Mailtrap-first provider configuration.
- Added regression coverage for onboarding Mailtrap notification resend wiring.
- Removed historical archive folders and duplicate/retired HTML files from the active repo.
- Promoted the current product state to the baseline instead of maintaining pass-by-pass handoff files.
- Renamed pass-numbered regression test files to feature-based names where safe.
- Updated README, current docs, internal DCC HTML, mobile blueprint HTML, and reference HTML handoff notes.
- Preserved required deployment history in database migration folders.
- Preserved current test-result format in the internal DCC.

## Current product state

- Public `/onboarding` client request form is accessible without login.
- Onboarding submission uses `POST /api/public/client-onboarding`.
- Admin receives onboarding notification when email variables are configured.
- Admin setup link targets `/admin/client-onboarding?request=<request_id>`.
- Workspace URL rule is `companyname.setuflowcrm.com`.
- Setu Flow logo is the fallback when no client logo is provided.
- Admin provisioning seeds all countries plus editable markets, pipelines, pipeline stages, next steps, roles, and pricing starter settings.
- Product categories and detailed pricing rules remain client-specific setup after first login.
- Admin-shell hydration guard is included for desktop-only redirect behavior.
- Internal DCC and reference HTMLs reflect the current baseline.

## Verification

```text
npm test
68/68 tests passed
```
