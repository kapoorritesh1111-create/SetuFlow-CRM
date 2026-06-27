insert into public.smc_feature_flags (flag_key, name, description, enabled, rollout_percentage)
values
  ('apparel_provisioning_enabled', 'Apparel provisioning enabled', 'Enables Apparel & Textiles org setup and provisioning pack.', true, 100),
  ('apparel_seed_generator_enabled', 'Apparel seed generator enabled', 'Enables Sprint 39 apparel demo seed packs.', true, 100),
  ('apparel_dynamic_fields_enabled', 'Apparel dynamic fields enabled', 'Enables subtype, channel, and capability driven metadata fields.', true, 100),
  ('apparel_guru_context_enabled', 'Apparel Guru context enabled', 'Injects apparel profile context into Setu Guru.', true, 100),
  ('apparel_capability_modules_enabled', 'Apparel capability modules enabled', 'Enables sample, private label, personalization, and export documentation modules.', true, 100)
on conflict (flag_key) do update set
  name = excluded.name,
  description = excluded.description,
  enabled = excluded.enabled,
  rollout_percentage = excluded.rollout_percentage,
  updated_at = now();
