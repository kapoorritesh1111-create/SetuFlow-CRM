'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { randomUUID } from 'crypto';
import { createShareLink } from '../qa/qa-actions';

// Mint a guest session: docs read-only + QA read-write (paired all-suites tester link) + guest chat.
export async function mintGuestLink(input: { label?: string; guestName?: string; guestEmail?: string; expiresInDays?: number }): Promise<{ token: string }> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;
  const days = input.expiresInDays && input.expiresInDays > 0 ? input.expiresInDays : 7;
  const { token: qaToken } = await createShareLink({
    linkType: 'tester_run', suiteKey: undefined,
    label: `Guest QA: ${input.label || input.guestName || 'session'}`,
    testerEmail: input.guestEmail, expiresInDays: days,
  });
  const token = randomUUID().replace(/-/g, '');
  const expires_at = new Date(Date.now() + days * 864e5).toISOString();
  await admin.from('guest_links').insert({
    organization_id: INTERNAL_ORG_ID, token, label: input.label ?? null,
    guest_name: input.guestName ?? null, guest_email: input.guestEmail ?? null,
    qa_token: qaToken, created_by: 'SETU Flow', expires_at,
  });
  revalidatePath('/smc/wiki');
  return { token };
}

export async function revokeGuestLink(id: string): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;
  const { data: g } = await admin.from('guest_links').select('qa_token').eq('id', id).maybeSingle();
  await admin.from('guest_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  if (g?.qa_token) await admin.from('qa_share_links').update({ revoked_at: new Date().toISOString() }).eq('token', g.qa_token);
  revalidatePath('/smc/wiki');
}

export async function teamReplyGuest(guestLinkId: string, body: string): Promise<{ ok: true } | { error: string }> {
  await requireSetuInternalAdminWorkspace();
  const text = (body || '').trim().slice(0, 2000);
  if (!text) return { error: 'Empty message' };
  const admin = createAdminSupabaseClient() as any;
  await admin.from('guest_chat_messages').insert({
    organization_id: INTERNAL_ORG_ID, guest_link_id: guestLinkId,
    sender_kind: 'team', sender_name: 'SETU Flow team', body: text,
  });
  revalidatePath('/smc/wiki');
  return { ok: true };
}
