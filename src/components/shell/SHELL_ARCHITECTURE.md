# Shell Architecture — `src/components/shell/`

**Consolidated: Pass 4 (2026-04-30)**

Previously split across three directories:
- `src/components/shell/` — mobile/PWA utilities
- `src/components/layout/shell/` — navigation and routing types
- `src/components/setu-shell/` — dead UI helpers (deleted, nothing imported it)

All shell concerns now live in **`src/components/shell/`**. The consuming parent is `src/components/layout/app-shell.tsx`.

---

## File ownership

| File | Responsibility | Imported by |
|---|---|---|
| `navigation.tsx` | Sidebar navigation renderer. Builds route sections from `route-meta.ts`, applies active-state logic, workspace mode, and context tabs. | `app-shell.tsx` |
| `route-meta.ts` | Maps routes to metadata: title, icon, context tabs, workspace mode scoping. Single source of truth for which routes appear in the sidebar. | `app-shell.tsx` |
| `types.ts` | Shared types: `NavItem`, `NavSection`, `ContextTab`, `RouteMeta`. No runtime logic. | `navigation.tsx`, `route-meta.ts`, `utils.ts` |
| `utils.ts` | Pure helpers: `withWorkspaceMode`, `withWorkspaceModePreservedParams`, `getWorkspaceBasePath`, `getWorkspaceModeFromLocation`, `isNavItemActive`, `getNavItemIcon`. | `navigation.tsx`, `app-shell.tsx` |
| `MobileTabBar.tsx` | Bottom tab bar for mobile viewports. Shown only on verified mobile-supported routes. | `app-shell.tsx` |
| `DesktopRedirect.tsx` | Detects mobile viewports on desktop-only routes and redirects to a safe fallback. | `app-shell.tsx` |
| `OfflineIndicator.tsx` | Shows a banner when the browser goes offline. Scoped to the trade-event capture wedge. | `app-shell.tsx` |
| `ServiceWorkerRegistration.tsx` | Registers the PWA service worker on mount. Scoped to offline lead capture queue only. | `src/app/layout.tsx` |

---

## Rules

1. **Only `app-shell.tsx` and `layout.tsx` import from this folder.** Features must not import shell components directly.
2. **Route metadata lives in `route-meta.ts` only.** Do not duplicate route lists in other files.
3. **Mobile components** (`MobileTabBar`, `DesktopRedirect`, `OfflineIndicator`, `ServiceWorkerRegistration`) are mobile-wedge only. Do not expand them beyond trade-event capture without a Pass 6 mobile decision.
4. **No new shell directories.** If a new shell concern is added, it goes in this folder with an entry in this document.

---

## What was deleted

- `src/components/layout/shell/` — merged here
- `src/components/setu-shell/index.tsx` — dead UI helpers, zero imports, removed in Pass 4
