import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { fetchInteraktContacts } from '@/features/integrations/interakt/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;
const ORG = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';

export default async function Page() {
  const user = await requireWorkspace();
  const starkAccess = user.organization?.id === ORG &&
    Boolean(user.membership) &&
    user.currentRoles.some(role => ['owner', 'admin'].includes(String(role).toLowerCase()));
  if (!starkAccess) {
    const isWrongWorkspace = Boolean(user.membership && user.organization?.id !== ORG);
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Interakt assignment audit</h1>
        <p className="text-slate-700">
          {isWrongWorkspace
            ? 'You are signed in to a different SETU Flow workspace. Switch to Stark Packmate using the organization selector, then open this audit again.'
            : 'This report is limited to Stark Packmate Owner/Admin accounts. Sign in with the correct account or ask your organization owner for access.'}
        </p>
        <p className="text-sm text-slate-500">Current workspace: {user.organization?.name ?? 'None'}. No records have been modified.</p>
        <Link href="/dashboard" className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Return to dashboard</Link>
      </main>
    );
  }
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database unavailable');
  const rows: Array<{ external_contact_id: string | null; setu_assigned_email: string | null }> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('lead_intake_staging')
      .select('external_contact_id,setu_assigned_email')
      .eq('organization_id', ORG).eq('source_provider', 'interakt')
      .gte('created_at', since).order('id').range(offset, offset + 999);
    if (error) throw new Error('Database audit read failed');
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const contacts = new Map<string, string>();
  for (const query of [{ createdAfter: since }, { modifiedAfter: since }]) {
    let finished = false;
    for (let page = 0; page < 50; page++) {
      const result = await fetchInteraktContacts({ ...query, offset: page * 100, limit: 100 });
      for (const contact of result.contacts) {
        const assignee = contact.traits?.chat_assignee;
        const email = assignee && typeof assignee === 'object' && !Array.isArray(assignee)
          ? String((assignee as Record<string, unknown>).email ?? '').toLowerCase().trim() : '';
        contacts.set(contact.externalContactId, email);
      }
      if (!result.hasNextPage && result.contacts.length < 100) { finished = true; break; }
      if (result.contacts.length === 0) { finished = true; break; }
    }
    if (!finished) throw new Error('Interakt pagination cap reached; comparison is incomplete');
  }
  let match = 0, different = 0, noProvider = 0, missing = 0;
  for (const row of rows) {
    const contactId = row.external_contact_id ?? '';
    if (!contacts.has(contactId)) { missing++; continue; }
    const actual = contacts.get(contactId) ?? '';
    if (!actual) { noProvider++; continue; }
    if (actual === String(row.setu_assigned_email ?? '').toLowerCase().trim()) match++;
    else different++;
  }
  return <main className="mx-auto max-w-3xl space-y-4 p-8">
    <h1 className="text-2xl font-bold">Live Interakt owner comparison</h1>
    <p>Read-only Interakt API versus SETU inbound records created during the last seven days.</p>
    <p>SETU records: {rows.length}; live Interakt contacts returned: {contacts.size}.</p>
    <p>Matching owner emails: {match}; different: {different}; provider unassigned: {noProvider}; not returned by API: {missing}.</p>
    <p>Checked at {new Date().toISOString()}. No contact or lead assignments were changed.</p>
  </main>;
}
