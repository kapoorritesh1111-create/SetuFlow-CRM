# Release Readiness

## Summary

The repo is ready to be treated as the current clean baseline for continued Setu Flow development with onboarding notification resend. Old pass/archive files and duplicate retired HTMLs have been removed from the active tree.

## Readiness checklist

| Check | Status | Evidence |
|---|---|---|
| Active README updated | Ready | `README.md` describes the current baseline. |
| Active docs updated | Ready | `docs/DOCUMENT_INDEX.md` lists current docs only. |
| Internal DCC updated | Ready | `public/internal-dcc/index.html` shows current test results and baseline scope. |
| Reference HTMLs updated | Ready | `public/reference-html/*.html` have current baseline handoff notes. |
| Public onboarding remains public | Ready | `/onboarding` stays outside authenticated app shell. |
| Admin onboarding remains protected | Ready | `/admin/client-onboarding` uses admin workspace guard and exposes Resend admin email. |
| Hydration guard retained | Ready | Desktop redirect avoids first-render browser-only reads. |
| Tests | Ready | `npm test` passes. |

## Current verification

```text
npm test
60/60 tests passed
```

## Release gate

Use:

```bash
npm run verify
```

The verification command includes clean verification, typecheck, contract checks, dashboard check, regression tests, and production build.

## release:proof

The release proof marker remains `release:proof` through the package script and route manifest contract.
