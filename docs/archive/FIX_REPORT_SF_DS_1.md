# FIX REPORT — SF-DS-1

**Title:** SETU Flow Design System v1.0 — token migration (Steps 1–3, 5–6 of the migration plan)
**Status:** In Review — needs a visual pass before merge (see "What I deliberately did not do")
**Source:** `DESIGN-SYSTEM.md` code review + migration plan, run against `kapoorritesh1111-create/SetuFlow-CRM` on 2026-07-09

## Problem

The design system review found the app's Tailwind setup was silently broken and internally
inconsistent:

1. **Broken brand scale (real bug).** `tailwind.config.ts` only defined `brand.primary/dark/teal`,
   no numeric ramp — so all 242 usages of `text-brand-700` / `bg-brand-50` / `ring-brand-500` etc.
   compiled to nothing, **including every focus ring built on `ring-brand-500`**.
2. **Plus Jakarta Sans was loaded but never applied.** `next/font` set `--font-jakarta` on `<html>`,
   but `tailwind.config.ts` never wired it into `fontFamily.sans`, so the whole app rendered in the
   browser's default sans stack. Fixed as a side effect of item 1's config replacement.
3. **95 unique hardcoded hex colors** in 723 arbitrary-value classes — parallel navy/teal systems,
   a stray `#0c7fff` blue (56 uses) competing with the real brand navy, an ad-hoc mobile navy family.
4. **15+ arbitrary corner radii** (960 usages) coexisting with the standard Tailwind radius scale.
5. **Dark-mode strategy conflict** — `globals.css` styled `.dark body` (class strategy) while
   `tailwind.config.ts` had no `darkMode` set, so `dark:` variants used the media-query strategy.
6. **`globals.css` as a patch layer** — DOM-shape and hex-substring `!important` selectors that
   break silently on any markup refactor.
7. **Domain colors defined but bypassed** — e.g. the mobile pipeline page hand-rolled its own
   misordered stage-color array instead of using the actual `stage.*` tokens.
8. **834× `font-black` / 189× `font-extrabold`** in dense product UI (900-weight wasn't even in the
   loaded font-weight set, so `font-black` was rendering as browser-synthesized fake-bold anyway).

## What changed

### 1. Tailwind config + tokens (fixes the bug, zero call-site changes required)
- `tailwind.config.ts` replaced with the token-driven version: `darkMode: 'class'`, `fontFamily.sans`
  wired to `--font-jakarta`, full `brand`/`accent` 50–950 ramps, `surface`/`line`/`content` theme
  tokens, `success/warning/danger/info` feedback triads, `stage.*` triads, `rounded-{ctl,card,panel,hero}`,
  `shadow-{soft,card,panel,hero,pop,focus-ring}`, `text-{display,title,section,body,small,caption}`.
  Back-compat kept 1:1: `brand.primary/dark/teal`, `status.*`, the custom slate-toned `neutral` override.
- `src/app/design-tokens.css` added (CSS custom properties: light, `.dark`, `.sf-field` mobile theme)
  and imported at the top of `globals.css`, above `@tailwind`.
- Verified with the standalone Tailwind CLI (`npx tailwindcss -i globals.css -o out.css`) — compiles
  clean, spot-checked generated rules for `brand-700`, `surface-1`, `rounded-panel`, `focus-visible:shadow-focus-ring`.
  (`next build` itself can't run in this sandbox — it fetches Plus Jakarta Sans from
  `fonts.googleapis.com` at build time and that host isn't in the sandbox's network allowlist. Confirmed
  this is a pre-existing sandbox limitation, not something introduced here, by running the identical
  `next build` against an untouched copy of the repo — same failure.)

### 2. `workspace-surfaces.ts` re-pointed at tokens
All 11 exported class strings (`workspacePanelClass`, `workspaceFieldSurfaceClass`, button variants,
etc.) now compose `surface-*`/`line`/`content-*`/`rounded-*`/`shadow-*`/`focus-visible:shadow-focus-ring`
tokens instead of arbitrary slate/hex/shadow values. This is the single highest-leverage file — every
consumer updates at once. Note: token colors are plain hex/rgba custom properties, not RGB-triplet
vars, so they don't take Tailwind opacity modifiers (`bg-surface-1/95`) — those were dropped rather
than silently no-op.

