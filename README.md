# SETU Flow CRM

SETU Flow CRM is a trade-focused SaaS platform for managing buyers, suppliers, quotes, orders, product catalogs, commercial approvals, and field capture workflows. It is designed for teams that source, sell, and execute international trade opportunities across markets, products, events, and relationship-driven pipelines.

The application combines a full desktop command center for operators with a mobile-first field experience for trade shows, buyer meetings, supplier visits, and on-the-go follow-up. Desktop workflows remain the source of depth and administration; mobile workflows are optimized for speed, capture, review, and next action.

## What the product does

SETU Flow helps a trade organization move from first contact to commercial execution:

1. Capture a buyer or supplier lead.
2. Qualify the opportunity by market, product, event/source, owner, and next action.
3. Manage the lead through a role-aware pipeline.
4. Create and review quotes with pricing, freight, FX, approvals, and trust evidence.
5. Convert accepted commercial decisions into order execution records.
6. Track activity, tasks, reports, compliance, and operational handoffs.
7. Share professional digital business cards and collect inbound contacts from public card links.

## Core product areas

### Dashboard

The dashboard is the operator command center. It surfaces lead health, account activity, pipeline movement, market coverage, priority actions, recent activity, and operating context. It includes configurable dashboard components and supporting analytics so owners, managers, and team members can understand what needs attention.

Main route:

```text
/dashboard
```

### Leads

The lead workspace manages buyer and supplier relationships. It supports lead entry, lead editing, filtering, stage management, health/status indicators, AI-assisted context, recent activity, and command-center style lead detail surfaces.

Lead access is role-aware:

| Role | Visibility |
|---|---|
| Owner/Admin | Workspace-wide lead visibility |
| Manager | Team and direct-report visibility |
| Member | Assigned-lead visibility |

Main routes:

```text
/leads
/leads/[leadId]
/leads/buyers
/leads/suppliers
```

### Quick Add Lead and Smart Capture

Quick Add Lead is the fast capture surface for mobile and desktop. It supports manual entry and card/document scanning.

In the current investor-demo production mode, camera photos are read directly with OpenAI Vision and then mapped into the visible Quick Add Lead form for review before save. Uploaded PDFs continue to use the existing file scan path.

The form supports buyer and supplier capture, company/contact fields, country, title, email, phone, WhatsApp, source/event details, owner, deal estimate, and follow-up context.

Field capture is intentionally flexible for trade-show work. Operators can capture a specific product, an entire category, or a new buyer/supplier request that is not yet in the catalog. Voice notes are supported in browsers with speech recognition so teams can dictate meeting context immediately after scanning a card.

Production scan provider mode:

```env
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
```

Readiness endpoint:

```text
/api/mobile/scan-readiness
```

Expected scanner mode for this build:

```json
{
  "requestedProvider": "openai-vision",
  "activeProvider": "openai-vision",
  "fallbackProvider": "openai"
}
```

### Pipeline

The pipeline workspace organizes leads by workflow stage and supports board-style review, buyer/supplier modes, filters, detail panels, and AI context. It is used by operators and managers to prioritize movement through qualification and commercial readiness.

Main routes:

```text
/pipeline
/pipeline/buyers
/pipeline/suppliers
```

### Products and catalog management

The product area manages product records, product detail, spreadsheet-style catalog review, pricing rule ingestion, product status contracts, and catalog gaps. It supports product options needed by quoting, lead qualification, and order workflows.

Main route:

```text
/products
```

Supporting API routes:

```text
/api/products
/api/products/[productId]
/api/products/spreadsheet
```

### Quotes

The quote area supports quote creation, commercial review, trust evidence, quote history, WhatsApp quote delivery, and pricing logic. It includes pricing, FX, freight, quote compilation, approval/send paths, and mobile-safe quote surfaces for phone users.

Main routes:

```text
/quotes
/leads/[leadId]/quote
/approval-send
```

### Orders

Orders capture the execution layer after quote acceptance. The repo includes order operation logic, execution snapshots, order detail panels, and tests that validate order authorization and execution behavior.

Main route:

```text
/orders
```

### Trade events

Trade events support show/event capture, source attribution, lead entry at events, and product/market context. The mobile experience supports field capture during trade shows and supplier/buyer meetings.

Main route:

```text
/trade-events
```

