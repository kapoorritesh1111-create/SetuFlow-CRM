# TypeFix v8

Patched the quote wizard TypeScript errors surfaced after the pipeline type fixes.

## Changes
- Relaxed `DraftQuoteLine` source pricing fields to optional because template-generated quote lines do not always have product catalog source-price metadata.
- Added explicit source pricing defaults to pricing-template draft-line mapping.
- Preserved required runtime defaults in product/catalog hydrated quote lines.

## Validation
- Static review of quote draft-line creation paths completed.
- Local dependency install/typecheck did not complete in this execution environment, so Vercel remains the final build validator.
