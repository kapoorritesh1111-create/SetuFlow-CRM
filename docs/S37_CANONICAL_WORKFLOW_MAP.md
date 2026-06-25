# Sprint 37 Canonical Workflow Map

Status: implementation source of truth for the 10 approved UX images.

## Canonical Route Path

```text
/leads
  -> /leads/[leadId]
  -> /leads/[leadId]/quote?quoteId=[quoteId]&step=1..5
  -> /orders?quoteId=[quoteId]
```

## Canonical Screens

| Screen | Route | Status | Purpose |
|---|---|---|---|
| Screen 1 - Leads Workspace | `/leads` | Canonical | Main lead queue, filters, quick actions, Setu Guru insights. |
| Screen 2 - Lead Detail / Follow-up | `/leads/[leadId]#follow-up` | Canonical | Follow-up scheduling, overdue state, history, next action. |
| Screen 3 - Lead Detail / Qualification & Mapping | `/leads/[leadId]#qualification`, `#mapping` | Canonical | Qualification, product mapping, market mapping, commercial readiness. |
| Screen 4 - Lead Detail / Quote Actions | `/leads/[leadId]` quote section | Canonical | Create Quote, Open Current Quote, View Locked Quote, Create New Quote. |
| Screen 5 - Quote Builder Product | `/leads/[leadId]/quote?quoteId=&step=1` | Canonical | Add/edit quote products. |
| Screen 6 - Quote Builder Pricing | `/leads/[leadId]/quote?quoteId=&step=2` | Canonical | Pricing, basis, margin, freight, approval warnings. |
| Screen 7 - Quote Builder Terms | `/leads/[leadId]/quote?quoteId=&step=3` | Canonical | Incoterms, payment, validity, packaging, notes. |
| Screen 8 - Quote Builder Review | `/leads/[leadId]/quote?quoteId=&step=4` | Canonical | Review checklist and quote preview. |
| Screen 9 - Quote Builder Send Gate | `/leads/[leadId]/quote?quoteId=&step=5` | Canonical | Final blockers, approvals, PDF preview, send quote. |
| Screen 10 - Locked Quote / New Quote | `/leads/[leadId]/quote?quoteId=[lockedQuoteId]` | Canonical | Accepted quote preservation and fresh new quote path. |

## Hard Rules

1. `/leads` remains the main full workspace.
2. `/leads/[leadId]` is the only Lead Detail command center.
3. `/leads/[leadId]/quote` is the only active quote builder route.
4. Active quote users must not be routed to `/leads?leadId=&view=quote`.
5. Locked quotes are read-only and preserved.
6. New quote from locked quote must use a fresh idempotency key via `app_create_lead_quote_draft_tx`.
7. Parent quote status/version pointers must remain DB-derived.

## Implementation Notes

- Canonical Lead Detail component: `src/features/leads/canonical/CanonicalLeadDetail.tsx`.
- Canonical Quote Builder component: `src/features/quotes/canonical/CanonicalQuoteBuilder.tsx`.
- Lead detail route is now a thin server wrapper that loads data and renders the canonical page.
- Quote route is now a thin server wrapper that loads data and renders the canonical builder.
