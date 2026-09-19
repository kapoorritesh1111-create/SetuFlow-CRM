# C3 Duplicate Index Cleanup — Batch 4

Date: 2026-09-19

Removed:
- public.lead_markets_lead_market_unique_idx
- public.lead_tags_lead_tag_unique_idx
- public.uq_freight_calc_assumptions_profile

Retained equivalents:
- public.lead_markets_lead_market_key (constraint-owned)
- public.uq_lead_tags (constraint-owned)
- public.uq_freight_calc_assumptions_profile_id

Supabase duplicate-index findings:
- Start: 22
- After Batch 1: 19
- After Batch 2: 16
- After Batch 3: 13
- After Batch 4: 10

Runtime errors remained at zero after verification.

Pricing and quote-heavy duplicate groups remain untouched pending dedicated ownership review.
