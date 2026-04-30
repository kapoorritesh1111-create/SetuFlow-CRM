# PR-NS-23 — Trade Show Wedge Proof

Baseline: PR-NS-22 Order Execution Proof Hardening  
Date: 2026-04-30

## Mobile promise boundary

SETU Flow remains **desktop-first** for core CRM, quote, and order execution. The mobile-friendly wedge is trade-event lead capture only. Offline language must stay scoped to trade-event capture queueing and sync; it is not full offline CRM.

## Live verification summary

Live systems checked first:

- Supabase project `sjzfzloggabsmcuxktnl` / SETU Flow CRM: `ACTIVE_HEALTHY`.
- Vercel project `setu-flow-crm`: latest production deployment `dpl_4YXrY6K72P51b19qTVNZi5CR65N7` was `READY`.
- Golden revenue path still intact: Q-00025 / `b6f8111a-3b32-456d-92f0-412c898bf13b` remains `accepted`; contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` remains `draft` with 11 contract lines.

## Trade-event live data proof

| Event | City / country | Live event-linked leads | Live quote handoffs | Live contract handoffs | Intake queue entries |
|---|---:|---:|---:|---:|---:|
| Anuga | Cologne, Germany | 14 | 6 | 0 | 0 |
| Gulfood | Dubai, United Arab Emirates | 13 | 6 | 1 | 0 |
| IndusFood | Noida, India | 14 | 9 | 3 | 0 |

## Honest demo claim

Safe claim:

> The trade-show wedge is demonstrable as event-sourced CRM follow-through: live trade events have linked leads, quote handoffs, and contract handoffs. The capture UI has an intake queue and conversion path, but the live `trade_event_entries` table is currently empty, so offline queue sync should be described as scoped capability, not as already proven production volume.

Avoid saying:

- The mobile trade-show queue has already synced live booth entries.
- The entire CRM works offline.
- Quote or order execution is mobile-native.
- Every event lead came through the new intake queue.

## Code/UI alignment in PR-NS-23

`src/app/(app)/trade-events/page.tsx` now separates:

- Intake queue rows.
- Event-linked leads.
- Quote handoffs.
- Order handoffs.

This prevents seeded event leads from being mislabeled as captured intake queue rows.

## Remaining PR-NS-24+ work

The next proof pass should not expand mobile claims. It should move to integration proof mode: WhatsApp/email proof must distinguish real sends, draft-only sends, and simulated connector proof.
