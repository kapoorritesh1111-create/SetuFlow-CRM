import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ModuleKey } from '@/lib/modules/module-grants';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { isVerifiedPlatformSupport } from '@/lib/workspace/platform-support';

/**
 * Verify paid module access in a Server Component/route BEFORE reading gated data.
 * This supplements (never replaces) per-record tenant RLS and role authorization.
 */
export async function requireOrganizationModule(organizationId: string, moduleKey: ModuleKey) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership || workspace.organization.id !== organizationId) notFound();
  if (await isVerifiedPlatformSupport(workspace.user.id)) return;
  const supabase = await createClient();
  // The generated Supabase Database type currently omits this table's row shape.
  // Narrow only the query result until the generated types are refreshed.
  const { data, error } = await supabase
    .from('org_module_grants')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('module_key', moduleKey)
    .maybeSingle() as unknown as { data: { enabled: boolean } | null; error: unknown };

  if (error || data?.enabled !== true) notFound();
}
