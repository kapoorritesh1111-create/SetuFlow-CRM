# C2 Webhook Purge Canary

Date: 2026-09-19

A first production purge canary was executed only against webhook rows that were already copied and reconciled in `archive.lead_intake_webhook_events`.

## Preconditions verified

- No stored functions reference `lead_intake_webhook_events`.
- No views reference `lead_intake_webhook_events`.
- No triggers exist on `lead_intake_webhook_events`.
- No child foreign keys reference `lead_intake_webhook_events`.
- The only foreign key on the source table is `organization_id -> organizations.id`.
- Eligible rows were processed successfully, had no processing error, were older than 30 days, and already existed in the archive.

## Canary execution

Deleted the oldest 500 eligible source rows.

## Post-check

- Source rows after canary: 19,939
- Archive rows: 4,951
- Protected unresolved/unprocessed rows: 13
- Remaining source rows that are both archived and eligible: 4,451
- Missing archive rows for the original cohort: 0 before purge
- Production runtime errors in the next check window: 0
- No source events arrived in the one-hour observation window, so ingestion continuity still requires a fresh-event confirmation.

## Gate for next purge

Do not purge the remaining 4,451 rows until one of the following occurs:

1. A fresh provider webhook arrives and is persisted successfully after the canary, or
2. An explicit provider-health/integration test confirms ingestion is operating normally.

When that gate passes, continue in bounded batches rather than deleting the full remainder at once.
