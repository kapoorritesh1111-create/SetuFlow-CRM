import { createClient } from '@/lib/supabase/server';
import { toggleClientFacing } from './actions';
import { ChangelogForm } from './changelog-form';

export const dynamic = 'force-dynamic';

type Entry = {
  id: string; sprint_number: number | null; version: string | null; title: string;
  content: string; category: string; is_client_facing: boolean; published_at: string | null; created_at: string;
};

async function getEntries(): Promise<Entry[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any).from('smc_changelog').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Entry[];
}

export default async function SmcChangelogPage() {
  const entries = await getEntries();
  return (
    <>
      <div className="smc-ph"><div><div className="bc">Product</div><h1>Changelog</h1></div>
        <ChangelogForm />
      </div>
      <div className="smc-content-page">
        {entries.length === 0 ? (
          <p style={{ color: '#64748b' }}>No entries yet. Use New Entry to record what shipped; mark an entry client-facing to publish it as a release note.</p>
        ) : entries.map(e => (
          <div key={e.id} className="smc-content-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>{e.title}</h4>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {e.version && <span className="smc-lb doc">{e.version}</span>}
                {e.sprint_number != null && <span className="smc-lb doc">S{e.sprint_number}</span>}
                {e.is_client_facing && <span className="smc-lb" style={{ background: '#ecfdf5', color: '#10b981' }}>Client-facing</span>}
              </div>
            </div>
            <p style={{ marginTop: 4 }}>{e.content}</p>
            <form action={toggleClientFacing} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="next" value={e.is_client_facing ? '' : 'on'} />
              <button type="submit" className="smc-btn" style={{ fontSize: 11 }}>
                {e.is_client_facing ? 'Unpublish (internal only)' : 'Publish as release note'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
