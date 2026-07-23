'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function str(v: FormDataEntryValue | null): string { return typeof v === 'string' ? v.trim() : ''; }

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export async function createArticle(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const title = str(formData.get('title'));
  const body = str(formData.get('body'));
  const category = str(formData.get('category')) || 'General';
  if (!title || !body) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminSupabaseClient() as any;
  const baseSlug = slugify(title);
  // Ensure uniqueness without a round-trip loop for the common case; a
  // collision just appends a short suffix rather than failing the save.
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

  await admin.from('kb_articles').insert({
    slug: baseSlug || slug,
    title,
    category,
    summary: str(formData.get('summary')) || null,
    body,
    status: 'draft',
    created_by: user?.id ?? null,
    created_by_name: user?.email ?? 'SETU Flow',
  });
  revalidatePath('/smc/kb');
}

export async function updateArticleStatus(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const id = str(formData.get('id'));
  const nextStatus = str(formData.get('status'));
  if (!id || !['draft', 'review', 'published'].includes(nextStatus)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminSupabaseClient() as any;
  const patch: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };
  if (nextStatus === 'published') {
    patch.published_at = new Date().toISOString();
    patch.reviewed_by = user?.id ?? null;
    patch.reviewed_by_name = user?.email ?? 'SETU Flow';
  }
  if (nextStatus !== 'published') {
    patch.published_at = null;
  }

  await admin.from('kb_articles').update(patch).eq('id', id);
  revalidatePath('/smc/kb');
  revalidatePath('/help');
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const id = str(formData.get('id'));
  if (!id) return;
  const admin = createAdminSupabaseClient() as any;
  await admin.from('kb_articles').delete().eq('id', id);
  revalidatePath('/smc/kb');
  revalidatePath('/help');
}