### 3. Color codemod — 569 of 723 arbitrary hex usages migrated
Script-driven (`codemod_colors.py`, included below the fold in this PR for reference), prefix-aware
(`bg`/`from`/`to`/`via` → surface role; `text`/`placeholder`/`fill`/`stroke` → content role;
`border`/`ring`/`divide`/`outline` (+ directional `border-{t,r,b,l,x,y}`) → line/border role). Only
matches a *single* hex alone in brackets, so multi-stop `linear-gradient(...)`/`radial-gradient(...)`
composites were never touched — those are decorative art, not flat semantic color.
Highlights: `#1F487C`→`brand-700` (113 uses), the stray `#0c7fff` blue family→`brand-500`/`brand-600`
(retiring it per the design system's explicit call-out), four parallel teal shades→`accent-500/600/700/300`,
two different ad-hoc hover-navy shades (`#13305a`, `#163561`) consolidated onto the one canonical
`brand-800` hover token, feedback-triad hexes (success/warning/danger) mapped onto their triads.

### 4. Radius codemod — 943 of 960 arbitrary radii migrated
Nearest-token mapping (`codemod_radius.py`) against `ctl(12px)/card(16px)/panel(24px)/hero(28px)`,
falling back to standard Tailwind steps (`rounded-sm/md/lg`, bare `rounded`) below `ctl`.

### 5. Status/quote/compliance/stage consolidation
- `src/components/ui/status-badge.tsx`: `TONE_CLASSES` re-pointed to the feedback triads; added
  `getQuoteTone()` and `getComplianceTone()` beside the existing `getStatusTone()`, per the mapping
  in DESIGN-SYSTEM.md 3.2 (draft→neutral, pending→warning, approved/sent→info, accepted→success,
  rejected→danger, expired→neutral / ready→success, in-progress→warning, blocked→danger, expired→neutral).
- `src/components/ui/stage-chip.tsx` (new): the `StageChip` primitive from the component kit — fixed
  stage triads, `solid` variant for kanban column headers, optional count.
- `src/lib/lead-health.ts`: `getLeadHealthBadgeClasses` now reuses `TONE_CLASSES` from `status-badge.tsx`
  instead of its own bespoke rose/amber/orange/emerald palette (fresh→success, overdue/stalled→warning,
  at_risk→danger) — collapses into the same triads per DESIGN-SYSTEM.md 3.2.
- `src/app/(mobile)/mobile/pipeline/page.tsx`: this was the design system's cited evidence for
  "domain colors defined but bypassed." Its local `STAGE_COLORS` array was a hand-copied, **misordered**
  hex array that didn't match the real `stage.*` domain tokens used on the desktop pipeline board —
  meaning the same stage could render a different color on mobile vs desktop. Replaced with the fixed
  `chart-1..6` categorical order (a pipeline's stages are org-configurable, so the fixed 7-slot
  `stage.*` semantic set doesn't apply generically here — the chart categorical tokens are the correct
  fit per DESIGN-SYSTEM.md 3.2). Also scoped the `.sf-field` dark-navy theme to just this hero card
  (see mobile theme note below) instead of a hardcoded gradient.

### 6. Governance test + docs
- `tests/design-tokens.test.mjs` (new, wired into `npm test`): five checks — arbitrary hex colors,
  arbitrary radii, arbitrary tracking values, and `font-black`/`font-extrabold` outside marketing
  routes each have a **ratchet ceiling** at today's actual count (they can't silently get worse), plus
  a check that `globals.css` doesn't accumulate more hex-substring/DOM-shape `!important` selectors
  than the 8 pre-existing ones. This repo isn't currently a git working copy in this sandbox, so I
  couldn't do the "changed files only" diff-based version the design system describes — a ratchet on
  total count is the honest equivalent.
- `AGENTS.md`: added a "Design System" section (5 numbered rules, same style as the existing Critical
  Rules) pointing at `docs/DESIGN-SYSTEM.md` and the new mappers/components.
- `docs/DESIGN-SYSTEM.md` and `public/internal/design-system/style-guide.html` added to the repo.

## Verification

- `npx tsc --noEmit` — clean, before and after every step.
- `npx tailwindcss -i src/app/globals.css -o out.css` — compiles clean; spot-checked generated CSS
  for the new token classes.
