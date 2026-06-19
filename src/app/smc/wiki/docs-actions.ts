'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { randomUUID } from 'crypto';

export async function createDocsShareLink(input: { label?: string; audience?: string; expiresInDays?: number }): Promise<{ token: string }> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;
  const token = randomUUID().replace(/-/g, '');
  const expires_at = input.expiresInDays && input.expiresInDays > 0 ? new Date(Date.now() + input.expiresInDays * 864e5).toISOString() : null;
  await admin.from('docs_share_links').insert({ organization_id: INTERNAL_ORG_ID, token, label: input.label ?? null, audience: input.audience ?? null, created_by: 'SETU Flow', expires_at });
  revalidatePath('/smc/wiki');
  return { token };
}

export async function revokeDocsShareLink(id: string): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;
  await admin.from('docs_share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/smc/wiki');
}
