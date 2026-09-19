# C2 Lead Intake Retention Closeout

Date: 2026-09-19

C2 is complete for the first webhook-retention scope.

## Final production result

- Original archived cohort: 4,951 processed/no-error webhook events older than 30 days.
- Archive reconciliation before purge: 4,951 / 4,951 matched.
- Source purge executed in bounded batches: 500, 1,000, 1,500, and 1,951 rows.
- Remaining archived-and-eligible source rows: 0.
- Protected unresolved/unprocessed source rows: 13 and unchanged.
- Source webhook rows after cleanup: 15,488.
- Archive rows retained: 4,951.
- Runtime error checks after purge batches: no new runtime errors.
- No staging, message, workflow-answer, canonical Lead, Pricing, Quote, Order, or Mail rows were deleted.

## Important storage note

The database file does not immediately shrink after deletes. The archive copy adds physical storage, and deleted source pages remain available for reuse until normal vacuum behavior advances. Do not use VACUUM FULL as routine cleanup.

## Ongoing retention rule

- Processed/no-error raw webhook events: archive after 30 days before any purge.
- Unprocessed or errored webhook events: retain until resolved.
- Staging rows: no automatic purge due to cascade dependencies.
- Messages and workflow answers: outside this C2 purge scope.
