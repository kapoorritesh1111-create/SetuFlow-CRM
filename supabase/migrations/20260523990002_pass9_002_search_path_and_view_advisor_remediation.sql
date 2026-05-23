/*
PASS 9 DRAFT ONLY — DO NOT APPLY WITHOUT AUTHORIZATION
Purpose: fixed search_path and SECURITY DEFINER view remediation examples.
Status: Not applied in Pass 9.

Search-path hardening pattern:

alter function public.app_pricing_engine_tx_ready(...) set search_path = public, pg_temp;
alter function public.app_extract_setuflow_meta(...) set search_path = public, pg_temp;
alter function public.app_assert_catalog_price_integrity(...) set search_path = public, pg_temp;
alter function public.app_upsert_lead(...) set search_path = public, pg_temp;
alter function public.org_role(...) set search_path = public, pg_temp;

Before using the pattern above, replace (...) with the exact function identity arguments from pg_get_function_identity_arguments.

SECURITY DEFINER view remediation pattern:

-- Capture existing view first:
-- select pg_get_viewdef('public.active_product_pricing_rules_v'::regclass, true);

-- Preferred direction: recreate as SECURITY INVOKER view or replace with a function that performs explicit DB capability checks.
-- create or replace view public.active_product_pricing_rules_v
-- with (security_invoker = true)
-- as
-- select ...;

Rollback: restore captured pg_get_viewdef output and verify advisor state.
*/
