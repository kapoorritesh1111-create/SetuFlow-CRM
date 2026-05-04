# Architecture

## Overview

Setu Flow CRM is a Next.js app with Supabase-backed workspace data, authenticated app routes, public onboarding routes, current DCC/reference HTML handoffs, and regression tests for critical product contracts.

## Route groups

| Area | Route examples | Notes |
|---|---|---|
| Public | `/`, `/onboarding`, `/onboarding/received` | No app login required. |
| Authenticated app | `/dashboard`, `/leads`, `/quotes`, `/orders`, `/pipeline`, `/trade-events`, `/products` | Main operating shell. |
| Admin | `/admin/organization`, `/admin/client-onboarding`, `/admin/invitations` | Admin-gated workspace setup and governance. |
| Mobile | `/mobile`, `/mobile/leads`, `/mobile/capture` | Feature-flagged mobile experience. |

## Client onboarding architecture

- Public form: `src/app/onboarding/page.tsx`
- Public API: `src/app/api/public/client-onboarding/route.ts`
- Confirmation: `src/app/onboarding/received/page.tsx`
- Admin command center: `src/app/(app)/admin/client-onboarding/page.tsx`
- Workspace setup helpers: onboarding libraries under `src/lib` and app/admin components
- Notification target: `admin@setugroups.com` by default or `SETU_ONBOARDING_ADMIN_EMAIL`

## Hydration guard

The desktop redirect component initializes server-safe values and reads `window.location` only after hydration. This keeps admin routes stable in production builds.

## Documentation architecture

Active docs live in the top-level README/CHANGES files and the current `docs/` set. The repo no longer keeps pass-by-pass archive files in the active tree.
