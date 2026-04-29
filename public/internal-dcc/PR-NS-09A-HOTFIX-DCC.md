# PR-NS-09A — Hotfix: Trade Show Nav · Quote Constraint · Orders Workspace · Open Order

**Date:** Apr 29, 2026  
**Type:** Bug-fix hotfix — no schema changes, no new dependencies  
**Based on:** SetuFlow-CRM-main-Trade-Show-PR4-build-fix-pending-proof.zip

---

## What changed

### FIX 1 — Quote constraint violation (`quote_version_line_items_category_type_check`)
**File:** `src/features/leads/server/actions.ts` — line ~1300  
**Root cause:** The inline quote preview action (lead page "Continue step" → `saveLeadQuoteDraftPreview`) was writing `category_type: 'general'` to `quote_version_line_items`. The Supabase constraint `quote_version_line_items_category_type_check` only allows `'chips' | 'powders'`. `'general'` violates this constraint.  
**Fix:** Changed to `category_type: 'chips'` as a safe default. A full product-level category derivation from the catalog is tracked under PR-NS-08 scope.  
**Impact:** Edit quote, all inline wizard steps (Terms, Review, Send Gate), and draft save from the lead page will no longer error.

### FIX 2 — Trade Show button not visible in sidebar
**File:** `src/components/layout/shell/navigation.tsx`  
**Root cause:** `PRIMARY_LABELS` record only contained 6 routes. `/trade-events` was present in `manifest.json` under `operating-flow` and had an icon mapping (`'calendar'`) but was excluded from sidebar rendering because `primaryItems` filters to entries in `PRIMARY_LABELS`.  
**Fix:** Added `'/trade-events': 'Events'` to `PRIMARY_LABELS`.  
**Impact:** Trade Events now appears in the compact sidebar nav as the 7th primary item with the calendar icon, labeled "Events".

### FIX 3 — Trade Show quick-access button in topbar
**File:** `src/components/layout/app-shell.tsx`  
**Root cause:** No Trade Show button existed in the global topbar. Users had to know to look for it in the sidebar.  
**Fix:** Added a "Trade Show" button in the topbar actions row (beside + Quick Lead). Links to `/trade-events`. Styled as a secondary outlined button consistent with Filters button.  
**Impact:** Trade Show is now always visible in the header regardless of current page.

### FIX 4 — Orders page empty state used old workspace components
**File:** `src/app/(app)/orders/page.tsx`  
**Root cause:** When no accepted/sent quotes exist (`quotes.length === 0`), the page returned using old `PageHeader` + `SectionCard` components — visually inconsistent with the new Northstar Orders Desk.  
**Fix:** Replaced with a full NS-consistent empty state: same topbar with Orders Desk branding, All/Buyers/Suppliers mode switch, 6-card stats strip (all zero), and a centred empty queue card with routing CTAs to Follow-up and Quotes.  
**Moved:** `modeParam` and `perspectiveMode` derived earlier (before `quotes.length === 0` check) so both states share the same mode logic.  
**Removed imports:** `PageHeader`, `SectionCard`, `StatusBadge`, `StateMessage`, `cn`, `formatDateTime`, `workspaceHeroClass/Primary/SecondaryButtonClass`, `uploadOrderDocument` (duplicate of `uploadOrderDocumentAction`).

### FIX 5 — "Open order" button was an anchor scroll, not a navigation
**File:** `src/app/(app)/orders/page.tsx`  
**Root cause:** The "Open order" button linked to `#order-${quoteId}` — a same-page anchor. Clicking it just scrolled; there was no order detail step or panel.  
**Fix:** Changed to navigate to `${PRODUCT_ROUTES.app.leads}?leadId=${order.leadId}&handoff=order-open&quoteId=${order.quoteId}`. This opens the lead's Command Center with the quote in context, completing the order handoff loop.  
**Remaining:** A dedicated Order Detail drawer/panel within the Orders Desk itself is tracked for PR-NS-10.

---

## What was NOT changed

- Database schema — no migrations in this pass
- Pricing engine or quote compilation paths
- Trade Show page components (already built in Trade Show PR4)
- Orders Desk live workspace rendering (only empty state and Open order button changed)
- Any other features

---

## Readiness after this PR

| Area | Before | After |
|---|---|---|
| Edit quote inline wizard | ❌ Crashes on constraint | ✅ Saves correctly |
| Trade Show in sidebar | ❌ Not visible | ✅ Visible as "Events" |
| Trade Show in topbar | ❌ Not present | ✅ Button beside Quick Lead |
| Orders empty state | ❌ Old workspace | ✅ NS Orders Desk shell |
| "Open order" button | ❌ Anchor scroll only | ✅ Navigates to lead CC |

---

## Still pending (PR-NS-09 full pass)

1. Order detail drawer within Orders Desk (full panel, not redirect to Leads)
2. Product-level `category_type` derivation from catalog records (currently defaults to `'chips'`)
3. Quote version creation on "Send quote" — ensure `accepted_version_id` is correctly set
4. Dispatch state advance (`progressOrderExecution`) — server action exists but UI buttons are `<button>` not wired to form actions
5. npm build verification — node_modules not available in this environment

---

## Next prompt

PR-NS-09 — Full pass: Order detail panel, dispatch state wiring, category type derivation, build verification.
