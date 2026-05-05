# Current Release Status

## Status

Setu Flow CRM is in an upgraded baseline state with public client onboarding, Setu-internal SaaS workspace provisioning, trade-events command center, mobile scan improvements, current DCC/reference HTML handoffs, catalog import/export, product pricing calculator workflows, and cleaned Admin reference pages.

## Current readiness

| Area | Status | Notes |
|---|---|---|
| Public onboarding | Ready | `/onboarding` is public and posts to the public onboarding API. |
| Admin onboarding | Ready | `/admin/client-onboarding` is Setu-internal only and supports SaaS provisioning plus Mailtrap admin email retry. |
| Workspace URL rule | Ready | New workspace intent uses `companyname.setuflowcrm.com`. |
| Default setup | Ready | All countries are seeded for every org; markets, pipelines, pipeline stages, next steps, roles, and pricing starter settings are provisioned. |
| Product categories | Governance-ready | Admin Categories now focuses on taxonomy health, hierarchy, active state, import readiness, and category help. Product editing stays in Products. |
| Pricing rules | Product-level calculator added | Quote pricing rules remain the commercial SSOT; product records now have additive calculator fields for EXW/FOB/CIF/DDP/Distributor/Retail. V17.3 adds clearer help copy for defaults, category rules, and product overrides. |
| DCC/reference HTML | Ready | Current internal and reference HTMLs are updated. |
| Docs | Ready | Active docs are consolidated and current. |
| Regression tests | Partially verified in sandbox | Typecheck could not complete because dependencies are not installed in this sandbox and `npm ci` was intentionally not run. |

## Test result

```text
npm run typecheck
Blocked: dependencies are not installed in the sandbox, and npm ci was intentionally not run per upgrade constraint.
```

## V17.3 Admin Reference Pages cleanup

Status: implementation pass complete in repo package; Vercel build still needs to run in the deployment environment with dependencies installed.

Highlights:
- Admin Product Management is now a governance page, not a duplicated Products table.
- Product Management explanations moved into a Help drawer covering page purpose, Products-vs-Admin responsibility, pricing rules, calculator behavior, and margin defaults.
- Admin Categories now uses compact metrics, taxonomy workbench tabs, selected category editing, parent-category support, and a Help drawer.
- Pricing Calculator help now explains the EXW → FOB → CIF → DDP → Distributor → Retail chain, markup vs margin, and organization/category/product default priority.
- Parent category create/update support added to admin category actions.

## V17.2 Product UX + Pricing Workflow

Status: implementation pass complete in repo package; Vercel build still needs to run in the deployment environment with dependencies installed.

Highlights:
- Product Management page reduced to operational copy, compact metrics, and help drawer content.
- Pricing Calculator is now available from Products & Pricing, Product Detail pricing, and Add Product.
- Product-specific calculator snapshots save to product-level pricing fields.
- Client Onboarding now exposes the import/export wizard for setup flows.
- Legacy product_prices embedded join removed from the main products query to avoid ambiguous `product_variant_id` errors.
