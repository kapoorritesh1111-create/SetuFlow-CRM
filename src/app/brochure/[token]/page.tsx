import { notFound } from 'next/navigation';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function PublicBrochurePage({ params }: { params: { token: string } }) {
  const token = String(params.token ?? '').trim();
  if (!token || token.length < 24) notFound();
  const admin = createAdminSupabaseClient() as any;
  if (!admin) notFound();
  const { data: share } = await admin.from('catalog_brochure_shares')
    .select('id, expires_at, catalog_brochures(id,name,description,is_active, organizations(name))')
    .eq('token', token)
    .maybeSingle();
  const brochure = Array.isArray(share?.catalog_brochures) ? share.catalog_brochures[0] : share?.catalog_brochures;
  const expired = share?.expires_at ? new Date(share.expires_at).getTime() < Date.now() : false;
  if (!share?.id || !brochure?.id || brochure.is_active === false || expired) notFound();
  const organization = Array.isArray(brochure.organizations) ? brochure.organizations[0] : brochure.organizations;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Shared catalog</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div><h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{brochure.name}</h1><p className="mt-1 text-sm font-semibold text-slate-500">Shared by {organization?.name || 'your supplier'}</p></div>
            <a href={`/api/public/brochures/${token}/file`} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">Open PDF</a>
          </div>
          {brochure.description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{brochure.description}</p> : null}
        </header>
        <section className="bg-slate-100 p-3 sm:p-5">
          <iframe title={brochure.name} src={`/api/public/brochures/${token}/file`} className="h-[78vh] min-h-[640px] w-full rounded-2xl border border-slate-200 bg-white" />
        </section>
        <footer className="px-6 py-4 text-center text-[11px] font-medium text-slate-400">Secure brochure link powered by Setu Flow CRM</footer>
      </div>
    </main>
  );
}
