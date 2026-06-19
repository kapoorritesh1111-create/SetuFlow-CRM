'use server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type GuestMessage = { id: string; sender_kind: 'guest' | 'team'; sender_name: string | null; body: string; attachment_url: string | null; attachment_name: string | null; created_at: string };
export type Attachment = { url: string; name: string };

async function resolve(svc: any, token: string) {
  const { data } = await svc.from('guest_links').select('id, organization_id, guest_name, revoked_at, expires_at').eq('token', token).maybeSingle();
  if (!data || data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function loadGuestChat(token: string): Promise<{ messages: GuestMessage[] } | { error: string }> {
  const svc = createServiceRoleClient() as any;
  const link = await resolve(svc, token);
  if (!link) return { error: 'This guest link is invalid, expired, or revoked.' };
  const { data } = await svc.from('guest_chat_messages').select('id, sender_kind, sender_name, body, attachment_url, attachment_name, created_at').eq('guest_link_id', link.id).order('created_at', { ascending: true });
  return { messages: (data ?? []) as GuestMessage[] };
}

export async function postGuestMessage(token: string, body: string, attachment?: Attachment | null): Promise<{ ok: true } | { error: string }> {
  const svc = createServiceRoleClient() as any;
  const link = await resolve(svc, token);
  if (!link) return { error: 'This guest link is invalid, expired, or revoked.' };
  const text = (body || '').trim().slice(0, 2000);
  if (!text && !attachment) return { error: 'Type a message or attach a file first.' };
  const since = new Date(Date.now() - 60000).toISOString();
  const { count } = await svc.from('guest_chat_messages').select('id', { count: 'exact', head: true }).eq('guest_link_id', link.id).eq('sender_kind', 'guest').gte('created_at', since);
  if ((count ?? 0) >= 8) return { error: 'You are sending messages too quickly — please wait a moment.' };
  await svc.from('guest_chat_messages').insert({
    organization_id: link.organization_id, guest_link_id: link.id, sender_kind: 'guest',
    sender_name: link.guest_name || 'Guest', body: text,
    attachment_url: attachment?.url ?? null, attachment_name: attachment?.name ?? null,
  });
  await svc.from('guest_links').update({ last_used_at: new Date().toISOString() }).eq('id', link.id);
  return { ok: true };
}
