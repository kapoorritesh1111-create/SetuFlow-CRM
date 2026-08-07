import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { SupportOrgPicker, type SupportOrganization } from '@/features/support/components/support-org-picker';

export const dynamic = 'force-dynamic';

function noticeCopy(notice?: string) {
  if (notice === 'access-missing') return 'Support access is not provisioned for that organization yet.';
  if (notice === 'service-role-missing') return 'Support organization lookup is temporarily unavailable.';
  if (notice === 'organization-required') return 'Choose an organization to continue.';
  return null;
}

export default async function SupportOrganizationPickerPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect('/login?next=/support');

  const admin = createAdminSupabaseClient();
  if (!admin) redirect('/dashboard');

  const { data: supportUser } = await (admin as any)
    .from('platform_support_users')
    .select('user_id, is_active, access_level')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!supportUser?.user_id) redirect('/dashboard');

  const { data: memberships } = await (admin as any)
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('is_internal_support', true);

  const organizationIds = Array.from(new Set((memberships ?? []).map((row: any) => String(row.organization_id)).filter(Boolean)));
  let organizations: SupportOrganization[] = [];

  if (organizationIds.length > 0) {
    const { data } = await (admin as any)
      .from('organizations')
      .select('id, name, slug, website, demo_mode, provisioning_status')
      .in('id', organizationIds)
      .order('name', { ascending: true });
    organizations = (data ?? []) as SupportOrganization[];
  }

  const notice = noticeCopy(searchParams?.notice);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-300">SETU Support</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Choose an organization</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">You are signed in as {user.email}. Select the workspace you need to support.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">
            {organizations.length} organization{organizations.length === 1 ? '' : 's'} available
          </div>
        </div>

        {notice ? <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">{notice}</div> : null}

        {!organizations.length ? (
          <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6 text-amber-100">No support organizations are provisioned for this account.</div>
        ) : (
          <SupportOrgPicker organizations={organizations} />
        )}
      </div>
    </main>
  );
}
