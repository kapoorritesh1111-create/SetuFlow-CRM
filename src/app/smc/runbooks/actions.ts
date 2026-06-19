'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

function str(v: FormDataEntryValue | null): string { return typeof v === 'string' ? v.trim() : ''; }
function slugify(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }

export async function createRunbook(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const title = str(formData.get('title'));
  const content = str(formData.get('content'));
  if (!title || !content) return;
  const admin = createAdminSupabaseClient() as any;
  await admin.from('smc_wiki_pages').insert({
    organization_id: INTERNAL_ORG_ID,
    slug: slugify(title) || `page-${Date.now().toString(36)}`,
    title,
    content,
    category: str(formData.get('category')) || 'runbook',
    author_name: 'SETU Flow',
    pinned: formData.get('pinned') === 'on',
  });
  revalidatePath('/smc/runbooks');
}