### Tasks, reports, compliance, contracts, and documents

SETU Flow includes supporting operator workspaces for daily execution, reporting, compliance review, contracts, documents, and evidence-oriented workflows.

Main routes:

```text
/tasks
/reports
/compliance
/contracts
/documents
```

### Admin and organization setup

Admin workspaces manage organization settings, users, invitations, markets, categories, pipelines, stages, trade events, product management, security, audit, and AI analytics.

Main routes:

```text
/admin
/admin/users
/admin/organization
/admin/product-management
/admin/audit
/admin/security
/admin/ai-analytics
```

### Integrations

The integrations area includes connector definitions, governed sync, replay, retry queues, and governance checks. It is designed to support reliable operational sync rather than silent background failures.

Main route:

```text
/integrations
```

### Digital business card and contact exchange

SETU Flow includes a professional contact exchange surface for sharing a signed-in user’s digital business card and collecting inbound contact details.

Capabilities include:

- Public card link
- QR code share
- vCard download
- Copy link
- Email share
- Saved My Card settings
- Contact intake review
- Public card intake API

Main routes:

```text
/contact-exchange/vcard
/contact-exchange/scan
/card
```

Supporting API routes:

```text
/api/contact-exchange/vcard
/api/my-card-settings
/api/public/card-vcf
/api/public/card-intake
/api/public/card-intake/prefill
```

### Mobile app experience

The mobile app experience is additive and isolated from the desktop product. It is designed for phone-width use cases and avoids compressed desktop layouts.

Mobile surfaces include:

- Home
- Leads
- Capture
- Quote
- Orders
- Notifications
- Settings
- Quick Add Lead
- Share vCard

Mobile routes:

```text
/mobile
/mobile/leads
/mobile/capture
/mobile/quote
/mobile/notifications
/mobile/settings
```

Canonical desktop routes such as `/leads`, `/orders`, and `/leads/[leadId]/quote` also include mobile-safe rendering at phone viewport sizes while preserving desktop behavior at desktop widths.

## Contact actions

SETU Flow supports native communication handoffs from mobile lead cards and share surfaces.

- Email actions open the device email client with a prefilled subject and body.
- WhatsApp actions open `https://wa.me/` using normalized phone numbers and a prefilled message.
- Actions are shown only when the required contact value exists.
- vCard downloads use saved My Card settings so the contact file matches the public card identity.

## Technical architecture

### Framework

- Next.js 14 App Router
- React 18
- TypeScript
- Supabase SSR/client libraries
- Tailwind CSS
- Server routes and server actions for data and workflow operations

### Source layout

```text
src/app                  Next.js routes, API routes, layouts, auth and public pages
src/features             Product feature modules and workspace implementations
src/components           Shared UI, shell, layout, branding, and contact-exchange components
src/lib                  Data access, workflow logic, AI helpers, security, Supabase, and domain utilities
supabase/migrations      Database migrations and security hardening scripts
tests                    Contract, route, security, pricing, order, mobile, and release checks
public/internal-dcc      Internal design/component catalog and mobile blueprint
public/logos             Brand assets
docs                     Release, product, security, operations, and proof documentation
scripts                  Verification, readiness, and maintenance scripts
```

### Data and backend

The application uses Supabase for database access, authentication support, server-side privileged paths, row-level security, and migration-managed schema changes. Server-side code is organized around feature modules and shared domain libraries.

Important backend areas include:

- `src/lib/supabase/*` for Supabase clients
- `src/lib/workspace/*` for workspace roles and permissions
- `src/lib/permissionGuards.ts` for permission boundaries
- `src/features/*/server/actions.ts` for feature-specific server actions
- `src/lib/queries/*` for data-loading view models
- `supabase/migrations/*` for schema, RPC, RLS, and hardening changes

### Security and governance

The repo includes security, permissions, and governance checks across workspace access, RLS boundaries, order authorization, RPC grants, connector governance, and release proof.

Relevant areas:

```text
docs/SECURITY_POLICY.md
docs/SECURITY_HARDENING.md
docs/RELEASE_READINESS.md
docs/RELEASE_PROOF.md
tests/security/*
tests/workspace/*
tests/integrations/*
```

### Internal design/component catalog

The internal DCC documents UI patterns, mobile tokens, mobile components, navigation, workflows, and implementation guidance.

