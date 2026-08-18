# Setu Flow CRM Changes

## 2026-08-18 — Sprint 51 Trade Event mobile capture continuation

- Fixed Trade Event mobile Capture so one canonical Quick Lead window owns the interaction; the hidden responsive drawer can no longer reopen after close.
- Mobile bottom navigation now keeps a right-most More entry with Tasks and Events, providing a reliable return path to the Trade Event Command Center.
- Added an offline/low-signal Event Capture fallback for trade-show floors. Buyer, supplier, scan, dictate and Capture actions route to the local fallback when the browser is offline, and Event Mode also exposes an explicit “Low signal? Save offline” action.
- Offline captures receive a client capture ID, persist temporarily on the device, automatically retry on reconnect, expose pending/failed/retry state, and use the canonical event-aware lead save path so CRM dedupe, source attribution and follow-up work remain intact.
- Offline queue retention is bounded to 150 captures and seven days. If the browser cannot persist the capture, Setu Flow reports that condition instead of claiming the lead is safely saved.
- Added code-only migration `20260818101500_s51_event_offline_capture_idempotency.sql` for database-level retry race protection. It has not been applied to production.
- Existing canonical event catalog, recommendation feedback and event attachment migrations remain code-only pending the approved database rollout.

## Current release boundary

PR #78 remains Draft and unmerged. Production schema/data have not been changed by this continuation pass. Mobile single-window capture and More → Events navigation were user-accepted on 2026-08-18; offline queue behavior remains awaiting phone acceptance.

---

## Earlier changes

See Git history and Sprint/SMC issue evidence for prior Setu Flow releases and implementation detail.
