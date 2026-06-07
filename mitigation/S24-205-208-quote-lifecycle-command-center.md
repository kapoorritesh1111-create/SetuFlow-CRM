# Sprint 24 S24-205 through S24-208 mitigation

This mitigation documents the additive live Supabase changes and repo fallback for the Quote Lifecycle Command Center enhancements.

## Live DB additions

- `public.quotes.archived_at`
- `public.quotes.archive_reason`
- `public.quotes.lifecycle_outcome`
- `public.quotes.follow_up_at`
- `public.quotes.last_customer_response_at`
- `public.quote_lifecycle_events`

All changes are additive. Existing quote history is not destructively mutated. Current sent/accepted/rejected/expired records receive lifecycle classification metadata only.

## Product rules implemented in repo

- Customer-grouped quote worklist replaces quote-row-first mental model.
- Default quote view hides expired/rejected records from active work and exposes them under Archive.
- Sent quotes expose explicit outcome buttons: accepted, rejected, revision requested, no response, expired.
- Accepted quotes route execution to Orders; quote remains locked/read-only context.
- Accepted zero-line quotes are flagged as data-risk and blocked from normal order-handoff hierarchy.
- Revision-requested outcome keeps sent quote locked and logs lifecycle intent for governed revision.
- Setu Guru guidance appears in the selected customer quote story and explains the next lifecycle step.

## Rollback

The repo change can be reverted independently. The live DB additions are additive and can remain without affecting older code. If rollback is required, hide the new route UI and keep `quote_lifecycle_events` as harmless audit data.
