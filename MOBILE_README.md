# SETU Flow Mobile App v1 Premium Prototype

PR label: `mobile/prototype`  
Feature flag: `feature/mobile_app_v1`  
Primary artifact: `public/internal-dcc/mobile-blueprint.html`

## Goal

Evolve SETU Flow toward a premium, true mobile-safe web app for Android and iPhone while keeping the existing desktop product unchanged. This pass adds the missing mobile management layer: current leads and status by role.

## What changed in this pass

- Branded the mobile HTML with the real SETU Flow logo asset.
- Removed visible developer/engineering language from the customer-facing prototype.
- Added a **Current Leads** mobile screen.
- Added role-aware lead visibility examples:
  - Owner/Admin: all leads.
  - Manager: team and direct-report leads.
  - Member: assigned leads only.
- Added lead status cards with company, contact, owner, team, value, status, and next action.
- Updated bottom navigation to include Leads as a primary mobile destination.
- Added light and dark appearance previews inside Settings.
- Preserved the premium 2026 visual language and 3D-style icon direction.

## Files added / updated

| File | Purpose |
|---|---|
| `public/internal-dcc/mobile-blueprint.html` | Branded premium phone prototype with Current Leads, role views, light/dark appearance, buyer/supplier capture, and quick quote. |
| `public/internal-dcc/mobile-patterns.md` | Updated DCC guidance for role-aware lead management, branding, themes, and mobile workflows. |
| `public/internal-dcc/mobile-tokens.json` | Expanded machine-readable token and workflow map for branded shell, themes, and lead roles/statuses. |
| `public/internal-dcc/index.html` | DCC Mobile App v1 tab updated with lead-management and role-visibility guidance. |
| `public/setuflow-architecture.html` | Root architecture HTML updated to mention the premium mobile app direction. |
| `MOBILE_README.md` | This implementation, QA, and handoff guide. |
| `CHANGES.md` | Logged the premium mobile lead-management pass. |

## Demonstrated mobile screens

1. Home Dashboard
2. Current Leads
3. Quick Quote Capture
4. Lead Capture
5. Trade Capture
6. Notifications
7. Settings

## Role visibility rules

| Role | Mobile lead visibility | Main actions |
|---|---|---|
| Owner / Admin | All workspace leads | Search, open, quote, reassign later, review risk, monitor status. |
| Manager | Leads owned by the manager, team members, and direct reports below them | Review team status, open lead, nudge follow-up, start quote. |
| Member | Only leads assigned to the member | Open lead, update notes/status later, start quote, follow up. |

Production implementation must enforce these rules in data access, not just UI filtering.

## Light and dark appearance

The prototype shows both app treatments in Settings:

- **Light look:** bright glass cards, blue actions, clean field visibility.
- **Dark look:** executive dark shell, vivid cards, better night-event/travel use.

Implementation should default to mobile system appearance and allow a manual override.

## Engineering migration plan

### Phase 0: Prototype lock

- Keep `public/internal-dcc/mobile-blueprint.html` as the branded mobile architecture artifact.
- Keep changes additive and isolated from desktop routes and desktop component trees.

### Phase 1: Feature flag and route isolation

Suggested flag:

```ts
const MOBILE_APP_V1_FLAG = 'feature/mobile_app_v1';
```

Suggested route pattern:

```text
src/app/(mobile)/mobile/page.tsx
src/app/(mobile)/mobile/leads/page.tsx
src/app/(mobile)/mobile/capture/page.tsx
src/app/(mobile)/mobile/quotes/page.tsx
src/app/(mobile)/mobile/settings/page.tsx
```

Rules:

- Gate all mobile routes before render.
- Keep `(mobile)` isolated from `(app)` desktop routes.
- Keep styling namespaced under `.sf-mobile-app` or `--m-*` tokens.
- Do not import desktop app-shell/sidebar structures into mobile routes.

### Phase 2: Role-aware mobile leads

Create mobile lead services/components:

```text
src/features/mobile/components/role-aware-lead-list.tsx
src/features/mobile/components/lead-status-card.tsx
src/features/mobile/adapters/leads-mobile.adapter.ts
src/features/mobile/adapters/role-visibility.adapter.ts
```

Responsibilities:

- Fetch only leads the user is allowed to see.
- Apply role hierarchy rules server-side.
- Support mobile search/filter by company, contact, owner, team, status, and next action.
- Provide quick Open and Quote actions.
- Keep desktop lead routes and desktop lead views unchanged.

### Phase 3: Buyer/supplier and quote adapters

Use mobile adapters for:

```text
src/features/mobile/adapters/quote-mobile.adapter.ts
src/features/mobile/adapters/trade-mobile.adapter.ts
src/features/mobile/adapters/notifications-mobile.adapter.ts
```

### Phase 4: PWA and offline strategy

