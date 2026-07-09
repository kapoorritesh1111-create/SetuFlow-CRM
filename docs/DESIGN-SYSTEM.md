# SETU Flow Design System (v1.0)

A specialised design system for the SETU Flow export-trade CRM — leads, pipeline, RFQs, versioned quotes, orders, pricing/catalog, compliance documents, trade-event capture, and mobile field workflows.

Companion files:

- `design-tokens.css` — CSS custom properties (light, dark, mobile-field themes)
- `tailwind.config.ts` — drop-in Tailwind config mapped to the tokens

---

## 1. What the code review found

Reviewed: `kapoorritesh1111-create/SetuFlow-CRM` (Next.js 14 App Router, TypeScript, Tailwind 3.4, Supabase, Plus Jakarta Sans, lucide-react, recharts).

There *is* a proto-system — `src/components/ui/workspace-surfaces.ts` (11 surface/button/field class strings) plus `StatusBadge`, `StatCard`, `PageHeader`, `DataTable`, `EmptyState`, `Skeleton` — and AGENTS.md tells contributors to use it. But it is losing to entropy:

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **Broken brand scale (bug).** ~240 usages of `text-brand-700`, `bg-brand-50`, `ring-brand-500`, `focus:border-brand-500` … but `tailwind.config.ts` only defines `brand.primary/dark/teal`. Every numeric `brand-*` class compiles to nothing — including the focus rings in `workspaceFieldSurfaceClass` and `PageHeader` actions. Focus states are silently missing. | 81× `text-brand-700`, 32× `bg-brand-50`, 15× `ring-brand-500`, 7× `border-brand-500` |
| 2 | **95 unique hardcoded hex colors** in 723 arbitrary-value classes. Brand navy exists both as the token and as a literal (`[#1F487C]` ×113). At least four parallel teal/greens (`#359F91`, `#279491`, `#108477`, `#7de2d2`), a second unrelated blue (`#0c7fff` ×56), an ad-hoc mobile navy family (`#061c2e`, `#0b2e4a`, `#06263f`), and an olive marketing family (`#1f2a1d`, `#4b5b47`, `#85AB8B`). | `grep -roE '\[#…\]' src` |
| 3 | **globals.css is a patch layer, not a stylesheet.** `!important` rules target DOM structure and even class-name substrings of hardcoded hexes (`section[class*="#061c2e"]`, `div[style*="top: -30px"]`), plus nav items hidden by attribute selector. Any markup refactor silently breaks these. | `src/app/globals.css:96–297` |
| 4 | **Radius chaos.** 15+ arbitrary radii (`rounded-[1.35rem]`, `[1.4rem]`, `[1.6rem]`, `[9px]`, `[11px]`, `[22px]`…) coexist with `rounded-xl/lg/md` — 234× `[1.5rem]`, 101× `[2rem]`, 70× `[1.75rem]`. | grep counts |
| 5 | **Weight-as-hierarchy.** 834× `font-black` and 189× `font-extrabold` alongside 2 497× `font-semibold`. Plus Jakarta at 800–900 in 11–13px UI text reads as shouting and hurts scanability in dense tables. | grep counts |
| 6 | **Dark-mode strategy conflict.** `globals.css` styles `.dark body` (class strategy) while the Tailwind config omits `darkMode`, so all `dark:` variants use the *media* strategy. The two can disagree with the OS setting. | `tailwind.config.ts`, `globals.css:38` |
| 7 | **Domain colors defined but bypassed.** `stage.*` and `status.*` exist in the config, yet the mobile pipeline page re-hardcodes stage colors and quote/compliance states are styled ad hoc per page. | `src/app/(mobile)/mobile/pipeline/page.tsx` |
| 8 | **101 files** use inline `style={{…}}` including colors, invisible to theming and to the Tailwind pipeline. | grep count |

The design system below keeps the existing visual identity (deep navy + teal, airy super-rounded panels, uppercase eyebrows) but gives it one vocabulary.