Main files:

```text
public/internal-dcc/index.html
public/internal-dcc/mobile-blueprint.html
public/internal-dcc/mobile-patterns.md
public/internal-dcc/mobile-tokens.json
```

## Environment variables

Required production variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://www.setuflowcrm.com
NEXT_PUBLIC_SITE_URL=https://www.setuflowcrm.com
FEATURE_MOBILE_APP_V1=true
NEXT_PUBLIC_FEATURE_MOBILE_APP_V1=true
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
```

Optional comparison/future OCR variable:

```env
GOOGLE_CLOUD_VISION_API_KEY=
```

The current recommended card scan mode is `openai-vision`. Google Vision support can remain configured for comparison, but it is not required for the current direct photo scan flow.

## Local development

Install dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev
```

Run the production build locally:

```bash
npm run build
```

Run the primary verification suite:

```bash
npm test
```

Run the mobile scan readiness check:

```bash
npm run check:mobile-scan
```

Run full release proof checks where the environment has all dependencies and required variables:

```bash
npm run release:proof
```

## Testing and verification

The repository includes tests for:

- Route presence and route contracts
- Release readiness and documentation consistency
- Dashboard freeze checks
- Mobile route isolation
- Role-aware mobile lead visibility
- Quick Add Lead scan behavior
- Mobile scan provider readiness
- vCard and quote mobile behavior
- Lead actions and drawer footer behavior
- Pricing helpers and services
- Workspace permissions
- Order execution
- Integration governance
- Security/RLS/RPC hardening

Primary scripts:

```bash
npm test
npm run typecheck
npm run build
npm run check:mobile-scan
npm run test:pricing
npm run test:workspace
npm run test:orders
npm run test:integrations
npm run test:security
npm run test:all
```

## Deployment checklist

Before production deploy:

1. Confirm Vercel environment variables are set for Production.
2. Confirm Supabase URL, anon key, and service role key are configured.
3. Confirm `CONTACT_SCAN_PROVIDER=openai-vision` for the current card scan build.
4. Confirm `OPENAI_API_KEY` has available credit and model access.
5. Redeploy with a cleared build cache after environment changes.
6. Open `/api/mobile/scan-readiness` and confirm `activeProvider` is `openai-vision`.
7. Test `/leads?quickLead=1` on a real phone.
8. Scan a business card and verify fields are filled before save.
9. Test email and WhatsApp actions from a lead with valid contact values.
10. Test Share vCard download and confirm the contact name, phone, email, website, and organization are correct.
11. Test desktop `/dashboard`, `/leads`, `/quotes`, `/orders`, and `/admin` at desktop width.

## Product QA checklist

### Desktop

- Dashboard loads with KPI and workflow surfaces.
- Leads workspace opens, filters, and detail pages work.
- Pipeline board is usable at desktop width.
- Quote route opens without mobile compression.
- Orders page remains accessible.
- Admin workspaces load for authorized users.
- Reports, tasks, compliance, contracts, products, and integrations routes remain reachable.

### Mobile

- Mobile shell renders without compressed desktop layout.
- Bottom navigation is visible and usable.
- Quick Add Lead opens above the mobile navigation.
- Camera/file scan shows progress immediately after the picker closes.
- Scan result fills the visible form fields and allows review before save.
- Leads list respects role visibility.
- Lead cards support Open, Quote, Email, and WhatsApp when data exists.
- Orders and quote screens are mobile-safe.
- Share vCard uses saved My Card data.

## Current release focus

This repo snapshot is focused on a polished SaaS demo and production pilot posture:

- Preserve desktop CRM workflows.
- Keep mobile additions isolated and feature-flagged.
- Provide a reliable investor-demo card scan path through direct OpenAI Vision.
- Avoid customer-facing technical/debug copy.
- Keep contact actions practical for field users.
- Maintain release proof, security, and route coverage through automated checks.

## Notes for future production hardening

- Keep the direct OpenAI Vision scan mode for investor/customer demos.
- Compare long-term OCR options after pilot usage volume is known.
- Consider a dedicated SETU Scan Agent service when scan volume or cost justifies owned OCR infrastructure.
- Continue storing user-reviewed scan corrections to improve parsing and field quality over time.
- Keep desktop and mobile route behavior contract-tested to avoid regressions.