| Resource | Strategy |
|---|---|
| Mobile shell assets | Cache-first |
| Logo and lightweight icon assets | Cache-first |
| Lead list reads | Network-first with timeout fallback |
| Lead capture writes | Queue locally, replay when online |
| Quote draft writes | Queue locally, replay when online |
| Desktop routes | Do not intercept |

## Test plan

### Viewport tests

- [ ] `mobile-blueprint.html` at 390x844.
- [ ] `mobile-blueprint.html` at 375x667.
- [ ] `mobile-blueprint.html` at 420x915.
- [ ] Verify no horizontal scroll.
- [ ] Verify bottom tabs and FAB avoid safe-area overlap.

### E2E happy path: existing leads

- [ ] Open mobile prototype.
- [ ] Tap Leads.
- [ ] Switch Owner, Manager, and Member views.
- [ ] Verify lead count and list change by role.
- [ ] Search for a company/status.
- [ ] Tap Quote from a lead.
- [ ] Verify Quick Quote opens.

### E2E happy path: buyer

- [ ] Tap Capture Buyer or FAB.
- [ ] Change product or quantity.
- [ ] Tap Save draft quote.
- [ ] Verify Notifications opens.
- [ ] Verify `Q-MOB-001 saved` appears.

### E2E happy path: supplier

- [ ] Tap Capture Supplier.
- [ ] Review supplier trade form.
- [ ] Tap Save trade record.
- [ ] Verify supplier notification appears.

### Appearance checks

- [ ] Settings shows Light look and Dark look cards.
- [ ] Tap Light look and confirm app changes to light.
- [ ] Tap Dark look and confirm app changes to dark.
- [ ] Confirm contrast remains readable in both modes.

### Desktop regression checks

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Route-presence test still passes.
- [ ] DCC alignment test still passes.
- [ ] Manual smoke test desktop dashboard, leads, quotes, orders, pipeline.

## QA demo script

1. Open `public/internal-dcc/index.html`.
2. Click **Mobile App v1**.
3. Review role visibility, mobile components, and acceptance criteria.
4. Open `public/internal-dcc/mobile-blueprint.html` in a mobile viewport.
5. Confirm the real SETU Flow logo appears in the mobile top bar.
6. Tap **Leads**.
7. Switch Owner, Manager, and Member role views.
8. Search the leads list and open Quote from a lead.
9. Go to Settings and preview Light and Dark looks.
10. Run buyer quote and supplier capture paths.
11. Confirm desktop routes/UI were not changed.

## Next handoff prompt

Use this prompt for the next implementation pass:

```text
Use the attached latest SETU Flow repo as the new baseline. Implement the next mobile pass by converting the approved premium mobile blueprint into isolated real app routes behind feature/mobile_app_v1. Keep all desktop routes and desktop UI unchanged.

Build a mobile route group with Home, Leads, Quote, Capture, Notifications, and Settings. Use the real SETU Flow logo asset. Add reusable mobile components: BrandedMobileTopBar, MobileBottomTabs, MobileActionDrawer, 3DIconOrb, RoleAwareLeadList, LeadStatusCard, EntitySwitch, QuickQuoteWidget, TradeCaptureForm, AppearancePreview, NotificationToast, and SettingsList.

For Leads, implement role-aware visibility using existing role hierarchy data: owner/admin sees all leads, manager sees their team and direct-report leads, and member sees only assigned leads. Enforce this in the data layer as well as the UI. Add search/filter by company, contact, owner, team, status, and next action.

Add light/dark theme support based on mobile system appearance with a manual Settings override. Preserve premium 2026 visual quality and remove any customer-facing developer language. Update the DCC, MOBILE_README, root HTML, and tests. Add safe mobile regression tests for route isolation, role visibility contracts, and desktop route preservation. Return the updated repo ZIP.
```

---

# Mobile App v1 Real Route Pass

## What this pass adds

This pass converts the approved premium mobile blueprint into isolated real Next.js app routes behind `feature/mobile_app_v1`.

## Route group

The mobile app is namespaced under a separate `(mobile)` route group:

| Route | Purpose |
|---|---|
| `/mobile` | Home dashboard and quick actions |
| `/mobile/leads` | Role-aware current leads and status management |
| `/mobile/quote` | Fast buyer quote draft |
| `/mobile/capture` | Buyer / supplier field capture |
| `/mobile/notifications` | Save, sync, and next-action updates |
| `/mobile/settings` | Appearance, install, notification, and sync preferences |

## Feature flag

All mobile routes are guarded by `feature/mobile_app_v1` through `src/features/mobile/lib/mobile-feature-flag.ts`.

Production can disable the route group by setting either:

```text
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=false
FEATURE_MOBILE_APP_V1=false
```

## Components added

