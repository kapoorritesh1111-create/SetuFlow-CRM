import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { updateOrgModuleGrant } from '@/features/admin/server/module-actions';
import { MODULE_DEFINITIONS, getEnabledModuleSet, normalizeModuleKey, type OrgModuleGrant } from '@/lib/modules/module-grants';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

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

function noticeCopy(notice?: string) {
  if (notice === 'module-enabled') return { tone: 'success' as const, title: 'Module enabled', description: 'The module is now visible and accessible for this organization.' };
  if (notice === 'module-disabled') return { tone: 'warning' as const, title: 'Module disabled', description: 'The module is hidden from navigation.' };
  if (notice === 'module-invalid') return { tone: 'danger' as const, title: 'Module not recognized', description: 'The selected module key is not allowed.' };
  if (notice === 'module-save-failed') return { tone: 'danger' as const, title: 'Module setting was not saved', description: 'Check organization admin access and try again.' };
  return null;
}

export default async function AdminModulesPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using module assignment." tone="warning" />;

  const params = await searchParams;
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using module assignment." tone="warning" />;
  if (!organization) return null;

  const supabase = (await createClient()) as unknown as ModuleGrantReadClient;
  const { data, error } = await supabase
    .from('org_module_grants')
    .select('module_key, enabled')
    .eq('organization_id', organization.id);

  if (error) return <StateMessage title="Failed to load module settings" description={error.message} tone="danger" />;

  const grants: OrgModuleGrant[] = (data ?? [])
    .map((row) => {
      const moduleKey = normalizeModuleKey(row.module_key);
      return moduleKey ? { module_key: moduleKey, enabled: row.enabled } : null;
    })
    .filter((row): row is OrgModuleGrant => row !== null);
  const enabledModules = getEnabledModuleSet(grants);
  const notice = noticeCopy(params?.notice);
  const enabledCount = MODULE_DEFINITIONS.filter((moduleDef) => enabledModules.has(moduleDef.key)).length;

  return (
    <AdminSettingsShell active="modules" organizationName={organization.name} missingCount={0} sectionTitle="Module assignment">
      <AdminPageHero
        title="Module Assignment"
        description="Enable or disable product modules per organization. Disabled modules are hidden from shell navigation. Existing organizations default to all modules enabled until a grant row is saved."
        badge={organization.name}
        stats={[
          { label: 'Enabled modules', value: `${enabledCount}/${MODULE_DEFINITIONS.length}`, tone: enabledCount === MODULE_DEFINITIONS.length ? 'success' : 'warning' },
          { label: 'Policy', value: grants.length ? 'Custom' : 'Default all on', tone: grants.length ? 'info' : 'success' },
          { label: 'Navigation', value: 'Filtered', tone: 'success' },
        ]}
      />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {MODULE_DEFINITIONS.map((moduleDef) => {
          const enabled = enabledModules.has(moduleDef.key);
          return (
            <article key={moduleDef.key} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">{moduleDef.key.replace(/_/g, ' ')}</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{moduleDef.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{moduleDef.subtitle}</p>
                </div>
                <span className={enabled ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700' : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800'}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {moduleDef.routes.map((route) => (
                  <span key={route} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{route}</span>
                ))}
              </div>

              <form action={updateOrgModuleGrant} className="mt-5 flex justify-end">
                <input type="hidden" name="module_key" value={moduleDef.key} />
                <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
                <button type="submit" className={enabled ? 'rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100' : 'rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800'}>
                  {enabled ? 'Disable module' : 'Enable module'}
                </button>
              </form>
            </article>
          );
        })}
      </section>
    </AdminSettingsShell>
  );
}
