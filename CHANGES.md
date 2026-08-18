## 2026-08-18 — Sprint 51 Trade Event mobile capture continuation

- Fixed Trade Event mobile Capture so one canonical Quick Lead window owns the interaction; the hidden responsive drawer can no longer reopen after close.
- Mobile bottom navigation now keeps a right-most More entry with Tasks and Events, providing a reliable return path to the Trade Event Command Center.
- Added an offline/low-signal Event Capture fallback for trade-show floors. Buyer, supplier, scan, dictate and Capture actions route to the local fallback when the browser is offline, and Event Mode also exposes an explicit “Low signal? Save offline” action.
- Offline captures receive a client capture ID, persist temporarily on the device, automatically retry on reconnect, expose pending/failed/retry state, and use the canonical event-aware lead save path so CRM dedupe, source attribution and follow-up work remain intact.
- Offline queue retention is bounded to 150 captures and seven days. If the browser cannot persist the capture, Setu Flow reports that condition instead of claiming the lead is safely saved.
- Wired recent booth interactions into the Trade Command Center so saved conversations can show contact/company context, product interest, SLA/CRM state, notes and attached evidence count.
- The interaction evidence uploader activates only when the private attachment table/storage capability exists; before the approved migration rollout, the Command Center shows a non-blocking staged-capability notice instead of treating the missing table as a product error.
- Added code-only migration `20260818101500_s51_event_offline_capture_idempotency.sql` for database-level retry race protection. It has not been applied to production.
- Existing canonical event catalog, recommendation feedback and event attachment migrations remain code-only pending the approved database rollout.
- PR #78 remains Draft and unmerged. Production schema/data have not been changed by this continuation pass. Mobile single-window capture and More → Events navigation were user-accepted on 2026-08-18; offline queue behavior and attachment upload runtime remain awaiting acceptance at their respective runtime gates.

## Sprint 28 SMC client operations — S28-UX-022

- Reframed the Client Orgs correction from zoom-based scroll recovery to adaptive viewport behavior.
- Kept natural full-page scrolling for Entitlements, Lifecycle, Guru/API, and Activity instead of trapping the selected workspace in a short internal scroll pane.
- Added adaptive rules so KPI cards, tab spacing, form grids, two-column cards, and selected-client layout compress or reflow based on actual screen width and height.
- Kept only the left client organization list eligible for independent scrolling when the list grows long.
- Preserved sales/demo usability at normal browser zoom without creating large dead space below active tab content.

## Sprint 28 SMC client operations — S28-UX-021

- Differentiated Client Orgs tabs so Entitlements now reads as a compact policy and limits matrix, while Lifecycle reads as a journey and conversion workspace.
- Replaced large checkbox-style controls with compact premium switch rows across Entitlements and Guru/API.
- Reworked Lifecycle around a stage rail, next-action panel, contact card, source/event card, and conversion panel.
- Reduced the selected client workspace's nested-scroll feel by letting tab content expand naturally inside the main page workspace.
- Kept Activity focused on the client operation audit timeline introduced in S28-FEAT-012.

## Sprint 28 SMC client operations — S28-FEAT-012

- Wired the Client Orgs Activity tab to existing `audit_logs` records for SMC client operations.
- Added per-client audit timeline entries for module grants, entitlement updates, Guru/API changes, lifecycle conversion, and related SMC actions.
- Included actor user ID, timestamp, action type, entity/related client IDs, and compact before/after summaries in the Activity tab feed.
- Added defensive redaction for sensitive key/token/secret/password/API credential fields before audit payloads are shown in SMC.
- Kept the implementation schema-free and reused existing SMC audit writes.

## Sprint 28 SMC client operations — S28-FEAT-011

- Added lifecycle context loading for SMC Client Orgs from existing `client_onboarding_requests` and trial-linked `leads` data.
- Expanded the Client Orgs data model with trade-show source, event, contact, requested-plan, requested-seat, product-interest, follow-up, and trial lead count fields.
- Replaced the Lifecycle placeholder with a real trade-show trial lifecycle workspace inside the selected client tabs.
- Added contact actions for email, phone, and website directly from the Lifecycle tab.
- Added editable lifecycle controls for stage, billing, target plan, seats, trial end, renewal date, trial template, and conversion notes.
- Added save lifecycle and convert-to-paid actions using the existing protected SMC entitlement workflow, preserving audit and onboarding writeback behavior.

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
