'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MODULE_KEYS, normalizeModuleKey, type ModuleKey } from '@/lib/modules/module-grants';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

type ModuleSettingsClient = {
  from: (table: 'org_module_grants') => {
    upsert: (
      values: {
        organization_id: string;
        module_key: ModuleKey;
        enabled: boolean;
        granted_by: string | null;
      },
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

function redirectToModules(notice: string): never {
  redirect(`/admin/modules?notice=${encodeURIComponent(notice)}`);
}

export async function updateOrgModuleGrant(formData: FormData): Promise<void> {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.organization || !context.membership) {
    redirectToModules('module-save-failed');
  }

  const moduleKey = normalizeModuleKey(formData.get('module_key'));
  if (!moduleKey || !MODULE_KEYS.includes(moduleKey)) {
    redirectToModules('module-invalid');
  }

  const enabled = formData.get('enabled') === 'true';
  const supabase = (await createClient()) as unknown as ModuleSettingsClient;
  const { error } = await supabase.from('org_module_grants').upsert(
    {
      organization_id: context.organization.id,
      module_key: moduleKey,
      enabled,
      granted_by: context.membership.user_id ?? null,
    },
    { onConflict: 'organization_id,module_key' },
  );

  if (error) {
    redirectToModules('module-save-failed');
  }

  revalidatePath('/admin/modules');
  revalidatePath('/admin/organization');
  revalidatePath('/dashboard');
  redirectToModules(enabled ? 'module-enabled' : 'module-disabled');
}
