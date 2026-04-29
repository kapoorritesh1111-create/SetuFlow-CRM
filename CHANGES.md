# Trade Show PR 1 — Pending proof

DCC: Trade Show 25→48%. TS-1 Pending proof.

## Files touched

- `src/lib/routes/manifest.json`
- `src/components/layout/shell/route-meta.ts`
- `src/app/(app)/trade-events/page.tsx`
- `src/app/(app)/dashboard/_lib/render-dashboard-page.tsx`

## Changes

- Promoted Trade events into primary navigation and the primary operating flow near Quote.
- Replaced demoted trade-event copy with investor-demo-ready show-floor capture language.
- Restructured trade event cards for mobile show-floor use:
  - large leads-captured badge at the top
  - event name as hero text
  - compact date range under event name
  - prominent full-width mobile `Capture lead` action
  - secondary `Share capture link` action with clipboard copy and two-second `Copied!` state
- Added a dashboard live trade-event strip when at least one event is active today:
  - `Live at [Event Name]`
  - today lead count badge
  - `Capture lead` deep link
  - `+N more` indicator for additional active events
- Preserved existing trade-event entry list and conversion actions.

## Verification

```bash
node -e "JSON.parse(require('fs').readFileSync('src/lib/routes/manifest.json','utf8')); console.log('manifest json ok')"
# manifest json ok

grep -n "Capture lead\|capture.*lead\|Share capture" src/app/(app)/trade-events/page.tsx
# >= 1 match

grep -n "demoted\|Demoted\|intentionally not promoted" src/components/layout/shell/route-meta.ts
# 0 matches

grep -n "trade.event\|tradeEvent" src/lib/routes/manifest.json | grep -i "primary\|core\|main"
# >= 1 match
```

## Notes

- No npm commands were run.
- Pending proof: no browser/runtime verification was performed in this environment.

---

# Trade Show PR 2 — Pending proof

DCC: Trade Show 48→65%. TS-2 Pending proof.

## Files touched

- `src/app/(app)/leads/page.tsx`
- `src/features/leads/types/workspace.ts`
- `src/features/leads/components/leads-workspace.tsx`
- `src/features/leads/components/lead-drawer.tsx`
- `src/features/leads/components/LeadDrawerFooter.tsx`
- `src/app/(app)/contact-exchange/scan/page.tsx`
- `src/components/contact-exchange/contact-intake-review.tsx`
- `src/features/leads/server/contact-scan-actions.ts`

## Changes

- Added `initialFastField` detection on `/leads` only when both `quickLead=1` and `eventId` are present.
- Opened the lead drawer immediately in quick mode for event fast-field capture while preserving the existing `trade_event_id` prefill.
- Added a fast-field drawer state for trade-event quick lead links:
  - company name
  - contact name
  - product interest dropdown
  - `Add more details` toggle for the rest of the existing quick drawer fields
  - `Save contact` submit label
- Preserved the existing regular lead drawer for non-event entry points.
- Passed `eventId` through `/contact-exchange/scan` into the scan review client component.
- Included `trade_event_id` in the contact-scan lead creation payload when an event is present.

## Verification

```bash
grep -n "initialFastField\|fast.field\|fastField" src/features/leads/types/workspace.ts
# >= 1 match

grep -n "initialFastField\|fast.field\|fastField" src/features/leads/components/leads-workspace.tsx
# >= 2 matches

grep -n "eventId" src/app/(app)/contact-exchange/scan/page.tsx
# >= 1 match
```

## Notes

- No npm commands were run.
- Pending proof: no browser/runtime verification was performed in this environment.
