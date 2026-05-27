import { readFileSync } from 'node:fs';

const page = readFileSync('src/app/(app)/admin/client-management/page.tsx', 'utf8');
const actions = readFileSync('src/features/client-management/server/actions.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260527020000_sf19_client_entitlements.sql', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(page.includes('createAdminSupabaseClient'), 'client management page should use admin fallback for internal HQ reads');
assert(page.includes('organization_members') && page.includes('organization_invitations'), 'client management should read live users and pending invites');
assert(page.includes('activeUserCount'), 'client management should calculate active user counts');
assert(page.includes('clientHref(request)'), 'client cards should preserve selected client navigation');
assert(page.includes('Share intake form'), 'client management should show intake form link');
assert(page.includes('Countries') && page.includes('Website') && page.includes('Intake link'), 'onboarding required fields should be visible');
assert(actions.includes('return_client') && actions.includes('URLSearchParams'), 'actions should preserve selected client after save');
assert(migration.includes('client_entitlement_profiles_manage_admin_or_platform'), 'entitlement RLS should allow platform management');
assert(migration.includes('public.is_setu_platform_admin()'), 'migration should include platform admin RLS checks');
