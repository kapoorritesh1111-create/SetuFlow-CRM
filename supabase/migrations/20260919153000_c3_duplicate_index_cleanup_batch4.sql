-- C3 Batch 4: remove non-constraint duplicate unique indexes.
drop index if exists public.lead_markets_lead_market_unique_idx;
drop index if exists public.lead_tags_lead_tag_unique_idx;
drop index if exists public.uq_freight_calc_assumptions_profile;
