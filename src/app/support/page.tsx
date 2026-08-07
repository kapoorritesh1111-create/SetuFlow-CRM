import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { switchSupportOrganization } from '@/features/support/server/actions';

export const dynamic = 'force-dynamic';

type SupportOrganization = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  demo_mode: boolean | null;
  provisioning_status: string | null;
};

function noticeCopy(notice?: string) {
  if (notice === 'access-missing') return 'Support access is not provisioned for that organization yet.';
  if (notice === 'service-role-missing') return 'Support organization lookup is temporarily unavailable.';
  if (notice === 'organization-required') return 'Choose an organization to continue.';
  return null;
}

export default async function SupportOrganizationPicker({ searchParams }: { searchParams?: { notice?: string } }) {
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
            <p className="mt-2 max-w-2xl text-sm text-slate-300">You are signed in as {user.email}. Select the client workspace you need to support.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">
            {organizations.length} organization{organizations.length === 1 ? '' : 's'} available
          </div>
        </div>

        {notice ? <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">{notice}</div> : null}

        <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400" htmlFor="support-org-search">Search organizations</label>
          <input id="support-org-search" type="search" placeholder="Search by organization name" className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400" onInput={undefined} />
          <p className="mt-2 text-xs text-slate-500">Use your browser find command for instant filtering until the client-side search enhancement lands.</p>
        </div>

        {!organizations.length ? (
          <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6 text-amber-100">No support organizations are provisioned for this account.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {organizations.map((organization) => (
              <form key={organization.id} action={switchSupportOrganization} className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-teal-400/40 hover:bg-white/[0.07]">
                <input type="hidden" name="organization_id" value={organization.id} />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black text-white">{organization.name}</h2>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">/{organization.slug}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-300">Owner support</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                  <span className="rounded-full bg-white/5 px-2.5 py-1">{organization.demo_mode ? 'Demo' : 'Client'}</span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1">{organization.provisioning_status ?? 'Workspace'}</span>
                  {organization.website ? <span className="max-w-[15rem] truncate rounded-full bg-white/5 px-2.5 py-1">{organization.website}</span> : null}
                </div>
                <button type="submit" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-teal-400 px-4 text-sm font-black text-slate-950 transition hover:bg-teal-300">Enter organization</button>
              </form>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
