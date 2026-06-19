import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

// Public, token-gated entry to the Documentation Hub. Validates the tracked DB
// link server-side (revoked / expired), logs the view, then hands off to the
// proven static shared-mode docs page — the same experience as a Share Doc link,
// but tracked and revocable from Mission Control.
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

  // log the view (server-side, service role) — no anon-key exposure
  const h = await headers();
  await svc.from('docs_share_views').insert({ organization_id: link.organization_id, token: params.token, user_agent: h.get('user-agent') ?? null, referrer: h.get('referer') ?? null });
  await svc.from('docs_share_links').update({ use_count: (link.use_count ?? 0) + 1, last_viewed_at: new Date().toISOString() }).eq('id', link.id);

  // Build the shared-mode payload the static docs page understands: { recipient, expiry, issued }
  const expiry = link.expires_at ? new Date(link.expires_at).getTime() : Date.now() + TEN_YEARS_MS;
  const issued = link.created_at ? new Date(link.created_at).getTime() : Date.now();
  const payload = { recipient: link.label || 'External reviewer', expiry, issued };
  const shareToken = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');

  redirect(`/internal/setuflow-docs.html?share_token=${encodeURIComponent(shareToken)}`);
}
