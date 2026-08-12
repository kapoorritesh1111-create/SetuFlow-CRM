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
    <main className="min-h-screen bg-brand-950 px-4 py-8 text-content-primary sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-hero bg-surface-1 shadow-hero">
        <header className="border-b border-line px-6 py-5 sm:px-8">
          <p className="text-caption font-semibold uppercase text-brand-600">Shared catalog</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-title font-semibold text-content-primary">{brochure.name}</h1>
              <p className="mt-1 text-small font-medium text-content-muted">Shared by {organization?.name || 'your supplier'}</p>
            </div>
            <a href={`/api/public/brochures/${token}/file`} target="_blank" rel="noreferrer" className="rounded-ctl bg-brand-700 px-4 py-2.5 text-small font-semibold text-content-inverse transition hover:bg-brand-800">Open PDF</a>
          </div>
          {brochure.description ? <p className="mt-4 max-w-3xl text-body text-content-secondary">{brochure.description}</p> : null}
        </header>
        <section className="bg-surface-2 p-3 sm:p-5">
          <iframe title={brochure.name} src={`/api/public/brochures/${token}/file`} className="h-[78vh] min-h-[640px] w-full rounded-panel border border-line bg-surface-1" />
        </section>
        <footer className="px-6 py-4 text-center text-caption font-medium text-content-faint">Secure brochure link powered by Setu Flow CRM</footer>
      </div>
    </main>
  );
}
