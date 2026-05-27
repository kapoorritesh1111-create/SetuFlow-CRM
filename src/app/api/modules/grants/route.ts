import { NextResponse } from 'next/server';
import { MODULE_KEYS, normalizeModuleKey, type ModuleKey } from '@/lib/modules/module-grants';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

type ModuleGrantRow = {
  module_key: string;
  enabled: boolean;
};

type ModuleGrantReadClient = {
  from: (table: 'org_module_grants') => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{ data: ModuleGrantRow[] | null; error: { message: string } | null }>;
    };
  };
};

export async function GET() {
  const workspace = await requireWorkspace();
  if (workspace.missingEnv || !workspace.organization) {
    return NextResponse.json({ enabledModules: MODULE_KEYS, grants: [] }, { status: 200 });
  }

  const supabase = (await createClient()) as unknown as ModuleGrantReadClient;
  const { data, error } = await supabase
    .from('org_module_grants')
    .select('module_key, enabled')
    .eq('organization_id', workspace.organization.id);

  if (error) {
    return NextResponse.json({ enabledModules: MODULE_KEYS, grants: [], error: 'module_grants_unavailable' }, { status: 200 });
  }

  const grants = (data ?? [])
    .map((row) => {
      const moduleKey = normalizeModuleKey(row.module_key);
      return moduleKey ? { module_key: moduleKey, enabled: row.enabled } : null;
    })
    .filter((row): row is { module_key: ModuleKey; enabled: boolean } => row !== null);

  const enabledModules = grants.length === 0 ? MODULE_KEYS : grants.filter((grant) => grant.enabled).map((grant) => grant.module_key);

  return NextResponse.json({ enabledModules, grants });
}
