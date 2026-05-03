# SETU Flow Mobile App v1 Premium DCC Update

PR label: `mobile/prototype`  
Feature flag: `feature/mobile_app_v1`  
Scope: Additive mobile-only design, premium prototype, role-aware lead management, branded app shell, and migration guidance. Desktop routes and workflows remain unchanged.

## Premium 2026 Direction

SETU Flow Mobile App v1 should feel like a branded native-quality business app, not a compressed desktop view. This pass adds the missing on-the-go management surface: current leads and status by role.

The premium mobile direction is defined by:

- **Real branding** using the SETU Flow logo from `/logos/setu-flow-logo.svg`.
- **A dedicated mobile shell** with premium hierarchy, glass surfaces, dark hero panels, and restrained motion.
- **Entity-first capture** where the first decision is `Buyer` or `Supplier`.
- **Role-aware current leads** for owners, admins, managers, and members.
- **Fast thumb reach** using bottom tabs for Home, Leads, Quote, Capture, and Settings.
- **Premium 3D-style iconography** for buyer, supplier, leads, quote, alerts, and settings actions.
- **Light and dark appearance** aligned with mobile settings and available from Settings.
- **Desktop-safe isolation** so mobile additions do not alter or regress the existing desktop product.

## Role-aware Leads Pattern

Mobile needs a way to manage existing leads, not only create new ones.

| Role | Lead visibility | Mobile purpose |
|---|---|---|
| Owner / Admin | All workspace leads | Executive view, risk review, reassignment, pipeline oversight. |
| Manager | Manager-owned leads plus team and direct-report leads below them | Team pipeline coaching, follow-up nudges, status review. |
| Member | Only leads assigned to that member | Personal follow-up, notes, quote draft creation. |

Rules:

- The UI can preview role states, but production must enforce visibility server-side.
- Status labels must use text plus color.
- Manager hierarchy should use the existing team/reporting model when available.
- Members should never see another member's lead unless policy explicitly grants shared ownership.

## Mobile Patterns

### 1) Branded app shell

Use a dedicated mobile shell rather than shrinking desktop layouts.

Required shell behaviors:

- SETU Flow logo in the top bar,
- active screen title,
- bottom navigation,
- contextual FAB,
- safe-area padding,
- visible sync state,
- light/dark appearance.

### 2) Current leads pattern

The Leads tab should support:

- search by company, contact, owner, team, status, or next action,
- role scope summary,
- lead status cards,
- fast Open and Quote actions,
- status labels such as New, Qualified, Quote Ready, Supplier Follow-up, and At Risk.

### 3) Entity-first capture pattern

The first mobile decision should be:

- **Buyer** - optimized for fast quote creation and follow-up.
- **Supplier** - optimized for source intake, MOQ, lead time, and sourcing tasks.

### 4) Appearance pattern

Settings should show both light and dark treatments. Production should default to device setting and allow manual override.

## Mobile Tokens

Use the mobile token JSON at `public/internal-dcc/mobile-tokens.json`. Tokens are prefixed with `--m-` so they do not collide with desktop tokens.

### Premium color tokens

| Token | Purpose |
|---|---|
| `--m-color-brand` | Primary premium brand actions |
| `--m-color-brand-2` | Secondary gradient stop |
| `--m-color-violet` | Supplier / trade emphasis |
| `--m-color-teal` | Capture / success-adjacent emphasis |
| `--m-color-gold` | Premium highlight / FAB emphasis |
| `--m-surface-card` | Core card surface |
| `--m-surface-glass` | Glass cards and overlays |
| `--m-surface-dark` | Premium hero surfaces |

### Lead status tokens

| Status | Purpose |
|---|---|
| `new` | Recently captured or unqualified lead |
| `qualified` | Validated opportunity |
| `quote ready` | Ready for draft quote review or next quote action |
| `follow-up` | Needs next action from buyer/supplier owner |
| `at risk` | Requires manager/owner attention |

## Mobile Components

1. **BrandedMobileTopBar** - logo, workspace, active title, sync state.
2. **RoleAwareLeadList** - searchable current leads filtered by role.
3. **LeadStatusCard** - company, contact, owner, team, status, value, next action.
4. **AppearancePreview** - light and dark mode preview and selector.
5. **MobileAppShell** - viewport, safe area, app state, PWA hooks, feature gate.
6. **HeroMetricCard** - high-priority dashboard KPI summary.
7. **3DIconOrb** - premium 3D-style icon wrapper.
8. **EntitySwitch** - buyer vs supplier segmented control.
9. **QuickCaptureCard** - premium action cards on home.
10. **QuickQuoteWidget** - buyer-focused instant quote block.
11. **TradeCaptureForm** - buyer/supplier trade intake.
12. **NotificationToast** - save, sync, and next-step feedback.
13. **SettingsList** - install, notifications, offline queue, appearance, premium flags.

