-- S51-PKG-044
-- Normalize v4 routing fields for Stark packaging families that may already
-- exist from v3. The v4 seed intentionally uses ON CONFLICT, so an existing
-- Stand Up Pouches row must be reconciled explicitly instead of inheriting a
-- NULL is_quoteable value from the additive schema change.
--
-- This migration does NOT enable Packaging Pricing v4 routing. All v4
-- families remain non-quoteable until the S51-PKG-051 cutover gates pass.

begin;

update public.packaging_service_families
set product_setup_mode = case slug
      when 'standup-pouches' then 'approved_sizes'
      when 'flat-bottom-pouches' then 'both'
      when 'center-seal-pouches' then 'custom_dimensions'
      when 'three-side-seal-pouches' then 'custom_dimensions'
      when 'labels' then 'both'
      when 'shrink-sleeves' then 'custom_dimensions'
      else product_setup_mode
    end,
    pricing_engine_type = case slug
      when 'standup-pouches' then 'sup_formula'
      when 'center-seal-pouches' then 'matrix_per_frame'
      when 'three-side-seal-pouches' then 'matrix_per_frame'
      when 'flat-bottom-pouches' then 'service_formula'
      when 'labels' then 'service_formula'
      when 'shrink-sleeves' then 'service_formula'
      else pricing_engine_type
    end,
    default_uom = 'pcs',
    is_quoteable = false,
    is_active = true,
    updated_at = now()
where organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
  and slug in (
    'standup-pouches',
    'flat-bottom-pouches',
    'center-seal-pouches',
    'three-side-seal-pouches',
    'labels',
    'shrink-sleeves'
  );

commit;
