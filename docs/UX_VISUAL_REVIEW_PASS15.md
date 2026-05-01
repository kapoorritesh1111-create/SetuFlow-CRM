# Pass 15 UX Visual Review — Premium UI Alignment

Last updated: 2026-05-01

## Purpose

This review records the visual and product-purpose issues found during the May 1 UI review. It is a planning document only: no UX remediation is claimed until the implementation pass updates the affected pages and passes build/type checks.

## Current decision

The product remains **pilot expansion approved**, not broad production launch. Live Supabase proof for Q-00025 and the signed contract/order remains valid, but customer-facing readiness is reduced by inconsistent page polish, inconsistent filter systems, and an Organization Setup page that does not yet behave like a SaaS customer onboarding flow.

## Findings by page

| Page | Issue observed | Impact | Required fix | Status |
|---|---|---|---|---|
| Leads / Follow-up | Filter/header block is tall, dense, and visually heavy. | Users reach the lead queue late and the page feels like a spreadsheet toolbar, not a premium CRM. | Compress the command bar, keep workflow tabs compact, and make lead rows align as premium cards/table rows. | Open |
| Leads / Follow-up | UI shows `1 filter active`, but the active filter is not visually obvious. | Users may believe records are hidden or filters are broken. | Render explicit active chips such as `Mode: Buyers`, `Overdue`, or `Source: Trade Event`; provide one-click clear. | Open |
| Leads / Follow-up | Checkbox column and row content are visually disconnected. | Lead rows feel uneven and sparse. | Re-grid row layout: select, identity, stage, follow-up, value, owner, actions. | Open |
| Orders | Header area is too empty and not action-oriented. | Execution workspace feels unfinished despite valid data. | Convert header to an execution cockpit with compact KPI/action hierarchy. | Open |
| Orders | Filters do not match Leads/Quotes styles. | Cross-page inconsistency reduces buyer trust. | Adopt one shared premium filter component/pattern. | Open |
| Orders | `Dispatch blocked` chip floats under filters. | It is unclear whether it is a filter, warning, or data state. | Use standardized active-filter/status chips. | Open |
| Quotes | Filter bar is a third distinct style and duplicates `Buyers` mode. | Users see repeated mode controls and inconsistent toolbar behavior. | Remove duplicate mode selector when global mode controls the page; use shared filter pattern. | Open |
| Quotes | Apply button/count text are cramped to the right. | Functional but not premium. | Use consistent command-bar spacing and active-state treatment. | Open |
| Trade Events | Page uses older plain card style. | Trade show module feels behind the rest of the product. | Redesign as a premium event cockpit with event KPIs, event cards, capture CTA, and proof-boundary card. | Open |
| Trade Events | Yellow proof-boundary alert feels internal. | Customer-facing polish is weak. | Convert to premium scoped-proof callout with clearer hierarchy. | Open |
| Organization / Admin | Page says Organization setup but behaves like an admin dashboard. | New SaaS customers cannot understand how to set up their organization. | Split into true Organization Setup flow plus Admin Command Center. | Open |
| Organization / Admin | Cards appear clickable but do not navigate. | Feels broken. | Make cards route to setup sections or make them visually static. | Open |
| Organization / Admin | No organization profile setup form is visible. | Customer onboarding is incomplete. | Add org profile, commercial settings, team setup, reference data, security/governance, setup progress. | Open |
| Organization / Admin | `Governance clear` conflicts with security warning badge. | Mixed signal on readiness. | Governance state should reflect actual warnings and required actions. | Open |

## Readiness impact

| Area | Previous | Updated after UX review | Reason |
|---|---:|---:|---|
| Core CRM workflow | 92–95% | 91–94% | Workflow is proven, but page polish and filter clarity need cleanup. |
| Investor demo safety | 82–87% | 80–85% | Visual inconsistency can distract in unscripted demos. |
| First paying customer readiness | 92–95% | 88–92% | Organization setup and supportable onboarding need UX correction before broad rollout. |
| Buyer confidence | ~98/100 | ~97/100 | Live proof remains strong, but customer-facing readiness now has visible UX blockers. |
| Security/RPC trust | 90–94% | 90–94% | No security evidence changed. |

## Fix priority

1. Create a shared premium filter/command-bar pattern and apply it to Leads, Orders, and Quotes.
2. Redesign Organization Setup as a real SaaS onboarding flow.
3. Upgrade Trade Events to the premium command-center style.
4. Align Leads row/card spacing and active-filter visibility.
5. Rework Orders header/filter hierarchy and execution card balance.
6. Keep all fixes type-safe and verify using build/type checks before release.
