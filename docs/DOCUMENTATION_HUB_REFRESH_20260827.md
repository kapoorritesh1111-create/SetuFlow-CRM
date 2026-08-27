# SETU Flow Documentation Hub Refresh — 27 Aug 2026

## Purpose

Refresh `/internal/setuflow-docs.html` against current `main` and stop treating the July 2026 documentation snapshot as current platform truth.

## Why this refresh was required

The previous hub still carried July-era route/API counts, manually maintained roadmap metrics, and a CRM-centric information architecture. Since then SETU Flow has materially expanded across Packaging, supplier sourcing, Trade Events, Growth, inbound integrations, Academy, entitlement-aware client administration, and Mission Control.

## New documentation information architecture

1. Get Started
2. Platform Architecture
3. CRM Workflows
4. Supplier & Sourcing
5. Packaging Workspace
6. Trade Events
7. Growth & Acquisition
8. Setu Guru AI
9. Operations
10. Integrations & API
11. Administration
12. SETU Internal
13. Academy & Operator Guides
14. Reference

## Packaging Workspace

Packaging is now documented as a dedicated vertical operating layer with these topics:

- Packaging Overview
- Packaging Lead Capture
- Packaging Products & KLD
- Packaging Pricing v4
- Packaging Quote Workflow
- Design & Operations
- Packaging Intelligence
- Packaging Admin & Security

The documentation reflects the current v4 architecture: Packaging Products owns products/sizes/options/KLDs; Pricing Components owns reusable materials/processes/finishes/charges; Pricing Builder owns recipe configuration and authoritative server preview; Sales never receives protected Cost Master/Charge Master/COGS/margin internals; quote versions freeze pricing and KLD evidence.

## Other major documentation updates

### CRM and sourcing

- Buyer commercial flow retained.
- Inbound provider flow added as a first-class CRM entry path.
- Supplier journey documented separately: capture → verification → capability → compliance → RFQ → response review → comparison/approval.

### Trade Events

- Offline capture documented.
- Packaging-specific optional capture fields documented.
- Attribution and post-show follow-up retained as core behavior.

### Growth & Acquisition

- Growth Center and prospect enrichment.
- Growth Lead Manager.
- Mail Outreach and first-inquiry/follow-up state.
- SEO Command Center, Search Console telemetry, ranking progress, SEO bot review, PR generation and controlled publishing.
- LinkedIn distribution readiness.

### Integrations

- Integration Hub is documented as organization-specific.
- Interakt is documented as an inbound Sales Desk workflow, not only a WhatsApp link.
- IndiaMART organization credential and pull-v2 preparation documented.
- Scoped Setu Flow API key generation, hashing and revocation documented.

### Administration and security

- Module/vertical entitlements now documented as affecting application shell visibility and route availability.
- Provider credentials and protected pricing data are explicitly separated from user-visible integration/pricing metadata.
- Service-role/server-authoritative operations documented as security boundaries.

### Academy

- Core Academy and Packaging Academy are first-class documentation topics.
- Host/isolation distinction documented.
- Operator evidence/test mode/issue logging documented.

### Mission Control

SMC is documented around current functional ownership:

- Overview
- Delivery
- Clients
- Growth
- Intelligence
- Config

Growth includes Lead Manager, Mail Outreach and SEO operations.

## Documentation freshness policy

The refresh intentionally removes reliance on stale hard-coded route/API totals and manually maintained roadmap counters.

Going forward:

- Current `main` is authoritative if implementation and documentation conflict.
- Route/API totals should be generated during build/test.
- Roadmap status should come from the live roadmap source.
- Fast-moving integration, feature-flag and operational metrics should not be frozen into static prose.
- `test:docs-drift` should be expanded to validate critical module/route/documentation contracts.

## Rollback

The previous runtime remains at:

`public/internal/setuflow-docs-workspace.js`

The refreshed page points to:

`public/internal/setuflow-docs-workspace-v20260827.js`

Rollback can therefore be performed by restoring the old script reference in `public/internal/setuflow-docs.html` while preserving this refresh for comparison.
