# TypeFix v10 Quote Module Cleanup

## Scope
- Quote-module cleanup after Vercel exposed follow-up TypeScript errors.
- Catalog pricing source is treated as USD by default.
- New line defaults continue to use catalog MOQ when available.
- Quote builder keeps buyer-facing currency editable while preserving USD source pricing metadata.
- Quote version checkpoint now shows a 7-day validity alert after send and warns users to resend/revise if no buyer action is recorded.
- Quote summary cards now receive the canonical pricing basis instead of relying on an out-of-scope shorthand variable.
- Server-side quote governance now forces approval to pending for non owner/admin/manager users creating quotes, and for non owner/admin/manager users changing line price.

## Validation
- Patched the reported `pricingBasis` shorthand scope error in `QuoteSummaryCards`.
- Added static quote workflow safeguards and notes.
- Full local Next build could not complete in this environment because dependency installation/typechecking timed out.
