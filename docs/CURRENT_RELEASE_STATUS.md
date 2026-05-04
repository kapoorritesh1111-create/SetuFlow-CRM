# Current Release Status

## Status

Setu Flow CRM is in a clean baseline state with public client onboarding, Setu-internal SaaS workspace provisioning, trade-events command center, mobile scan improvements, and current DCC/reference HTML handoffs.

## Current readiness

| Area | Status | Notes |
|---|---|---|
| Public onboarding | Ready | `/onboarding` is public and posts to the public onboarding API. |
| Admin onboarding | Ready | `/admin/client-onboarding` is Setu-internal only and supports SaaS provisioning plus Mailtrap admin email retry. |
| Workspace URL rule | Ready | New workspace intent uses `companyname.setuflowcrm.com`. |
| Default setup | Ready | All countries are seeded for every org; markets, pipelines, pipeline stages, next steps, roles, and pricing starter settings are provisioned. |
| Product categories | Ready by design | Client creates categories after first admin login. |
| Pricing rules | Ready by design | Captured as client-specific notes and configured per workspace. |
| DCC/reference HTML | Ready | Current internal and reference HTMLs are updated. |
| Docs | Ready | Active docs are consolidated and current. |
| Regression tests | Ready | Current `npm test` suite passes, including onboarding Mailtrap notification resend wiring. |

## Test result

```text
npm test
68/68 tests passed
```
