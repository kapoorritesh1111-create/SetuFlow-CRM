import { createClient } from '@/lib/supabase/server';
import { renderSafeMarkdown } from '@/lib/markdown/safe-md';
import { RunbookForm } from './runbook-form';

export const dynamic = 'force-dynamic';

type Page = {
  id: string; slug: string; title: string; content: string;
  category: string | null; pinned: boolean | null; updated_at: string | null;
};

async function getPages(): Promise<Page[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('smc_wiki_pages').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false });
  return (data ?? []) as Page[];
}

export default async function SmcRunbooksPage() {
  const pages = await getPages();
  return (
    <>
      <div className="smc-ph"><div><div className="bc">Knowledge</div><h1>Runbooks</h1></div>
        <RunbookForm />
      </div>
      <div className="smc-content-page">
        {pages.length === 0 ? (
          <p style={{ color: '#64748b' }}>No runbooks yet. Add deploy, incident-response and onboarding runbooks so the team has a single internal reference.</p>
        ) : (
          <div className="smc-content-grid">
            {pages.map(p => (
              <div key={p.id} className="smc-content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>{p.title}</h4>
                  {p.pinned && <span className="smc-lb" style={{ background: '#eff6ff', color: '#1F487C' }}>Pinned</span>}
                </div>
                {p.category && <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'DM Mono',monospace" }}>{p.category}</p>}
                <div className="smc-md" dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(p.content) }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
