# Current Release Status

## Status

Setu Flow CRM is in a clean baseline state with public client onboarding, admin onboarding setup, trade-events command center, mobile scan improvements, and current DCC/reference HTML handoffs.

## Current readiness

| Area | Status | Notes |
|---|---|---|
| Public onboarding | Ready | `/onboarding` is public and posts to the public onboarding API. |
| Admin onboarding | Ready | `/admin/client-onboarding` is admin-gated and supports workspace setup handoff. |
| Workspace URL rule | Ready | New workspace intent uses `companyname.setuflowcrm.com`. |
| Default setup | Ready | Markets, countries, pipelines, pipeline stages, and next steps are preloaded as editable defaults. |
| Product categories | Ready by design | Client creates categories after first admin login. |
| Pricing rules | Ready by design | Captured as client-specific notes and configured per workspace. |
| DCC/reference HTML | Ready | Current internal and reference HTMLs are updated. |
| Docs | Ready | Active docs are consolidated and current. |
| Regression tests | Ready | Current `npm test` suite passes. |

## Test result

```text
npm test
58/58 tests passed
```
