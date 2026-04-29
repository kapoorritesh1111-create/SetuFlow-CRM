# Trade Show PR 4 — Pending proof

## Status
- TS-4 Pending proof
- DCC Trade Show score: 82% -> 92%
- No npm commands were run.

## Changes
- Added a collapsed-by-default `Event performance` / ROI report panel to every trade event card.
- Reused the TS-3 event lead analytics map to show leads captured, converted CRM leads, conversion rate, quotes raised, pipeline value, and active orders placed.
- Added previous-event comparison for entries and pipeline value based on the immediately preceding event by `starts_on` date.
- Added the future ROI note: `Event cost entry coming soon — ROI % will appear once cost is recorded.`
- Updated NorthStar/DCC deferred v2 guidance for `V2-1 PR-OFFLINE-CAPTURE` as the post-investor-demo service worker + local queue priority.

## Files touched
- `src/app/(app)/trade-events/page.tsx`
- `public/internal-dcc/index.html`
- `public/reference-html/setuflow-northstar.html`
- `CHANGES.md`

## Verification
```bash
grep -n "ROI\|roi\|Event performance\|event.*performance" src/app/(app)/trade-events/page.tsx
grep -n "Conversion rate\|conversion.*rate\|Orders placed" src/app/(app)/trade-events/page.tsx
```
