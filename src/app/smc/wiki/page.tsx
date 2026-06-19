import { createClient } from '@/lib/supabase/server';
import { WikiWorkspace } from './wiki-workspace';

export const dynamic = 'force-dynamic';

export default async function SmcWikiPage() {
  const sb = (await createClient()) as any;
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
      <WikiWorkspace docsLinks={(linksRes.data ?? []) as any[]} viewCounts={viewCounts} />
    </>
  );
}
