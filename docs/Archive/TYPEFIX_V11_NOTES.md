# TypeFix v11 — Quote pricing basis normalization

## What changed
- Added a canonical server-side `normalizeQuotePricingBasis(...)` helper in `src/features/quotes/server/actions.ts`.
- Converted quote server action `pricingBasis` values from loose form-input strings into the strict `QuotePricingBasis` union before calling `serializeQuoteWorkflow(...)`.
- Updated direct quote create/update helper parameter types to use `QuotePricingBasis` instead of `string`.
- Applied the same normalization in both create and update quote workflow paths.
- Shifted quote pricing-basis defaults from `fob` to `ex_factory` so source catalog pricing starts from the USD catalog basis while buyer-facing quote currency remains separate and editable.

## Why
Vercel failed because TypeScript saw `pricingBasis` as plain `string`, but quote workflow metadata only accepts:

`ex_factory | fob | cif | bulk_chips | null | undefined`

The fix validates and narrows form input before it reaches metadata, quote versioning, and pricing workflows.

## Validation
- Static scan confirms the two quote server workflow paths now use `normalizeQuotePricingBasis(formData.get('pricing_basis'))`.
- Dependency installation/typecheck could not complete in this environment because `npm ci` timed out before installing `node_modules`.
