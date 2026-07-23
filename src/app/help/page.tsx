import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type KbArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
};

async function getPublishedArticles(): Promise<KbArticle[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('kb_articles')
    .select('id, slug, title, category, summary')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('category', { ascending: true })
    .order('title', { ascending: true });
  return (data ?? []) as KbArticle[];
}

export default async function HelpCenterPage() {
  const articles = await getPublishedArticles();
  const byCategory = new Map<string, KbArticle[]>();
  for (const article of articles) {
    const list = byCategory.get(article.category) ?? [];
    list.push(article);
    byCategory.set(article.category, list);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a' }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0c7fff', marginBottom: 8 }}>
        SETU Flow
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Help center</h1>
      <p style={{ color: '#64748b', marginBottom: 40, fontSize: 15 }}>
        Guides and answers for using SETU Flow.
      </p>

      {byCategory.size === 0 ? (
        <div style={{ padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
          No help articles published yet. Check back soon, or contact your account team.
        </div>
      ) : (
        [...byCategory.entries()].map(([category, categoryArticles]) => (
          <section key={category} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569', marginBottom: 16 }}>
              {category}
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {categoryArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/help/${article.slug}`}
                  style={{
                    display: 'block',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '16px 20px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{article.title}</h3>
                  {article.summary && (
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>{article.summary}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