---

## 2. Principles

1. **The pipeline is the product.** Color is reserved for *meaning*: stage, health, compliance, money. Chrome stays neutral so a rose "blocked" chip is visible from across the room.
2. **One source of truth per decision.** Every color, radius, shadow, and size is a token. Arbitrary values (`[#…]`, `rounded-[…]`) are banned in product code; if a token is missing, add the token.
3. **Two densities, one language.** Desktop workspace is data-dense (13–14px, 44px table rows); mobile field capture is glanceable (16px+, 44px minimum touch targets, high-contrast `.sf-field` theme). Same tokens, different theme class.
4. **States are systematic.** Every entity status (lead stage, quote lifecycle, compliance readiness, order execution) maps to a named semantic triad — never restyled per page.
5. **Calm surfaces, loud data.** Whites/slates for surfaces, navy for actions, teal for accents/positive trends, feedback hues only for feedback.

---

## 3. Foundations

### 3.1 Color

**Brand ramps** (anchored on the existing identity):

- `brand` (navy) 50–950, anchor `700 = #1F487C`. Primary actions, links, active nav, eyebrows.
- `accent` (teal) 50–950, anchor `500 = #359F91`. Secondary emphasis, positive trends, AI/Guru affordances, mobile field CTA. Replaces `#279491`, `#108477`, `#7de2d2` variants.
- The stray `#0c7fff` blue (56 uses) is **retired** — map to `brand-500` or `info-solid`.

**Surfaces & text** are theme-driven variables (see `design-tokens.css`): `surface-app / surface-1 / surface-2 / surface-3`, `line / line-strong`, `content-primary / secondary / muted / faint / inverse`. Three themes ship: light (default), `.dark`, and `.sf-field` (formalising the mobile `#061c2e`/`#0b2e4a` navy as a real theme).

**Feedback triads** — each of `success / warning / danger / info / neutral` has `bg / fg / border / solid`. Chips and banners use bg+fg+border; icons, charts, and progress bars use `solid`. All fg-on-bg pairs are ≥ 4.5:1 in both themes.

### 3.2 Domain semantics (the "specialised" part)

**Pipeline stages** — fixed chip triads + a `solid` for board columns and charts:

| Stage | Solid | Chip |
|---|---|---|
| New | `#3B82F6` blue | `stage-new-bg/fg/border` |
| Contacted | `#6366F1` indigo | `stage-contacted-*` |
| Qualified | `#22C55E` green | `stage-qualified-*` |
| Sample | `#F59E0B` amber | `stage-sample-*` |
| Negotiation | `#A855F7` purple | `stage-negotiation-*` |
| Won | `#10B981` emerald | `stage-won-*` |
| Lost | `#EF4444` red | `stage-lost-*` |

**Quote lifecycle** (versioned quote truth) maps to aliases, never new colors: draft→neutral, pending approval→warning, approved→info, sent→contacted-indigo, negotiation→negotiation-purple, accepted→success, rejected→danger, expired→neutral. A quote version chip is always `v{n}` in a neutral pill; only the *latest accepted* version may carry the success triad.

**Compliance / document readiness**: ready→success, in progress→warning, blocked→danger, expired/cold→neutral. Compliance blockers that gate quote-send are the **only** place the solid danger red may fill a full-width banner.

**Lead health**: healthy→success, watch→warning, at-risk→danger, dormant→neutral — same triads as feedback, so `getLeadHealthBadgeClasses` collapses into `StatusBadge` tones.

**Money & quantities**: always `tabular-nums`, right-aligned in tables, currency code (not symbol alone) for export contexts — `USD 12,400.00`. Deltas: teal-600 ▲ positive, rose-600 ▼ negative, never green/red text without the glyph (color-blind safety).

**Charts (recharts)**: categorical order fixed `chart-1..6` (navy, teal, amber, purple, pink, slate); grid `chart-grid`, labels `chart-label`. Stage-split charts use stage solids so the board and the chart agree.

