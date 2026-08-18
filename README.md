# Setu Flow CRM

Setu Flow is a trade-focused CRM and operating workspace for buyer/supplier relationship management, quotations, orders, task follow-up, trade-event capture, documents, compliance, and Setu Guru assistance.

## Sprint 51 Trade Event Command Center

The current Trade Event enhancement program is being developed in PR #78 and remains unmerged until user approval.

### Mobile event workflow

- Mobile Event Mode is optimized for booth-floor lead capture rather than a compressed desktop dashboard.
- Trade Event **Capture Lead** reuses the canonical Quick Lead workflow; event ID/name and Buyer/Supplier context are carried into the same CRM save path.
- Mobile navigation uses **Home / Leads / Quotes / Orders / More**. **More** exposes **Tasks** and **Events** so a salesperson can reliably return to the Trade Event Command Center after capture.
- When the device is offline, Event Mode routes capture actions to a lightweight offline form. Users can also explicitly choose **Low signal? Save offline** when connectivity is unreliable.
- Offline captures are temporarily stored on-device with a unique client capture ID, automatically retried after reconnect, and removed only after Setu Flow confirms the server save.
- Offline storage is bounded to 150 captures and seven days. If browser storage is unavailable, the UI must report that the lead was not safely persisted.
- Offline sync uses the same event-aware lead action as normal capture so contact/company dedupe, repeat-event interaction history, event attribution, and follow-up creation stay consistent.
- Database-level retry race protection is prepared in `supabase/migrations/20260818101500_s51_event_offline_capture_idempotency.sql`; this migration is code-only until the approved database rollout.

### Trade Event release boundary

The canonical event catalog, recommendation feedback, event attachment schema/storage, and offline idempotency migrations are staged in the PR but are **not applied to production** as part of the PR-first implementation pass. Production schema rollout, generated DB type refresh, PackPlus reconciliation, attachment runtime verification, and final user acceptance remain release steps.

## Development

Use the repository scripts and environment configuration defined in `package.json` and `.env.production.example`. Do not bypass workspace/auth boundaries or organization scoping when adding CRM data paths.

## Product documentation

Detailed product, mobile, training, Setu Guru, and workflow documentation lives under `docs/`. Sprint implementation evidence is tracked in Setu Mission Control / `public.sprint_issues`.