- `BrandedMobileTopBar`
- `MobileBottomTabs`
- `MobileActionDrawer`
- `3DIconOrb` via `ThreeDIconOrb`
- `RoleAwareLeadList`
- `LeadStatusCard`
- `EntitySwitch`
- `QuickQuoteWidget`
- `TradeCaptureForm`
- `AppearancePreview`
- `NotificationToast`
- `SettingsList`

## Lead visibility contract

Lead visibility is enforced in the mobile data contract at `src/features/mobile/lib/role-aware-leads.ts`.

| Role | Visibility |
|---|---|
| Owner | All leads |
| Admin | All leads |
| Manager | Leads in managed teams, direct reports, or directly assigned to the manager |
| Member | Leads assigned to that member only |

Search covers company, contact, owner, team, status, next action, market, and product interest.

## Desktop safety

The desktop route group remains under `src/app/(app)` and is not imported by the mobile route group. Mobile components live under `src/features/mobile` and use the real logo from `public/logos/setu-flow-logo.svg`.

## Added tests

- `tests/mobile-route-contract.test.mjs`
- `tests/mobile-role-aware-leads.test.mjs`

These tests verify route isolation, feature flag presence, desktop preservation, role visibility, and lead search coverage.

---

# Mobile App v1 Real `/leads` Fix

## Why this patch exists

The first real-route pass created the isolated `/mobile/*` route group, but the production phone viewport shown at `/leads` still rendered the existing desktop lead command center squeezed into the mobile shell. This patch makes the mobile lead experience visible where field users actually land: `/leads` on phone-sized viewports.

## What changed now

- `/leads` now renders the premium mobile `RoleAwareLeadList` on mobile viewports only.
- The existing desktop `/leads` route and `LeadsWorkspace` remain unchanged behind `md:block` desktop rendering.
- The mobile lead list now uses real app lead data from `getLeadsPageData`, mapped through `buildMobileLeadCardsFromAppData`.
- The signed-in user is visible above the mobile lead queue.
- Share vCard remains available in the mobile top bar and is also exposed in the signed-in mobile card.
- Role-aware visibility is still enforced by the shared data-layer function before cards render.
- Search/filter continues to cover company, contact, owner, team, status, market/product, and next action.

## Current mobile entry points

| User path | Mobile behavior | Desktop behavior |
|---|---|---|
| `/leads` | Premium mobile lead queue with signed-in card and Share vCard | Existing desktop lead workspace unchanged |
| `/mobile` | Isolated feature-flagged mobile Home | Isolated preview route |
| `/mobile/leads` | Isolated feature-flagged mobile Leads | Isolated preview route |
| `/mobile/quote` | Isolated feature-flagged Quick Quote | Isolated preview route |
| `/mobile/capture` | Isolated feature-flagged Capture | Isolated preview route |
| `/mobile/notifications` | Isolated feature-flagged Notifications | Isolated preview route |
| `/mobile/settings` | Isolated feature-flagged Settings | Isolated preview route |

## QA check for this fix

1. Open `/leads` in an iPhone 14 Pro Max viewport.
2. Confirm the screen shows the premium mobile lead queue instead of the dense desktop command center.
3. Confirm the signed-in card appears with user name, role, organization, and email when available.
4. Tap **Share vCard** from the signed-in card or top bar.
5. Search by company/contact/status/owner/team/next action.
6. Resize to desktop width and confirm the original desktop lead workspace still appears.


## 2026-05-03 Canonical Mobile Shell Rebuild Fix

The canonical app routes now use the same premium mobile direction as `public/internal-dcc/mobile-blueprint.html` on phone viewports. The prior route-only mobile pass placed the new experience under `/mobile/*`, but `/dashboard` and `/leads` could still show the legacy app shell in a narrow viewport.

### Fixed behavior

- `/dashboard` at phone width renders the premium mobile home dashboard.
- `/leads` at phone width renders the role-aware premium mobile lead queue.
- `/orders` at phone width uses the premium mobile shell frame.
- Desktop versions of the same routes remain unchanged at `md` and above.
- Signed-in identity and Share vCard remain visible in the premium mobile top bar and drawer.

### Files reviewed and corrected

- `src/components/layout/app-shell.tsx`
- `src/app/(app)/dashboard/_lib/render-dashboard-page.tsx`
- `src/app/(app)/leads/page.tsx`
- `src/features/mobile/components/mobile-shell.tsx`
- `src/features/mobile/components/mobile-navigation.tsx`
- `src/app/globals.css`
- `tests/mobile-route-contract.test.mjs`

### QA check

1. Open `/internal-dcc/mobile-blueprint.html` to confirm the approved design direction.
2. Open `/dashboard` at a 390-430px mobile viewport. It should show the premium mobile shell, not the old compressed desktop app.
3. Open `/leads` at a 390-430px mobile viewport. It should show the premium role-aware lead cards, signed-in card, Share vCard, and bottom tabs.
4. Open the same routes at desktop width. The existing desktop app shell and desktop workspace should remain unchanged.
