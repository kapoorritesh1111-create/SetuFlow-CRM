import { createClient } from '@/lib/supabase/server';
import { updateArticleStatus, deleteArticle } from './actions';
import { KbForm } from './kb-form';

export const dynamic = 'force-dynamic';

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  status: 'draft' | 'review' | 'published';
  view_count: number;
  created_by_name: string | null;
  created_at: string;
};

async function getArticles(): Promise<Article[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('kb_articles')
    .select('id, slug, title, category, summary, status, view_count, created_by_name, created_at')
    .order('created_at', { ascending: false });
  return (data ?? []) as Article[];
}

const STATUS_LABEL: Record<Article['status'], string> = { draft: 'Draft', review: 'In review', published: 'Published' };
const STATUS_COLOR: Record<Article['status'], string> = { draft: '#64748b', review: '#d97706', published: '#10b981' };

export default async function SmcKbPage() {
  const articles = await getArticles();

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Product</div><h1>Knowledge Base</h1></div>
        <KbForm />
      </div>
      <div className="smc-content-page">
        <p style={{ color: '#64748b', marginBottom: 16, fontSize: 13 }}>
          Customer-facing help articles. Published articles are visible at{' '}
          <a href="/help" target="_blank" rel="noopener">/help</a>. Draft and in-review articles are internal-only.
        </p>
        {articles.length === 0 ? (
          <p style={{ color: '#64748b' }}>No articles yet. Use New Article to write the first one.</p>
        ) : articles.map((article) => (
          <div key={article.id} className="smc-content-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h4>{article.title}</h4>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span className="smc-lb doc">{article.category}</span>
                <span className="smc-lb" style={{ background: `${STATUS_COLOR[article.status]}1a`, color: STATUS_COLOR[article.status] }}>
                  {STATUS_LABEL[article.status]}
                </span>
                {article.status === 'published' && (
                  <span className="smc-lb doc">{article.view_count} views</span>
                )}
              </div>
            </div>
            {article.summary && <p style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>{article.summary}</p>}
            <p style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>/help/{article.slug}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {article.status !== 'draft' && (
                <form action={updateArticleStatus}>
                  <input type="hidden" name="id" value={article.id} />
                  <input type="hidden" name="status" value="draft" />
                  <button type="submit" className="smc-btn" style={{ fontSize: 11 }}>Move to Draft</button>
                </form>
              )}
              {article.status !== 'review' && (
                <form action={updateArticleStatus}>
                  <input type="hidden" name="id" value={article.id} />
                  <input type="hidden" name="status" value="review" />
                  <button type="submit" className="smc-btn" style={{ fontSize: 11 }}>Send to Review</button>
                </form>
              )}
              {article.status !== 'published' && (
                <form action={updateArticleStatus}>
                  <input type="hidden" name="id" value={article.id} />
                  <input type="hidden" name="status" value="published" />
                  <button type="submit" className="smc-btn smc-btn-p" style={{ fontSize: 11 }}>Publish</button>
                </form>
              )}
              {article.status === 'published' && (
                <form action={updateArticleStatus}>
                  <input type="hidden" name="id" value={article.id} />
                  <input type="hidden" name="status" value="draft" />
                  <button type="submit" className="smc-btn" style={{ fontSize: 11 }}>Unpublish</button>
                </form>
              )}
              <form action={deleteArticle} onSubmit={(e) => { if (!confirm('Delete this article permanently?')) e.preventDefault(); }}>
                <input type="hidden" name="id" value={article.id} />
                <button type="submit" className="smc-btn" style={{ fontSize: 11, color: '#dc2626' }}>Delete</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
