import { createClient } from '@/lib/supabase/server';
import { DocsSharing } from './docs-sharing';

export const dynamic = 'force-dynamic';

export default async function SmcWikiPage() {
  const supabase = await createClient();
  const sb = supabase as any;
  const [linksRes, viewsRes] = await Promise.all([
    sb.from('docs_share_links').select('id, token, label, audience, expires_at, revoked_at, use_count, last_viewed_at').order('created_at', { ascending: false }),
    sb.from('docs_share_views').select('token'),
  ]);
  const viewCounts: Record<string, number> = {};
  for (const v of (viewsRes.data ?? []) as { token: string }[]) viewCounts[v.token] = (viewCounts[v.token] ?? 0) + 1;

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Knowledge</div><h1>Documentation Hub</h1></div>
        <div className="ha"><a href="/internal/setuflow-docs.html" target="_blank" rel="noopener" className="smc-btn">Open in new tab ↗</a></div>
      </div>
      <DocsSharing links={(linksRes.data ?? []) as any[]} viewCounts={viewCounts} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <iframe src="/internal/setuflow-docs.html" style={{ width: '100%', height: '100%', border: 'none' }} title="Documentation Hub" />
      </div>
    </>
  );
}
