# Admin Command Center UX pass

This pass converts the existing Admin area into the UX direction from `setu-admin-complete.html` while preserving the live Supabase-backed functions already in the repo.

## Implemented

- Admin shell now uses the prototype IA:
  - Workspace
  - Trade Setup
  - Commerce Rules
  - Governance
  - SETU Flow Internal
- Sticky dark admin chrome added inside Admin.
- Compact horizontal quick-nav added under the org row.
- Left rail uses prototype-style small typography, status dots, merged badges, and internal HQ section.
- Existing functional pages are preserved rather than replaced with static HTML.
- Route aliases added so the prototype routes work:
  - `/admin/catalog` -> existing categories governance function
  - `/admin/catalog-governance` -> existing product governance / import / cleanup function
  - `/admin/pricing` -> existing pricing engine function
  - `/admin/documents` -> existing document templates function
- `/admin` now redirects to `/admin/overview`.
- Admin Home was tightened to match the prototype's command-center density and setup-progress language.

## Intentional mapping

The HTML prototype combines some concepts that the current codebase already implements as separate functional pages. To avoid breaking working functions, this pass maps the UX labels to existing functions:

| Prototype label | Live function used |
|---|---|
| Members & Roles | `/admin/users`, with invitations counted and `/admin/invitations` still reachable |
| Pipelines & Stages | `/admin/pipelines`, with `/admin/stages` still supported |
| Catalog | `/admin/categories` through `/admin/catalog` alias |
| Catalog Governance | `/admin/product-management` through `/admin/catalog-governance` alias |
| Pricing Engine | `/admin/pricing-engine` through `/admin/pricing` alias |
| Document Templates | `/admin/document-templates` through `/admin/documents` alias |

## Not implemented in this pass

- No live merge/push/deploy was performed.
- No database schema changes were made.
- No functions were removed.
- Client-org switching remains based on the authenticated org context; the prototype's static Avanti switch is not copied as mock data.

## Validation note

`npm run lint` was attempted in the sandbox. It cannot complete because `node_modules` is not installed and the user instruction says not to run `npm ci` here. The error set is dependency/type-resolution related (`next`, `react`, `@types/node`, Supabase modules), not a confirmed application logic failure from this pass.
