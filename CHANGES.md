# Changelog

## Current clean baseline

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
- Admin setup preloads editable markets, countries, pipelines, pipeline stages, and next steps.
- Product categories and pricing rules remain client-specific setup after first login.
- Admin-shell hydration guard is included for desktop-only redirect behavior.
- Internal DCC and reference HTMLs reflect the current baseline.

## Verification

```text
npm test
58/58 tests passed
```