## Mobile Navigation

- **Primary:** Home, Leads, Quote, Capture, Settings.
- **Contextual:** FAB launches Quick Quote Capture.
- **Secondary:** drawer contains Buyer Trade Capture, Supplier Trade Capture, Current Leads, Notifications, OCR tools, Offline Queue, Help, Release Notes.
- **Handoff:** approval/send remains a desktop handoff until explicitly released for mobile parity.

## Mobile Workflows

### Existing lead management

```text
open Leads -> role-filtered view -> search/status review -> open or quote
```

### Buyer microflow

```text
capture buyer -> quote -> save -> notify
```

### Supplier microflow

```text
capture supplier -> save trade record -> notify
```

## Northstar Workflow Mapping

| Northstar workflow | Mobile screen(s) | Required components | Success metric |
|---|---|---|---|
| Existing lead management | Current Leads, Quick Quote, Notifications | RoleAwareLeadList, LeadStatusCard, QuickQuoteWidget, NotificationToast | Rep or manager finds and acts on a current lead in under 30 seconds. |
| Buyer capture to quote | Home Dashboard, Quick Quote Capture, Notifications | HeroMetricCard, 3DIconOrb, EntitySwitch, QuickQuoteWidget, NotificationToast | Buyer quote draft created in under 75 seconds; quote-start conversion rate improves. |
| Supplier sourcing capture | Home Dashboard, Trade Capture, Notifications | QuickCaptureCard, EntitySwitch, TradeCaptureForm, NotificationToast | Supplier record captured in under 60 seconds; sourcing completeness exceeds 90%. |
| Manager mobile review | Current Leads, Home Dashboard | RoleAwareLeadList, LeadStatusCard, HeroMetricCard | Manager can view team lead status and risk without desktop handoff. |
| Appearance and accessibility | Settings | AppearancePreview, SettingsList, MobileTopBar | Light/dark mode is visible, readable, and accessible on phone viewports. |

## Engineer Integration Notes

- Add future mobile routes under an isolated mobile route group and gate with `feature/mobile_app_v1`.
- Keep all mobile CSS namespaced under `.sf-mobile-app` or `--m-*` tokens.
- Use mobile adapter modules to call existing lead, quote, trade-event, role, and notification services.
- Enforce role-aware lead visibility server-side as well as in UI.
- Do not copy desktop component trees into mobile screens.
- Ship 3D-style iconography as lightweight SVG/CSS assets first; lazy-load heavier assets only if performance budgets allow.
- Do not change production desktop routes or core desktop UI files in the mobile prototype PR.

---

## Real App Route Conversion

Mobile App v1 now has an isolated route group behind `feature/mobile_app_v1`.

| Route | Screen |
|---|---|
| `/mobile` | Home |
| `/mobile/leads` | Leads |
| `/mobile/quote` | Quote |
| `/mobile/capture` | Capture |
| `/mobile/notifications` | Notifications |
| `/mobile/settings` | Settings |

### Role-aware lead visibility

The mobile leads screen must enforce visibility in the data layer before rendering UI cards.

- Owner/Admin: all leads.
- Manager: managed teams, direct reports, and directly assigned leads.
- Member: only assigned leads.

### Mobile regression coverage

The route contract tests cover mobile route isolation and desktop route preservation. The lead visibility tests cover role-based filtering and search across company, contact, owner, team, status, and next action.

---

## Real `/leads` Mobile Visibility Correction

The mobile route group remains available at `/mobile/*`, but production users commonly enter through canonical app routes. The canonical `/leads` route now uses viewport isolation:

- Mobile viewport: render the premium `RoleAwareLeadList` using real app lead data.
- Desktop viewport: render the existing `LeadsWorkspace` unchanged.
- Signed-in identity: always show who is signed in before the mobile lead queue.
- Share vCard: keep the AppShell vCard action and include a visible Share vCard action in the signed-in card.

This pattern prevents the compressed-desktop problem seen in phone testing while preserving desktop route behavior.


## Canonical Mobile Shell Rebuild Fix

Canonical app routes now use the premium mobile shell on phone viewports. `/dashboard`, `/leads`, and `/orders` should no longer render the compressed desktop shell on mobile. The desktop shell remains active at `md` and above. Signed-in identity and Share vCard remain part of the mobile top bar and drawer.
