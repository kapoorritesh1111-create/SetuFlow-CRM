import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export default async function DocsShareView({ params }: { params: { token: string } }) {
  const svc = createServiceRoleClient() as any;
  const { data: link } = await svc.from('docs_share_links').select('*').eq('token', params.token).maybeSingle();
  const invalid = !link || link.revoked_at || (link.expires_at && new Date(link.expires_at).getTime() < Date.now());

  if (invalid) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: "'DM Sans',system-ui,sans-serif", background: '#f1f5f9', color: '#1e293b' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, maxWidth: 440, textAlign: 'center' }}>
          <h2 style={{ fontSize: 18 }}>This documentation link isn&rsquo;t available</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>It may have expired or been revoked. Please ask your SETU Flow contact for a new link.</p>
        </div>
      </div>
    );
  }

  // log the view (server-side, service role) — no anon key exposure
  const h = await headers();
  await svc.from('docs_share_views').insert({ organization_id: link.organization_id, token: params.token, user_agent: h.get('user-agent') ?? null, referrer: h.get('referer') ?? null });
  await svc.from('docs_share_links').update({ use_count: (link.use_count ?? 0) + 1, last_viewed_at: new Date().toISOString() }).eq('id', link.id);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <iframe src="/internal/setuflow-docs.html" style={{ width: '100%', height: '100%', border: 'none' }} title="SETU Flow Documentation" />
    </div>
  );
}
