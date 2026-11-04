# Mobile 3.1 — Production acceptance gate

Status: **NOT APPROVED FOR PRODUCTION**. Source changes and green CI are prerequisites, not evidence of real-device acceptance.

## Release goal
One customer-facing PWA on https://www.setuflowcrm.com/mobile, with consistent navigation and actual CRM data. No alternate demo screen or fake controls. No changes to approved Pricing V5 manufacturing calculations, Interakt/IndiaMART assignment policies, live lead ownership, or Supabase RLS for this release.

## Test identities
Use authorized, seeded test users, not customer credentials in scripts:
- Stark Packmate owner/admin: navigation, notifications, approvals and assignment visibility
- Stark Packmate sales user: CRM lead, requirement, quote, follow-up and Trade Show capture
- A restricted or unlicensed workspace user: module controls and access denial
- A user belonging to more than one organization: switch and verify that neither UI nor API shows prior organization's data

Geeta is a desktop-only acceptance case; coordinator mobile polish is out of scope.

## Mandatory P0 journeys (all must pass)
1. New and returning user signs in, enters Mobile 3.0 on phone, lands in a real licensed workspace. Sign out and back in; no blank shell or legacy dashboard loop.
2. Open installed iPhone PWA, lock phone, background it, return and refresh; resume authenticated screen without losing an unsaved draft. If session expires, preserve safe local draft and request sign-in rather than silently discarding edits.
3. Home, Leads, Quotes, Tasks, More, Guru, vCard and Notifications retain coherent mobile navigation across standalone /mobile and canonical CRM routes. There is one Home destination.
4. Sales user opens an actual lead, sees correct owner/history/notes/requirements, adds a reviewable note and requirement, saves, reloads, and verifies the persisted record; no duplicates.
5. Quick Quote: service family, form, open web width, construction, optional zipper, quantity and production MOQ; verify against owner-approved Pricing V5 spreadsheet examples. See comparable higher-quantity savings, adjust only within allowed policy, create valid quote and PDF. No fabricated prices, stale duplicated prices or unintended sends.
6. Trade Show: scan card, review extraction, save exactly one authorized lead, validate original assignment, attach requirement, schedule follow-up. Differentiate CRM saved, local queued, Interakt accepted, catalog sent and delivered. Offline-to-online replay must not create duplicate leads.
7. Setu Guru opens from every mobile header; speech transcript editable before sending; unsupported browser shows useful alternative.
8. Share vCard and QR from real saved public slug; VCF downloads correctly. Apple/Google Wallet either succeeds on supported device or exposes a truthful fallback.
9. Owner/admin functions are visible only with server-granted permissions; sales and cross-org members cannot see unauthorized data. Revocation and organization switching must invalidate old controls.
10. Notifications: permission, service-worker registration, PWA foreground/background and deep link back to correct lead/meeting; verify 15-minute reminder behavior.

## Device matrix
- Physical iPhone Safari (fresh browser, existing session)
- iPhone installed PWA (home screen) including background/resume and browser storage
- Android Chrome and installed PWA
- Desktop Chrome for regression and owner/admin tasks
- Playwright mobile Chromium and authenticated staging test user: useful automation, *not* a substitute for physical iPhone/Android

## Reliability/error gates
- No P0/P1 data loss, duplicate quote/lead creation, permissions leak, wrong pricing, or fake success status.
- API unavailable: explicit retry, no made-up zero metrics, no unauthorized fallback. Once recovered, current organization entitlements are loaded.
- Previous workspace data must never persist into a newly selected workspace.
- No dead navigation or inert controls.
- Stable touch targets, safe area, keyboard, scrolling, dark/light mode, focus order.
- Full Production Build, Check DB Type Drift, Pricing V5 Verify, and authenticated E2E run green on the **exact release commit**; document unresolved baseline failures separately.
- Verify production Vercel READY, correct alias, login, home and customer workflow after release. Roll back immediately on a new P0.

## Weighted 9.5 scoring (evidence required)
| Criterion | Weight |
| --- | ---: |
| End-to-end sales workflows | 30% |
| PWA reliability and session integrity | 25% |
| Usability and visual finish | 15% |
| Permissions, data accuracy and pricing | 15% |
| Performance and accessibility | 10% |
| Notifications and integrations | 5% |

The weighted score must reach 9.5/10, **each critical criterion at least 9.0**, and all P0 cases pass. A green CI build never substitutes for device and customer workflow verification. Record each device, identity/role, test timestamp, test evidence and defects before marking this release approved.

## Deployment discipline
Finish and review the consolidated PR, test with staging fixtures and physical devices, then make one controlled production merge/deployment. Avoid multiple incremental production fixes that conceal root causes.
