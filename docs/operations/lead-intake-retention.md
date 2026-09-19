# Lead Intake Retention Policy

Status: C2 archive stage active. No production source rows have been deleted.

## Current policy

| Data | Hot retention | Archive | Purge eligibility |
| --- | --- | --- | --- |
| Processed webhook events with no processing error | 30 days | Yes | Only after archive reconciliation succeeds |
| Unprocessed or failed webhook events | Indefinite until resolved | No automatic archive/purge | Never automatic |
| Intake messages | Minimum 12 months | Not yet | Not in C2 purge scope |
| Workflow answers | Minimum 12 months | Not yet | Not in C2 purge scope |
| Staging rows | Operational | Not yet | No automatic purge |

## Safety rules

- Do not purge `lead_intake_staging` automatically. It is referenced by messages, workflow answers, inquiries, CRM call logs, brochure shares, and WhatsApp attachment shares; several relationships cascade on delete.
- Archive and purge are separate operations.
- Archive reconciliation must prove: eligible source count = archive count = matched IDs, with zero missing IDs.
- Unprocessed or errored webhook events are excluded.
- Any future purge must be batched and separately approved.
- Pricing v4/v5, Mail, Quotes, Orders, and canonical Leads are outside this retention batch.

## C2 production baseline (2026-09-19)

- Total webhook events: 20,439
- 30-day processed/no-error archive cohort: 4,951
- Archived rows: 4,951
- Missing archive IDs: 0
- Unexpected archive IDs: 0
- Protected unresolved/unprocessed webhook rows: 13
- Archived JSON payload: approximately 9.4 MB
- Source table remains unchanged after archive copy.

## Next gate before purge

1. Re-run reconciliation.
2. Confirm no application function depends on old raw webhook rows for active operational views.
3. Establish purge batch size and rollback procedure.
4. Purge a small verified cohort only after explicit approval.
5. Re-check provider ingestion, inbound lead views, and database advisors.
