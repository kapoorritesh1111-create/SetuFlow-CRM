# Setu Flow Mobile 2.1 — Design & Engineering Guideline

Status: **Design baseline / implementation contract**, not a statement of completed UI acceptance. Linked to SMC S43-MOB-000..010. Current baseline: main at 25a3bd73f50dc6186cdc5d7b13c9d1c83522bd8a. Refer to [the capability matrix](SETU_FLOW_MOBILE_2_1_CAPABILITY_MATRIX.md) for all 26 capability entries.

## Product rules (locked direction)

- Preserve the user-approved Mobile 2.0 dark navy/teal premium visual hierarchy and source screens. Do not adopt an unapproved replacement redesign. All modules share a single design system and canonical backend.
- Five bottom-nav slots maximum, derived from the authenticated **organization module grant**, **authenticated user permission**, and **available destination**. Stable Home and More. Role presets are suggestions, never privilege elevation. Mobile routes must use the same entitlement resolver and security policy as desktop/API.
- Do not duplicate primary tabs as generic Home quick actions. Home should feature up to three meaningful user-scoped KPIs, assigned work, Setu Guru where enabled, and purpose-specific shortcuts.
- Do not display a disabled module, its KPI, notifications deep link or disabled action. Stark Packmate has `orders_compliance=false` and `setu_mail=false`; those destinations and metrics must not appear for it.
- Missing, failed or malformed grants are **unknown**, not authorization. Never return all modules after authentication or grant lookup failure. For legacy tenants with no grant rows, determine actual entitlement policy explicitly rather than treating empty rows as an all-access license.
- User theme preferences: System / Light / Dark. Existing `ThemeToggle` and `lib/theme` should be extended via semantic tokens; no hardcoded white-on-white or dark-on-dark; preserve OS safe areas, 44px touches, accessible labels, focus and text scaling.
- SETU Mail is a separate installable communication workspace when licensed, with independent app scope and push. Organization Admin appears only for authorized customer admins; internal SMC uses additional internal permission. Never infer internal access from organization name alone.

## Canonical reusable mobile screen patterns

1. Home: role-scoped KPIs, next actions, up to three contextual quick actions; tap opens authorized destination.
2. Queue: search, assigned/owner scope, status filters, explicit loading/empty/error, swipe alternative actions.
3. Detail: customer context header, clear stage/status, accessible contacts, activity, requirements, quote/artwork and follow-up actions with source-of-truth persistence.
4. Capture/edit: full-screen accessible form/drawer; real scanner/permission/validation state; no inert CTA; duplicate warning.
5. Conversation: actual Interakt/IndiaMART messages, owner attribution, approved WhatsApp template restrictions and real unread state.
6. Quote: product/requirements, configure/price, commercials, review/send; preserve edit/duplicate/remove, MOQ, approvals, PDF and no mandatory email for sharing.
7. Event/offline: eventId, buyer/supplier mode, explicit queue and sync state, retry and idempotent upload. Do not claim all CRM works offline.
8. Approval: provenance, amount/change/threshold, allow/deny authority, confirmation and audit; no unsafe bulk approval.
9. Analytics: three primary metrics then drills, distinguish user/team/org scopes, avoid invented KPI counts.
10. Admin: owner/admin command center for people/invites, approvals, integrations health and audit; complex pricing matrices, credential rotation and destructive configuration desktop-first.
11. More: only entitled modules, organized by workflow; CRM Mail shortcut only when licensed and deep-linking to its standalone shell.

## Visual acceptance before broad roll-out

Present Stark Packmate Home, More, Leads, Quotes and Admin Command Center in both dark/light at iPhone 375, 390, 430 logical widths. Present another tenant with Orders and Mail enabled. Keep screenshots connected to authentic feature grants and existing workflow labels. Original Mobile 2.0 user-approved collage is authoritative; verify its source image availability before claiming pixel comparison.

## Implementation / QA gates

- S43-MOB-001 audit entire permission and RLS paths, role/grant matrix, no DB mutation during discovery.
- S43-MOB-002 build shared fail-closed authorization-aware navigation used by header, Home, bottom and More, notification links, and server API guards; test no-grant vs denied vs enabled.
- S43-MOB-003..009 implement and visually validate in logically grouped batches, with a single feature branch/PR and preview deploys only; preserve existing desktop business logic.
- S43-MOB-010 run package test suite, lint/typecheck, build, security/tenant/quote/Mail regressions, iPhone/Android/PWA and offline, preview exact SHA READY; obtain visual signoff and merge once. Verify production exact SHA READY plus smoke. Never claim tests run when only source assertions are checked.

## Initial evidence and risk log

- `src/lib/navigation/nav-items.ts` hardcodes Orders/Mail tabs and More items.
- `src/features/mobile/components/mobile-bottom-tabs.tsx` builds from static arrays, without grant resolution.
- `src/features/mobile/components/mobile-navigation.tsx` hardcodes Orders shortcuts/KPI.
- `src/app/api/modules/grants/route.ts` currently returns all MODULE_KEYS on missing workspace or query error and when no grants exist: **security/UX contract defect; address before routing refactor**.
- `src/lib/modules/module-grants.ts` enables almost all modules for empty grants. Determine legacy tenant default policy before tightening.
- `src/features/mobile/components/theme-toggle.tsx` already implements System/Light/Dark.
- `src/features/trade-events/components/trade-event-offline-capture.tsx` already uses offline queue + sync; requires device QA.

No production changes are authorized by the creation of this design guideline alone.
