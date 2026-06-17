## Sprint 28 SMC client operations — S28-UX-020

- Refactored SMC Client Orgs from a long selected-client drawer into a tabbed operations workspace.
- Added focused tabs for Overview, Modules, Entitlements, Guru & API, Lifecycle, and Activity.
- Moved module grant controls into a dedicated Modules tab with scoped status messages.
- Reworked Entitlements and Guru/API controls into separate tabs with compact toggle rows.
- Added Lifecycle and Activity landing zones for S28-FEAT-011 and S28-FEAT-012.
- Preserved existing protected SMC API/data flows.

## Sprint 28 SMC client operations — S28-FEAT-009

- Added a protected SMC Client Orgs API route for per-client Setu Guru runtime settings and API access management.
- Extended Client Orgs data loading with `workspace_guru_settings`, `api_keys`, `rate_limit_overrides`, and `client_usage_rollups` so SMC can see Guru credit usage and API posture per client.
- Added a Guru Credits & API Access section to the Client Orgs drawer with model, live search, writeback, admin approval, analytics, daily budget, API rate limit, rate-limit reason, API key status, and revoke controls.
- Kept platform organization mutation blocked from Client Orgs and wrote SMC audit entries for Guru/API policy changes.

## Admin Command Center UX pass

- Reworked the Admin shell to match the attached Admin Redesign HTML: sticky dark admin chrome, quick page row, grouped left rail, compact section header, status chips, governance banner, and HQ-only internal section.
- Preserved existing live Supabase-backed admin functions instead of replacing them with mock prototype data.
- Added prototype-compatible aliases for `/admin/catalog`, `/admin/catalog-governance`, `/admin/pricing`, and `/admin/documents`.
- Updated `/admin` to redirect to `/admin/overview`.
- Tightened Admin Home to a command-center layout with compact governance progress.

# Changes

## 2026-06-06 — Reverted public marketing View Transition pass

- Removed the experimental View Transition navigation handler from the public marketing shell after live testing showed poor transition quality and language picker/dropdown interference.
- Deleted the marketing motion CSS module and removed global `::view-transition-*` timing rules.
- Restored standard Next.js link navigation for public marketing pages, preserving header, language selector, workspace entry, and Setu Guru lite behavior.

## 2026-06-06 — Public marketing motion polish

- Added a scoped View Transition API polish layer for the public marketing shell so supported browsers get a calm page-to-page fade/lift between public pages.
- Limited animated navigation to public marketing routes only: `/`, `/platform`, `/solutions`, `/setu-guru-ai`, `/field-mobile`, `/pricing`, `/compare`, `/training`, and `/book-demo`.
- Kept `/client-login`, `/workspace`, SMC, authenticated CRM routes, and the internal `/mobile` experience outside the transition handler so operational surfaces remain plain and predictable.
- Added persistent shared-element naming for the public header, logo, and footer plus reduced-motion safeguards and browser fallback behavior.