- `npm test` — **same 27 pre-existing failures, before and after, byte-for-byte identical failure
  set** (confirmed by diffing the failing-test-name list against an untouched copy of the repo). Zero
  regressions from this change. All 5 new governance tests pass.
- `next build` — can't complete in this sandbox (Google Fonts fetch blocked by network allowlist);
  confirmed this is pre-existing by running the same build against an untouched copy.

## What I deliberately did not do (and why)

- **`font-black`/`font-extrabold` → `font-bold` downgrade (governance rule 2).** I wrote and ran this
  codemod (917 usages, 97 files), then **reverted it**. Unlike the color/radius work — which preserves
  near-identical visual values while fixing a real bug — this is a pure style call at the scale of
  nearly the entire product surface, and I have no way to visually verify hundreds of screens still
  look right. The script is ready (`codemod_font_weight.py`) but I'd want you to eyeball a handful of
  dense screens (dashboard KPI tiles, mobile command-center cards) after running it before it ships.
- **154 remaining arbitrary hex colors, 17 remaining arbitrary radii.** Left untouched on purpose:
  - The olive/green marketing palette (`#1f2a1d`, `#85AB8B`, `#4b5b47`, etc.) — confined to
    `src/components/marketing/{boomerang-video-bg,investor-overview-page}.tsx`. No token in the
    design system covers it; inventing one would be guessing at a color decision, not implementing
    the analysis.
  - The internal SMC sprint-board tool (`src/app/(app)/workspace/**`, `src/app/smc/**`) — its own
    violet/sky/emerald dark theme, a deliberately different design language from the CRM, out of
    scope for this design system.
  - ~15 unique low-frequency hexes used as per-admin-section icon-header gradient accent pairs
    (`from-[#0c4a6e] to-[#075985]` etc., one pair per settings page for visual variety) — no
    per-section token exists to replace them with.
  - Multi-stop `linear-gradient()`/`radial-gradient()` composites everywhere — decorative art, not
    flat semantic color; flattening them onto a single token would be lossy.
- **`tracking-[...]` consolidation (1365 usages) into the single `text-caption` eyebrow style.** Ratcheted
  (can't get worse) but not migrated — this needs the same per-usage judgment as the font-weight change
  and touches even more call sites; flagging as a follow-up rather than guessing at 1365 individual cases.
- **`globals.css` chat-thread `!important` patches and the `section[class*="#061c2e"]` mobile-trial-compression
  selector.** I could not confidently locate the live component the hex-substring selector targets
  (it may be dead CSS from an earlier version of the mobile lead page) without visual QA, so I left it
  rather than risk silently breaking the guided-trial mobile compression feature. The chat-thread
  pixel-level overrides (~150 lines) need matching component-level surgery in `chat-thread.tsx` /
  `crm-chat-fab*.tsx` to retire safely — flagging as a follow-up rather than deleting CSS I can't
  verify has an equivalent replacement.
- **Full `.sf-field` mobile theme rollout.** The design system's migration step reads as "wrap the
  whole mobile route in `.sf-field`," but the actual `MobileShell` root is a **light** theme — the
  dark navy family is used selectively for hero/command-center cards within an otherwise light shell
  (task workspace, order workspace, pipeline summary), not as a page-level theme. Wrapping the whole
  route would visibly break the light shell. Applied `.sf-field` correctly scoped to one card
  (mobile pipeline hero) as the reference pattern; the same pattern needs replicating on
  `mobile-tasks-workspace.tsx`, `mobile-orders-workspace.tsx`, and the leads-workspace hero — flagged
  rather than done blind across all of them.

## Files touched

Tooling: `tailwind.config.ts`, `src/app/design-tokens.css` (new), `src/app/globals.css`,
`src/components/ui/workspace-surfaces.ts`, `src/components/ui/status-badge.tsx`,
`src/components/ui/stage-chip.tsx` (new), `src/lib/lead-health.ts`,
`src/app/(mobile)/mobile/pipeline/page.tsx`, `tests/design-tokens.test.mjs` (new), `package.json`
(test script), `AGENTS.md`, `docs/DESIGN-SYSTEM.md` (new), `public/internal/design-system/style-guide.html` (new).

Codemod (mechanical, ~270 files touched across `src/app`, `src/components`, `src/features`): color
and radius arbitrary-value replacements per the mapping above.
