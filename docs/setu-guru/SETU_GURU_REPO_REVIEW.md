# Setu Guru Repo Review — Current CRM Understanding

_Last updated: 2026-05-06_

## Review scope

This package was reviewed across the active source tree, route manifest, docs, tests, and Supabase mitigation migrations before Setu Guru was added.

| Area | Files reviewed | Line count |
| --- | ---: | ---: |
| `src/app` | 160 | 11,854 |
| `src/components` | 49 | 6,301 |
| `src/features` | 269 | 64,779 |
| `src/lib` | 97 | 14,770 |
| `mitigation/supabase/sql` | 81 | 9,675 |

## Current product model

Setu Flow CRM is now organized around a locked operating flow:

```text
Capture → Follow-up → Quote → Approvals & Sending → Orders / Execution
```

Supporting surfaces include Pipeline / Risks, Trade Events, Tasks, Catalog, Admin & Settings, Dashboard / Overview, AI Suggestions, Documents, Compliance, Contracts, Reports, Integrations, Profile, My Card, and mobile capture.

## Major upgraded capabilities observed

### 1. Authenticated app shell

- `src/app/(app)/layout.tsx` loads workspace access, organization, membership, roles, profile, and My Card settings.
- `src/components/layout/app-shell.tsx` owns the global shell, mobile/desktop header, navigation, global toasts, vCard modal, route help, workspace mode switch, Quick Lead button, and now Setu Guru.
- `src/components/shell/route-meta.ts` provides route-specific titles, descriptions, section labels, and help context.

### 2. Navigation and route contract

- `src/lib/routes/manifest.json` is the route contract for primary navigation, admin tabs, labels, aliases, and guardrails.
- `src/lib/product-contract.ts` exports the route contract to the shell and tests.
- Tests guard route presence and canonical nav order.

### 3. Lead command center

- `src/features/leads/command-center` contains the modern focused lead workspace: header, tabs, context rail, right rail, workflow actions, quote panel, activity, and quote summary timeline.
- Lead workflow now emphasizes qualification, product interest mapping, next action, follow-up, quote prep, and commercial readiness.

### 4. Quote and pricing engine

- Quote surfaces include quote launchpad, quote workspace, wizard, trust/contract preview, WhatsApp sending, PDF route, and approval-send handoff.
- Pricing engine code under `src/features/quotes/pricing` separates repositories, mappers, services, type contracts, PDF generation, approval, negotiation, rendering, FX, freight, and quote versioning.
- Quote-only adjustments are distinct from product/category/default pricing rules.

### 5. Product catalog and pricing governance

- Product workspace includes product manager, product table, add/detail drawer, import/export wizard, spreadsheet route, and product pricing calculator panel.
- Catalog governance uses organization defaults, category defaults, product variants, product-specific overrides, and import validation.
- Admin product management and category governance exist for defaults and setup health.

### 6. Order execution

- Orders workspace and server actions support accepted quote handoff, blocker visibility, document upload, state transitions, contract posture, and execution readiness.
- Order state progression is explicitly controlled and should not be treated as automatic.

### 7. Trade events and mobile capture

- Trade events include admin setup, event capture, show-floor conversion, and post-event lead flow.
- Mobile code supports phone-first shell, business-card scan, role-aware lead list, vCard share sheet, offline lead queue, and scan readiness.

### 8. AI suggestions and guardrails

- AI Suggestions and Admin AI Analytics are present.
- AI is positioned as draft/review support, not autonomous authority over pricing, approvals, sends, compliance, or order state changes.

### 9. Admin, onboarding, and access

- Public onboarding routes collect client setup requests.
- Admin onboarding/provisioning, invitations, users, roles, audit, and organization setup are supported.
- Invitation acceptance and first-admin invite flows have tests.

### 10. Docs and tests

- Active docs are centralized in `README.md`, `CHANGES.md`, and `docs/`.
- Smoke tests cover route contracts, mobile, onboarding, release proof, docs consistency, DCC alignment, and hydration shell behavior.

## Setu Guru addition

Setu Guru was added as a route-aware embedded assistant shell:

| Item | File |
| --- | --- |
| Widget component | `src/features/setu-guru/setu-guru-widget.tsx` |
| Shell integration | `src/components/layout/app-shell.tsx` |
| Avatar asset | `public/setu-guru/setu-guru-avatar.svg` |
| Public diagrams | `public/setu-guru/navigation-map.svg`, `public/setu-guru/pricing-hierarchy.svg`, `public/setu-guru/roles-permissions.svg` |
| Knowledge docs | `docs/setu-guru/` |

## Human-control rules Setu Guru must preserve

Setu Guru can explain, route, draft, and recommend. It must not autonomously:

- change prices or pricing defaults;
- approve or reject quotes;
- send quotes, WhatsApp messages, or emails without user review;
- advance order states;
- clear compliance decisions;
- assign roles or invite users without explicit admin action;
- invent policies not in the knowledge base.

## Recommended future backend learning loop

1. Capture user question, current route, role, organization id, retrieved docs, answer, feedback, and unresolved intent.
2. Store feedback in a review table such as `setu_guru_feedback`.
3. Review repeated misses in Admin → AI Review or a future Admin → Setu Guru page.
4. Convert approved fixes into docs/setu-guru knowledge updates.
5. Re-index knowledge and track answer quality over time.