### 3.3 Typography

Family: **Plus Jakarta Sans** (already loaded via `next/font`). Weights **400 / 500 / 600 / 700 only** in product UI; 800–900 reserved for marketing display.

| Token | Size/leading | Weight | Use |
|---|---|---|---|
| `text-display` | 30/36, −2% | 600 | Page titles (PageHeader) |
| `text-title` | 20/28, −1% | 600 | Panel titles, drawer headers |
| `text-section` | 16/24 | 600 | Section heads, table group heads |
| `text-body` | 14/22 | 400/500 | Default body, forms |
| `text-small` | 13/20 | 400–600 | Table cells, helper text, meta |
| `text-caption` | 11/16, +16% tracking | 600 | UPPERCASE eyebrows, badge labels, column headers |

The single eyebrow style (`text-caption uppercase text-content-muted`) replaces today's mix of `tracking-[0.13em|0.16em|0.22em]`.

### 3.4 Radius, elevation, spacing, motion

| Radius token | Value | Applies to |
|---|---|---|
| `rounded-ctl` | 12px | Buttons, inputs, selects, chips-with-borders |
| `rounded-card` | 16px | Metric tiles, list cards, kanban cards |
| `rounded-panel` | 24px | Workspace panels, tables, drawers |
| `rounded-hero` | 28px | Page-header hero |
| `rounded-full` | pill | Badges, avatars, dots |

Every `rounded-[…]` maps to the nearest token (2rem/2.15rem heroes → `hero`; 1.35–1.75rem → `panel`; 9–12px → `ctl`).

Elevation: `shadow-soft` (rows, chips) → `shadow-card` (tiles) → `shadow-panel` (panels) → `shadow-hero` (page header) → `shadow-pop` (menus, drawers). One shadow per element; no stacked ring+shadow+backdrop-blur combos except on `panel`/`hero`.

Spacing: 4px grid. Panel padding 20–24px (`p-5`/`p-6`), tile padding 16–20px, table cell `px-4 py-3`, page gutter 24px desktop / 16px mobile, section stack gap 24px.

Motion: `ease-sf` curve; hover/press 120ms, reveals 200ms, drawers/sheets 320ms. Hover lift is `-translate-y-0.5` on cards/buttons **only** — never on table rows. Respect `prefers-reduced-motion`.

### 3.5 Focus & accessibility

- Every interactive element: `focus-visible:shadow-focus-ring focus-visible:outline-none` (token-driven, works in all three themes). This *replaces* the currently-broken `ring-brand-500`.
- Touch targets ≥ 44×44px on mobile routes; table rows ≥ 44px.
- Status is never color-alone: chips carry labels, deltas carry glyphs, compliance icons pair with text.
- Contrast: text ≥ 4.5:1, large text/icons ≥ 3:1, verified per theme.

---

## 4. Components (core kit)

Build these ~15 primitives in `src/components/ui/`; everything in `features/` composes them. `workspace-surfaces.ts` class-strings become thin wrappers over tokens during migration, then retire into components.

