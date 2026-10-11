import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ModuleKey } from '@/lib/modules/module-grants';

/**
 * Verify paid module access in a Server Component/route BEFORE reading gated data.
 * This supplements (never replaces) per-record tenant RLS and role authorization.
 */
export async function requireOrganizationModule(organizationId: string, moduleKey: ModuleKey) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('org_module_grants')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('module_key', moduleKey)
    .maybeSingle();

  if (error || data?.enabled !== true) notFound();
}
