# Sprint 37 Live DB Applied Confirmation

Date: 2026-06-25
Supabase project: sjzfzloggabsmcuxktnl

## Live DB status

The Sprint 37 approval-flow backend functions required by `supabase/migrations/20260625150000_s37_enh_008_quote_approval_flow.sql` are present in live Supabase and validated:

- `public.app_submit_quote_approval_tx`
- `public.app_decide_quote_approval_tx`
- `public.app_quote_version_approval_state`

All three functions are `SECURITY DEFINER`.

## Validation performed

A live validation block was run using the SETU Flow organization and an active org member claim. The test:

1. Created a quote draft using `app_create_lead_quote_draft_tx`.
2. Submitted the quote version for approval using `app_submit_quote_approval_tx`.
3. Confirmed the approval state returned `pending`.
4. Confirmed the quote version moved to `approval_pending`.
5. Confirmed the parent quote status stayed DB-derived as `in_review`.
6. Confirmed duplicate approval submit was idempotent.
7. Approved the request using `app_decide_quote_approval_tx`.
8. Confirmed approval state returned `approved`.
9. Confirmed the quote version remained mutable at `approval_pending`, not immutable `approved`.
10. Deleted the validation quote and confirmed cleanup count was zero.

## Tracker notes

Before this confirmation, live SMC tracker already showed:

- `S37-BUG-007` = In Review
- `S37-ENH-008` = In Review

The remaining open Sprint 37 items are:

- `S37-UX-009`
- `S37-UX-010`
- `S37-UX-011`
- `S37-TEST-012`

