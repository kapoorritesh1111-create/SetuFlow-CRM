# Current Release Status

## Status

Setu Flow CRM is in an upgraded baseline state with public client onboarding, Setu-internal SaaS workspace provisioning, trade-events command center, mobile scan improvements, current DCC/reference HTML handoffs, and the first catalog import/export plus pricing calculator pass.

## Current readiness

| Area | Status | Notes |
|---|---|---|
| Public onboarding | Ready | `/onboarding` is public and posts to the public onboarding API. |
| Admin onboarding | Ready | `/admin/client-onboarding` is Setu-internal only and supports SaaS provisioning plus Mailtrap admin email retry. |
| Workspace URL rule | Ready | New workspace intent uses `companyname.setuflowcrm.com`. |
| Default setup | Ready | All countries are seeded for every org; markets, pipelines, pipeline stages, next steps, roles, and pricing starter settings are provisioned. |
| Product categories | Import-ready | Client can create categories manually or via validated CSV import from the Products workspace. |
| Pricing rules | Product-level calculator added | Quote pricing rules remain the commercial SSOT; product records now have additive calculator fields for EXW/FOB/CIF/DDP/Distributor/Retail. |
| DCC/reference HTML | Ready | Current internal and reference HTMLs are updated. |
| Docs | Ready | Active docs are consolidated and current. |
| Regression tests | Partially verified in sandbox | Typecheck could not complete because dependencies are not installed in this sandbox and `npm ci` was intentionally not run. |

## Test result

```text
npm run typecheck
Blocked: dependencies are not installed in the sandbox, and npm ci was intentionally not run per upgrade constraint.
```

## V17.2 Product UX + Pricing Workflow

Status: implementation pass complete in repo package; Vercel build still needs to run in the deployment environment with dependencies installed.

Highlights:
- Product Management page reduced to operational copy, compact metrics, and help drawer content.
- Pricing Calculator is now available from Products & Pricing, Product Detail pricing, and Add Product.
- Product-specific calculator snapshots save to product-level pricing fields.
- Client Onboarding now exposes the import/export wizard for setup flows.
- Legacy product_prices embedded join removed from the main products query to avoid ambiguous `product_variant_id` errors.