| Component | Spec |
|---|---|
| **Button** | Variants: `primary` (navy solid), `accent` (teal solid — reserve for AI/Guru + mobile CTA), `secondary` (surface-1 + line border), `ghost`, `danger` (danger triad). Sizes sm 32 / md 40 / lg 48. `rounded-ctl`, weight 600, `text-body`. Press state darkens (`action-primary-press`); loading = spinner replaces label, width locked. |
| **StatusBadge** | Keep current API; tones re-point to feedback triads; add `stage` tones and quote/compliance mappers (`getQuoteTone`, `getComplianceTone`) beside `getStatusTone`. Pill, `text-caption`, dot optional. |
| **StageChip** | Stage triads; optional count (`Negotiation · 12`); solid variant for kanban column headers. |
| **StatCard / MetricTile** | `surface-1`, `rounded-card`, `shadow-card`; eyebrow label, `tabular-nums` value at 28–30/600, delta glyph+color, optional sparkline in `chart-2`. |
| **PageHeader** | Hero surface (`rounded-hero shadow-hero`), eyebrow, `text-display` title, meta row, actions right (max 1 primary + 2 secondary; overflow to ⋯ menu). |
| **Panel / SectionCard** | `surface-1 rounded-panel shadow-panel border-line`; header row = title + optional action; inset wells use `surface-2 rounded-card`. |
| **DataTable** | Header: `surface-2`, `text-caption` uppercase muted, sortable indicators. Rows: 44px, `border-line`, hover `surface-2`, selected `brand-50`. Numeric cells right-aligned tabular. Sticky first column on wide tables. Empty/loading/error render `EmptyState`/`Skeleton`/`StateMessage` — never bespoke. |
| **Field kit** | Input/Select/Textarea: `surface-2` bg → white on focus, `rounded-ctl`, 40px (48px on `.sf-field`), label 13/600, helper 13 muted, error = danger border + danger-fg helper. Focus = `shadow-focus-ring`. |
| **Drawer (RightDrawer)** | `surface-1`, `rounded-panel` leading edge, `shadow-pop`, scrim `navy-950/40`; header/footer pinned, body scrolls. Replaces the `body.drawer-open` `!important` CSS with component-owned styles. |
| **Toast / Banner** | Feedback triads; banners `rounded-card`, full-width only for compliance blockers; toasts `shadow-pop`, auto-dismiss except danger. |
| **Timeline / ActivityFeed** | 2px `line` rail, dot in event-type solid, `text-small` body, `text-caption` timestamps. |
| **EmptyState** | Icon in `surface-2` circle, `text-section` heading, one-line help, one primary action. |
| **Wizard (quote/RFQ flows)** | Step rail with stage-like chips (done→success, active→brand, upcoming→neutral); footer = secondary Back left, primary Continue right, never more than one primary. |
| **KanbanColumn / LeadCard** | Column header = StageChip solid + count; card = `rounded-card shadow-soft`, name 14/600, meta row (country flag pill, value in tabular nums, health badge). |
| **Skeleton / StateMessage** | `surface-2` shimmer blocks matching final layout; StateMessage tones from feedback triads. |

---

## 5. Governance & migration

**Rules (add to AGENTS.md):**

1. No `[#hex]` arbitrary colors, no `rounded-[…]`, no `tracking-[…]`, no inline `style` colors in `src/app` or `src/features`. Tokens or nothing.
2. No `font-black` / `font-extrabold` outside `src/app/(marketing)`-type routes.
3. New status-like UI must map through a semantic mapper (`getStatusTone`-family), not local class strings.
4. `globals.css` may contain resets and token imports only — no feature patches, no `!important` DOM-shape selectors. Fix the component instead.
5. Enforce with a repo test (the project already has this culture): grep-based `design-tokens.test.mjs` failing on rule 1–2 regressions in changed files.

**Migration order (each step is shippable):**

1. **Fix the bug first:** add the `brand` ramp + `darkMode: 'class'` (drop-in config). 240+ broken classes, including focus rings, start working. Zero call-site changes.
2. Import `design-tokens.css`; re-point `workspace-surfaces.ts` strings at tokens (`rounded-panel`, `shadow-panel`, `border-line`, `focus-visible:shadow-focus-ring`). All consumers update at once.
3. Codemod the top offenders: `[#1F487C]`→`brand-700`, `[#0c7fff]`→`brand-500`, teal variants→`accent-*`, radius map above.
4. Wrap the mobile route group in `.sf-field`; delete hardcoded navy hexes; delete the `section[class*="#061c2e"]` patch rules from globals.css.
5. Consolidate status rendering into StatusBadge/StageChip + mappers; delete per-page chip styles.
6. Add the governance test; delete remaining globals.css patch layers as their components absorb the fixes.
