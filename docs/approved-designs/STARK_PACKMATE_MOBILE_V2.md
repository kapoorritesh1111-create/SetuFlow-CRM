# Stark Packmate Mobile 2.0 — locked release contract

Status: IMPLEMENTATION NOT YET APPROVED OR VERIFIED. SMC epic: S42-MOB-000; children S42-MOB-001..013.
Frozen source commit: `a9069e59bed512dd7b5f1bdf0dbcc745ab8a3fb7` (main, 2026-10-10). Production Vercel READY on same SHA: `dpl_HcMiSBi35EUZLRufEJw5s7N1hChL`.
Working branch: `feat/stark-mobile-v2-batched`. No intermediate merge to main.

## Design lock and visual authority

Original **nine-screen** user-approved composite from the Stark Packmate Mobile 2.0 discussion is the visual source of truth, NOT the subsequent four-phone alternate layout. Reference: user-provided file `1DDABCC2-4BB9-476A-BCAB-A15B2B651A42.jpeg` in ChatGPT discussion; the image must be copied to repository via approved asset workflow before final UI signoff. Preserve visual treatment and screens: Home, Leads, Lead Detail, Capture, Quotes, Follow-ups, Orders, More, Trade Show. Add only Notifications and Notification Detail for 11 total screens. Preserve dark visual language, five bottom tabs Home/Leads/Quotes/Orders/More, and top shortcuts: Capture, Setu Guru, vCard, bell, profile. Never invent sample metrics in real UI.

Setu Mail is a SEPARATE installable app with its own Mail/Calendar/People shell, push, manifest and lifecycle. CRM may deep-link to it; do not merge the app shells or introduce a second backend.

## Authoritative component entrypoints confirmed by GitHub main audit

- `src/lib/navigation/nav-items.ts`: canonical and standalone nav, More nav.
- `src/features/mobile/components/mobile-navigation.tsx`: header shortcuts, `MobileDashboardHome`, scope KPIs.
- `src/features/mobile/components/mobile-bottom-tabs.tsx`: five tabs, More sheet and existing `TradeEventOfflineSync`.
- `src/features/mobile/components/mobile-quotes-list.tsx`: canonical /quotes mobile list and quote detail. `/mobile/quote` redirects to `/quotes`.
- `src/features/trade-events/components/trade-events-mobile-workspace.tsx`: `EventModeBanner`, `OfflineAwareCaptureLink`, buyer/supplier/eventId capture.
- `src/app/(mobile)/mobile/notifications/page.tsx`: existing `InAppNotificationCenter` with authenticated organization/user scope.
- `src/features/leads/components/leads-mobile-surface.tsx` and `src/features/mobile/components/role-aware-lead-list.tsx`: audit before editing list/filters.
- Existing quote, lead, meeting, orders, trade-event and notifications APIs are authoritative; do not create parallel workflow endpoints or schema unless proven necessary.

## Live database findings (read-only, 2026-10-11)

Supabase project `sjzfzloggabsmcuxktnl` (SETU Flow CRM), organization `b97913cb-3b95-4247-8ced-ffdc0d392d2a` (Stark Packmate).
- `leads` has `organization_id`, `owner_user_id`, `stage_id`, `lead_type`, `trade_event_id`, `phone`, `whatsapp_number` and source fields. Avoid client-only ownership filtering and do not reassign lead on capture.
- `lead_follow_ups` has `lead_id`, `assigned_user_id`, `scheduled_at`, `status`. Confirm additional new meeting lifecycle data sources before coding.
- `notifications` has `organization_id`, `user_id`, `entity_type`, `entity_id`, `action_url`, `read`, `read_at` and `archived_at`; recipient scope is mandatory.
- `push_subscriptions` has `app_scope`: preserve CRM vs Setu Mail notification separation.
- `quotes`, `quote_versions` and version line items already exist; use canonical pricing/approvals.
- `trade_events`, `trade_event_entries` and lead `trade_event_id` already exist; reuse offline capture transaction contract.

## Execution sequence

1. S42-MOB-001: finish complete code, database constraints/functions/RLS, deployment/test inventory and versioned screenshots; verify any assumptions.
2. S42-MOB-002: update shell/nav, touch targets, accessible drawer and safe areas; keep desktop untouched.
3. S42-MOB-003..005: Home, Leads, Lead Detail; stage-filter regression tests must prove Won/Lost hidden from Active and searchable in Closed/All without leaking other users' leads.
4. S42-MOB-006..007: Quick Capture, Trade Show; preserve eventId, ownership, no mandatory email, server-side dedupe, offline retry and sync truth.
5. S42-MOB-008..010: Follow-ups/meetings, Quotes, Orders. Reuse live workflows and Pricing V5; verify approved suggested quantities, preserved quote edits, accessible PDF/WhatsApp/copy-link, valid approval gates.
6. S42-MOB-011..012: Notifications and Notifications Detail, More; deep-link by authorized entity and retain separate Setu Mail app.
7. S42-MOB-013: tests/build, screenshot comparison and real device review, one controlled production merge.

## Hard release gates

- No changing `main` until all affected React code and schema behavior are reviewed and validated.
- Complete reproducible `npm ci`, typecheck, lint, relevant regression suites and `npm run build` from same candidate SHA.
- Preview READY at exact SHA; test 375/390/430px iPhones and Android, PWA session/push, trade-show offline sync, lead visibility, quote editing/sharing, Mail app separation.
- Owner signoff on all eleven screens against original design, then **one** consolidated production release and SHA-matched production READY + smoke tests.
- Add no undocumented business rules, fabricated metrics, dead controls, or unsupported quote share actions.
- Do not mark SMC implementation issue resolved until evidence exists; document genuine failures, blockers, tests and deployed SHA.

## Audit limitation at preparation time

GitHub connector can read branch files and Supabase connector can inspect live schema. Local full checkout/build is NOT available in this session because GitHub host cannot be resolved by container, so full-code audit, implementation, automated build and preview deployment are not claimed complete. Continue on this branch in a checked-out environment with executable tests rather than shipping unvalidated UI.
