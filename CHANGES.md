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

## 2026-05-24 — SF-18-078 Admin/Settings UX Overhaul — All subtasks resolved (E through K)

Completed the full Admin/Settings UX overhaul epic. All 11 child subtasks (SF-18-078A through SF-18-078K) are now resolved. Verified Supabase live schema before each DB migration. TypeScript compile: 0 errors.

### SF-18-078E — Pipelines & Stages: visual pipeline board
- Replaced the dense inline-form-per-row StagesAdminWorkspace with a horizontal colored stage pill board per pipeline.
- Each stage shows its color bar, name, sort number, and Won/Lost/Closed chips. Clicking a pill opens a CSS `:target` right-side drawer with the full edit form.
- Added Edit pipeline, Add stage, Add pipeline, and Edit/Add next step CSS `:target` drawers throughout.
- Next steps replaced with a clean read-only table + CSS `:target` edit drawers.
- No new client components. No useState. Pure server render + CSS `:target` pattern.

### SF-18-078F — Security & Roles: visual permission matrix
- Added `PERMISSION_GROUPS` registry (10 permissions across Leads, Quotes, Orders, Admin modules).
- Replaced textarea-per-role with a read-only roles table; clicking Edit opens a 500px CSS `:target` drawer with grouped permission checkboxes.
- Updated `updateRolePermissions` server action to use `formData.getAll("permissions")` for checkbox arrays (backward compatible with legacy newline format).
- Create role moved to a CSS `:target` drawer.

### SF-18-078G — Integrations: live status cards
- Rewrote integrations page from static prose to a 3-column live status grid.
- Email status read from `MAILTRAP_API_KEY` env var; finance/freight read from `integrations` table `is_active`.
- Amber warning banner when email is misconfigured.
- Moved to `requireSetuInternalAdminWorkspace` (Platform section is SETU-only).

### SF-18-078H — Rate Limits: new page + DB migration
- Created `/admin/rate-limits` (SETU internal only).
- New Supabase tables: `rate_limit_overrides`, `rate_limit_override_audit` — applied via MCP migration.
- Page shows 5 monitored endpoints merged with per-org overrides. Violet highlight for active overrides.
- CSS `:target` edit drawer per endpoint with limit value and reason fields.
- `saveRateLimitOverride` and `resetRateLimitOverride` server actions write to both tables.
- Audit log table renders last 20 changes.

### SF-18-078I — Setu Guru Config: new page + DB migration
- Created `/admin/guru-config` (all org admins).
- New Supabase table: `workspace_guru_settings` — applied via MCP migration. Default rows seeded for all existing orgs.
- Monthly usage bar reads `rate_limit_hits` for current org; color-coded teal/amber/red.
- Config form: model selector, 4 toggle checkboxes, daily budget input.
- `saveGuruConfig` server action upserts `workspace_guru_settings`. Falls back to env vars if no row exists.

### SF-18-078J — Client Onboarding: inbox redesign
- Restructured page: AdminPageHero → Dashboard stat bar → Request inbox → Collapsible docs (bottom).
- Dashboard stat bar: Needs Action (rose), Reviewing (amber), Live (emerald), Total (slate) — 4 card grid.
- Added `StatusPipeline` component: 4-step horizontal pipeline (Intake → Provision → Invite → Live) per request card.
- Plan change request detection: if `status === "live"` AND `pricing_rules_notes` has content, violet banner appears with the notes text and Dismiss button.
- Requests sorted server-side: needs-action first, live clients last.
- Documentation sections moved into `<details>` collapsible at page bottom.

### SF-18-078K — API Keys & Webhooks: new page + DB migration
- Created `/admin/api-keys` (SETU internal only).
- New Supabase table: `api_keys` — applied via MCP migration.
- `generateApiKey`: generates `sf_live_` + 24 hex chars, SHA-256 hashes via Web Crypto API, stores only hash + prefix. Raw key shown once in a green one-time reveal banner via `?preview=`.
- `revokeApiKey`: sets `is_active=false` and `revoked_at`.
- CSS `:target` Generate key drawer with name and scope checkboxes (read:leads, write:quotes, read:orders, admin:read).
- Webhooks empty state with "Coming soon" disabled button.
- Revoked keys table rendered below active keys for audit trail.
