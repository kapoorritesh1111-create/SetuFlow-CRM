import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { normalizeIdentityEmail } from '@/lib/contacts/identity';

export const dynamic = 'force-dynamic';

type Suggestion = {
  email: string;
  name: string | null;
  company: string | null;
  source: 'contact' | 'crm' | 'history';
  lastUsedAt: string | null;
};

function clean(value: unknown, max = 120) {
  return String(value ?? '').trim().slice(0, max);
}

function displayName(row: any) {
  return `${row?.first_name ?? ''} ${row?.last_name ?? ''}`.trim() || null;
}

function pushSuggestion(map: Map<string, Suggestion>, candidate: Suggestion) {
  const email = normalizeIdentityEmail(candidate.email);
  if (!email) return;
  const current = map.get(email);
  if (!current) {
    map.set(email, { ...candidate, email });
    return;
  }
  const rank = { contact: 3, crm: 2, history: 1 } as const;
  const preferred = rank[candidate.source] > rank[current.source] ? candidate : current;
  map.set(email, {
    ...preferred,
    email,
    name: preferred.name || current.name || candidate.name || null,
    company: preferred.company || current.company || candidate.company || null,
    lastUsedAt: [current.lastUsedAt, candidate.lastUsedAt].filter(Boolean).sort().reverse()[0] ?? null,
  });
}

export async function GET(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const mailbox = await resolveUserMailbox(db, organizationId, workspace.user.id, 'id,address,status');
  if (!mailbox) return NextResponse.json({ suggestions: [] });

  const q = clean(new URL(request.url).searchParams.get('q'), 100).toLowerCase();
  if (!q) return NextResponse.json({ suggestions: [] }, { headers: { 'Cache-Control': 'private, no-store' } });

  const [{ data: contacts }, { data: leads }, { data: recentOutbound }, { data: recentInbound }] = await Promise.all([
    db.from('contacts')
      .select('first_name,last_name,company,email,updated_at')
      .eq('organization_id', organizationId)
      .is('archived_at', null)
      .limit(300),
    db.from('leads')
      .select('contact_name,company_name,email,updated_at')
      .eq('organization_id', organizationId)
      .not('email', 'is', null)
      .limit(500),
    db.from('mail_messages')
      .select('to_addresses,cc_addresses,bcc_addresses,sent_at,created_at')
      .eq('organization_id', organizationId)
      .eq('mailbox_id', mailbox.id)
      .eq('direction', 'outbound')
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(250),
    db.from('mail_messages')
      .select('from_address,received_at,created_at')
      .eq('organization_id', organizationId)
      .eq('mailbox_id', mailbox.id)
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false, nullsFirst: false })
      .limit(150),
  ]);

  const map = new Map<string, Suggestion>();
  for (const row of contacts ?? []) pushSuggestion(map, { email: row.email, name: displayName(row), company: row.company ?? null, source: 'contact', lastUsedAt: row.updated_at ?? null });
  for (const row of leads ?? []) pushSuggestion(map, { email: row.email, name: row.contact_name ?? null, company: row.company_name ?? null, source: 'crm', lastUsedAt: row.updated_at ?? null });
  for (const row of recentOutbound ?? []) {
    const lastUsedAt = row.sent_at ?? row.created_at ?? null;
    for (const email of [...(row.to_addresses ?? []), ...(row.cc_addresses ?? []), ...(row.bcc_addresses ?? [])]) pushSuggestion(map, { email, name: null, company: null, source: 'history', lastUsedAt });
  }
  for (const row of recentInbound ?? []) pushSuggestion(map, { email: row.from_address, name: null, company: null, source: 'history', lastUsedAt: row.received_at ?? row.created_at ?? null });

  const suggestions = [...map.values()]
    .filter(item => `${item.name ?? ''} ${item.company ?? ''} ${item.email}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = `${a.name ?? ''} ${a.company ?? ''} ${a.email}`.toLowerCase().split(/\s+/).some(part => part.startsWith(q)) ? 1 : 0;
      const bStarts = `${b.name ?? ''} ${b.company ?? ''} ${b.email}`.toLowerCase().split(/\s+/).some(part => part.startsWith(q)) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      return String(b.lastUsedAt ?? '').localeCompare(String(a.lastUsedAt ?? ''));
    })
    .slice(0, 8);

  return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, no-store' } });
}
