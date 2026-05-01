# TypeFix v12

Repo-wide pricing-basis consistency pass.

## Why this was needed
The quote module now supports `bulk_chips` as a valid pricing basis, but adjacent trade workflow/catalog helper types still used the older narrower union (`ex_factory | fob | cif`). Vercel reports one TypeScript file at a time, so these surfaced sequentially after each earlier module was fixed.

## Changes
- Extended `TradeWorkflow` quote pricing basis type to include `bulk_chips`.
- Added `Bulk/Kg` display label for trade workflow quote context.
- Extended catalog `PricingBasisOption` to include `bulk_chips`.
- Updated catalog basis normalization to accept `bulk_chips`, `bulk`, `bulk_kg`, `bulk/kg`, and `kg`.
- Updated basis amount selection so `bulk_chips` uses bulk USD/kg when available and safely falls back to FOB.
