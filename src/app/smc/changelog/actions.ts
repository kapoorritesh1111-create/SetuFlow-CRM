'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function str(v: FormDataEntryValue | null): string { return typeof v === 'string' ? v.trim() : ''; }

export async function createEntry(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const title = str(formData.get('title'));
  const content = str(formData.get('content'));
  if (!title || !content) return;
  const sprintRaw = Number.parseInt(str(formData.get('sprint_number')), 10);
  const is_client_facing = formData.get('is_client_facing') === 'on';
  const admin = createAdminSupabaseClient() as any;
  await admin.from('smc_changelog').insert({
    title,
    content,
    version: str(formData.get('version')) || null,
    category: str(formData.get('category')) || 'release',
    sprint_number: Number.isFinite(sprintRaw) ? sprintRaw : null,
    is_client_facing,
    author_name: 'SETU Flow',
    published_at: is_client_facing ? new Date().toISOString() : null,
  });
  revalidatePath('/smc/changelog');
}

export async function toggleClientFacing(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const id = str(formData.get('id'));
  if (!id) return;
  const next = formData.get('next') === 'on';
  const admin = createAdminSupabaseClient() as any;
  await admin.from('smc_changelog').update({
    is_client_facing: next,
    published_at: next ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePath('/smc/changelog');
}
