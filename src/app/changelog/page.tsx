import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ChangelogEntry = {
  id: string;
  title: string;
  content: string;
  version: string | null;
  category: string | null;
  published_at: string | null;
};

async function getPublishedEntries(): Promise<ChangelogEntry[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('smc_changelog')
    .select('id, title, content, version, category, published_at')
    .eq('is_client_facing', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });
  return (data ?? []) as ChangelogEntry[];
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function ChangelogPage() {
  const entries = await getPublishedEntries();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a' }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0c7fff', marginBottom: 8 }}>
        SETU Flow
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>What&apos;s new</h1>
      <p style={{ color: '#64748b', marginBottom: 40, fontSize: 15 }}>
        Product updates and improvements, in the order they shipped.
      </p>

      {entries.length === 0 ? (
        <div style={{ padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
          No release notes published yet. Check back soon.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {entries.map((entry) => (
            <article key={entry.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{formatDate(entry.published_at)}</span>
                {entry.version && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0c7fff', background: '#eff6ff', borderRadius: 999, padding: '2px 10px' }}>
                    {entry.version}
                  </span>
                )}
                {entry.category && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', borderRadius: 999, padding: '2px 10px', textTransform: 'capitalize' }}>
                    {entry.category}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{entry.title}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: '#334155', whiteSpace: 'pre-wrap' }}>{entry.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
