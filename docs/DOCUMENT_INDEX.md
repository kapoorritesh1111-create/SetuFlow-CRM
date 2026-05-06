# SETU Flow Documentation Index

_Last updated: 2026-05-05_

This is the active documentation set after the cleanup pass. Static reference HTML handoff files are paused and removed from the active repo package for now.

## Active docs

| File | Use it for |
| --- | --- |
| `README.md` | Main repo handoff, setup, cleanup notes, and Supabase review summary. |
| `CHANGES.md` | Chronological changes and release notes. |
| `docs/CURRENT_RELEASE_STATUS.md` | Current release posture, readiness, and known follow-ups. |
| `docs/CURRENT_SCHEMA.md` | Live Supabase schema summary and database source-of-truth notes. |
| `docs/ARCHITECTURE.md` | App architecture, route/data patterns, and ownership boundaries. |
| `docs/PRODUCT_OVERVIEW.md` | Product surfaces and module responsibilities. |
| `docs/MOBILE.md` | Mobile app, canonical mobile shell, Share vCard, and signed-in identity behavior. |
| `docs/MOBILE_SCAN_PRODUCTION.md` | Production business-card scan configuration and readiness checks. |
| `docs/CLIENT_ONBOARDING.md` | Public onboarding and admin setup workflow. |
| `docs/OPERATIONS_RUNBOOK.md` | Operational checks, deployment posture, and Supabase advisor follow-ups. |
| `docs/RELEASE_READINESS.md` | Release gate checklist and open hardening items. |
| `docs/RELEASE_PROOF.md` | Proof commands and expected regression evidence. |
| `docs/SECURITY_POLICY.md` | Security and access-control expectations. |
| `docs/AI_GUARDRAILS.md` | AI review, draft, and operator-control boundaries. |
| `docs/UX_RULES.md` | UX consistency and layout rules. |
| `mitigation/README.md` | Retained database mitigation notes for investigation context. |

## Removed from active package

The following were removed during cleanup and should stay absent unless a future sprint intentionally regenerates them:

- static reference HTML handoff pages
- internal DCC static HTML pages
- local Supabase CLI temp state
- root one-off patch scripts
- duplicate root mobile docs now covered under `docs/`

## Update rule

Before updating the README with schema or readiness claims, review the live Supabase project and update `docs/CURRENT_SCHEMA.md` first.
