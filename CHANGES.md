# Trade Show PR 4 Build Fix — Pending proof

## Status
- TS-4 Pending proof
- Build-fix pass for Vercel type error in dashboard active event strip.
- No npm commands were run.

## Root cause
- The dashboard active trade-event strip queried `trade_events` through the typed Supabase client, but the narrowed result was inferred as `never[]` during Vercel type checking.
- The failure surfaced at `activeEvents.map((event) => event.id)` in `src/app/(app)/dashboard/_lib/render-dashboard-page.tsx`.

## Schema/reference review
- Confirmed `docs/Current Schema.md` includes the trade-show fields used by the feature:
  - `trade_events.id`, `name`, `starts_on`, `ends_on`, `capture_defaults`
  - `trade_event_entries.trade_event_id`, `captured_at`, `status`, `converted_lead_id`
  - `leads.trade_event_id`, `deal_value`, `deal_currency`, `next_follow_up_at`
  - `quotes.lead_id`
  - `contracts.lead_id`, `quote_id`, `status`
- Confirmed the failing dashboard query only needs `id`, `name`, `starts_on`, and `ends_on`, all present in the current schema/reference files.

## Changes
- Added explicit local row types for dashboard active trade events and same-day entry counts.
- Routed the active trade-event strip Supabase calls through typed local result casts so Vercel no longer sees `event` as `never`.
- Preserved the existing active event banner behavior and capture URL shape.
- Kept the TS-4 ROI panel and NorthStar/DCC deferred offline-capture note from the previous package.

## Files touched
- `src/app/(app)/dashboard/_lib/render-dashboard-page.tsx`
- `CHANGES.md`

## Verification
```bash
grep -n "ActiveTradeEventRow\|TradeEventEntryCountRow\|activeEventRows" src/app/(app)/dashboard/_lib/render-dashboard-page.tsx
grep -n "eventIds = activeEvents.map" src/app/(app)/dashboard/_lib/render-dashboard-page.tsx
grep -n "ROI\|roi\|Event performance\|event.*performance" src/app/(app)/trade-events/page.tsx
grep -n "Conversion rate\|conversion.*rate\|Orders placed" src/app/(app)/trade-events/page.tsx
```

## Build note
- A full Next/Vercel build was not run because this handoff requested no npm commands, and the attached repo zip does not include `node_modules`.
