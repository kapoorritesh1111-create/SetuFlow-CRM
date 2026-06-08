import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260608044600_s24_trial_190_capability_foundation.sql', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(migration.includes('max_leads integer not null default 0'), 'trial capability should add max_leads with non-trial safe default');
assert(migration.includes('max_quotes integer not null default 0'), 'trial capability should add max_quotes with non-trial safe default');
assert(migration.includes('max_orders integer not null default 0'), 'trial capability should add max_orders with non-trial safe default');
assert(migration.includes('allow_exports boolean not null default true'), 'non-trial orgs should keep exports enabled by default');
assert(migration.includes('guided_mode_enabled boolean not null default false'), 'guided mode should be opt-in');
assert(migration.includes("'export_foods_basic'"), 'trial templates should include export_foods_basic');
assert(migration.includes("'ingredient_trader'"), 'trial templates should include ingredient_trader');
assert(migration.includes("'distributor_importer'"), 'trial templates should include distributor_importer');
assert(migration.includes("'packaging_converter'"), 'trial templates should include packaging_converter for Stark Packmate without hardcoding shared logic');
assert(migration.includes('create or replace function public.is_trial_org'), 'migration should expose is_trial_org helper');
assert(migration.includes('create or replace function public.get_trial_capability'), 'migration should expose get_trial_capability helper');
assert(migration.includes('create or replace function public.create_guided_trial_entitlement'), 'migration should expose guided trial provisioning helper');
assert(migration.includes('max_leads,') && migration.includes('2,'), 'guided trial provisioning should default to a 2-lead limit');
assert(migration.includes('allow_invites') && migration.includes('false'), 'guided trial provisioning should block invites by default');
assert(migration.includes('allow_settings_edit') && migration.includes('false'), 'guided trial provisioning should block settings edits by default');
assert(migration.includes('grant execute on function public.get_trial_capability(uuid) to authenticated, service_role'), 'capability helper should be callable by app users and service role');
assert(migration.includes('grant execute on function public.create_guided_trial_entitlement(uuid, uuid, text, date) to service_role'), 'provisioning helper should be service-role only');
