# Mobile 2.1 — Server Access Gate Audit (S43-MOB-001)

Date: 2026-10-11. Branch feat/mobile-2-1-adaptive-workspace. **Not a completed route-by-route security certification.**

## Confirmed source observations
- `src/app/(app)/layout.tsx` authenticates user + membership/organization through `getWorkspaceAccess()`, then mounts `<ModuleAccessGuard>{children}</ModuleAccessGuard>`. This is a **client** guard, not a server entitlement check. Module payload may still be evaluated on server before the client hides it.
- `src/components/shell/ModuleAccessGuard.tsx` fetches `/api/modules/grants` and conditionally renders upgrade/preview. It is UX-level filtering and **does not authorize actions or API requests**.
- `src/app/api/modules/grants/route.ts` previously returned every module on missing workspace, failed lookup or empty grants. In PR #219, those cases are now denied/no modules. User role and entitlements need separate enforcement in each sensitive action/route.
- `src/lib/workspace/auth.ts` implements membership checks and admin-role checks; `requireSetuInternalAdminWorkspace` additionally uses internal organization identity. Internal SETU operations should have explicit internal privilege.
- `src/lib/modules/module-grants.ts` contains module route map. More-specific routes now take precedence, e.g. /orders/supplier-links over /orders. This **does not** mean relevant permissions and parent-module requirements are fully proved.
- `src/features/mobile/components/mobile-navigation.tsx` and `mobile-bottom-tabs.tsx` on branch now filter the primary presentation surfaces from grants. Visibility must never be the only security boundary.

## Mandatory proof before release
1. Trace each gated module route (Orders, Compliance, Mail, Supplier Procurement, Analytics, Guru, Trade Events, vCard) to server page/layout checks and server mutations/API entrypoints. Record where grant + role is enforced; deny where missing.
2. Validate Supabase RLS policies per org, authenticated user ownership and sensitive resource tables. Run negative tests using a real non-entitled org and cross-org user.
3. Differentiate unlicensed module from a trade-show trial with *intentional*, read-only preview. Preview must not execute writes or expose other tenants' data.
4. Verify direct URL, API GET/POST and server action calls without corresponding navigation links. Confirm consistent 403/notFound behavior.
5. Maintain quote/pricing exceptions: quotes remain under Full CRM for Stark, and no Orders/Compliance entitlement is inferred from creating quotes.
6. Ensure admin and internal SMC separation is enforced server-side, not by org display name or client-side menus.

## Release blockers
- Server entitlement enforcement remains **unverified**. `ModuleAccessGuard` alone is insufficient.
- Cross-tenant negative API tests, UI accessibility checks, and iPhone/Android acceptance still outstanding.
- No production merge until all required validations and design sign-off.
