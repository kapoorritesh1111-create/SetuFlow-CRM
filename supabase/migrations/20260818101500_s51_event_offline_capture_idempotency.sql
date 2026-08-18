-- S51-EVENT-034
-- Prevent the same queued mobile event capture from being persisted twice if
-- reconnect/retry requests race. Existing scan refs remain untouched; this
-- applies only to the offline:<client_capture_id> namespace.

create unique index if not exists trade_event_entries_offline_capture_idempotency_idx
  on public.trade_event_entries (organization_id, trade_event_id, source_scan_ref)
  where source_scan_ref like 'offline:%';
