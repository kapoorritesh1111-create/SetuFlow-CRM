import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
async function getStats() {
  const supabase = await createClient();
  const [fbRes, cfgRes] = await Promise.all([
    supabase.from('setu_guru_feedback').select('id', { count: 'exact', head: true }),
    supabase.from('workspace_guru_settings').select('id', { count: 'exact', head: true }),
  ]);
  return { feedback: fbRes.count ?? 0, configs: cfgRes.count ?? 0 };
}
export default async function SmcGuruPage() {
  const s = await getStats();
  return (<>
    <div className="smc-ph"><div><div className="bc">Intelligence</div><h1>Setu Guru Ops</h1></div></div>
    <div className="smc-kr">
      <div className="smc-kp"><div className="v">{s.feedback}</div><div className="l">Feedback</div></div>
      <div className="smc-kp teal"><div className="v">4.2</div><div className="l">Avg Rating</div></div>
      <div className="smc-kp"><div className="v">{s.configs}</div><div className="l">Org Configs</div></div>
      <div className="smc-kp red"><div className="v">1</div><div className="l">Open Bug</div></div>
    </div>
    <div className="smc-content-page">
      <h2>AI Operations</h2>
      <div className="smc-content-grid">
        <div className="smc-content-card"><h4>Feedback Review</h4><p>{s.feedback} feedback entries across all orgs. Review thumbs-up/down ratings and user comments to improve Guru responses.</p></div>
        <div className="smc-content-card"><h4>Knowledge Base</h4><p>Manage the markdown knowledge files that power Guru answers. Update product docs, workflow guides, and FAQ content.</p></div>
        <div className="smc-content-card"><h4>Telemetry</h4><p>Query performance, response times, token usage. Monitor which question types hit the brain layer vs live research.</p></div>
        <div className="smc-content-card"><h4>Open Bug: org-search-v2</h4><p style={{color:'#ef4444'}}>S24-BUG-214 — workflow retrieval in org-search/route.ts still calls legacy v1 handler. Fix branch exists but not wired.</p></div>
      </div>
    </div>
  </>);
}
