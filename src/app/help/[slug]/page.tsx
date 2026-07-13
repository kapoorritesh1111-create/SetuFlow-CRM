import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type KbArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  body: string;
  updated_at: string;
};

async function getArticle(slug: string): Promise<KbArticle | null> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('kb_articles')
    .select('id, slug, title, category, summary, body, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .maybeSingle();
  return (data ?? null) as KbArticle | null;
}

// Best-effort view count increment via a security-definer RPC — it runs with
// elevated privileges internally (and only ever touches already-published
// rows), so the anon-scoped client is enough here; no need for a public
// UPDATE policy on the whole table or a service-role client on a public page.
async function incrementViewCount(id: string) {
  try {
    const supabase = await createClient();
    await (supabase as any).rpc('increment_kb_article_view_count', { article_id: id });
  } catch {
    // Non-critical — never block rendering the article on this failing.
  }
}

function renderBody(body: string) {
  // Articles are stored as plain text/simple markdown-ish paragraphs. Kept
  // deliberately simple (no markdown library dependency) — paragraphs split
  // on blank lines, single newlines preserved within a paragraph.
  return body.split(/\n\s*\n/).map((paragraph, index) => (
    <p key={index} style={{ marginBottom: 16, whiteSpace: 'pre-wrap' }}>{paragraph}</p>
  ));
}

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  incrementViewCount(article.id);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a' }}>
      <Link href="/help" style={{ fontSize: 13, color: '#0c7fff', fontWeight: 600, textDecoration: 'none' }}>
        ← Help center
      </Link>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569', marginTop: 20, marginBottom: 8 }}>
        {article.category}
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, lineHeight: 1.3 }}>{article.title}</h1>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: '#334155' }}>
        {renderBody(article.body)}
      </div>
    </div>
  );
}
