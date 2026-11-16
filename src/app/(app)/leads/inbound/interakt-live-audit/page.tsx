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
  const rows: Array<{ id: string; external_contact_id: string | null; setu_assigned_email: string | null; setu_assigned_name: string | null }> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('lead_intake_staging')
      .select('id,external_contact_id,setu_assigned_email,setu_assigned_name')
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

  // The Contacts Retrieval API does NOT supply a usable chat assignee in this
  // response. Absence is UNKNOWN, not evidence of an unassigned Interakt chat.
  let apiProvidedOwner = 0, apiOwnerMatches = 0, apiOwnerDiffers = 0;
  let notReturned = 0, apiOwnerUnavailable = 0;
  for (const row of rows) {
    const key = row.external_contact_id ?? '';
    if (!contacts.has(key)) { notReturned++; continue; }
    const email = contacts.get(key) ?? '';
    if (!email) { apiOwnerUnavailable++; continue; }
    apiProvidedOwner++;
    if (email === String(row.setu_assigned_email ?? '').toLowerCase().trim()) apiOwnerMatches++;
    else apiOwnerDiffers++;
  }

  // A second, distinct source: Interakt's signed-incoming webhook event
  // payloads, captured at event time. These demonstrate reported ownership
  // historically, but are NOT a substitute for current inbox ownership.
  type Snapshot = { email: string; name: string; at: string };
  const events = new Map<string, Snapshot>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('lead_intake_webhook_events')
      .select('created_at,payload')
      .eq('organization_id', ORG).eq('event_type', 'message_received')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(offset, offset + 999);
    if (error) throw new Error('Webhook history read failed');
    for (const event of data ?? []) {
      const customer = event.payload?.data?.customer;
      const cid = String(customer?.id ?? '').trim();
      if (!cid || events.has(cid)) continue;
      const owner = customer?.traits?.chat_assignee;
      const email = owner && typeof owner === 'object' ? String(owner.email ?? '').toLowerCase().trim() : '';
      const name = owner && typeof owner === 'object'
        ? [owner.first_name,owner.last_name].filter(Boolean).join(' ').trim() : '';
      events.set(cid, { email, name: name || email, at: event.created_at });
    }
    if ((data ?? []).length < 1000) break;
  }

  const setuCounts = new Map<string, number>();
  const historicalCounts = new Map<string, number>();
  const differences: Array<{ id: string; when: string; historic: string; current: string }> = [];
  let historicalMatch = 0, historicalDifferent = 0, historicalNoOwner = 0, historicalNoEvent = 0;
  for (const row of rows) {
    const setuName = row.setu_assigned_name ?? row.setu_assigned_email ?? 'Unassigned';
    setuCounts.set(setuName, (setuCounts.get(setuName) ?? 0) + 1);
    const event = events.get(row.external_contact_id ?? '');
    if (!event) { historicalNoEvent++; continue; }
    if (!event.email) { historicalNoOwner++; continue; }
    const key = event.name || event.email;
    historicalCounts.set(key, (historicalCounts.get(key) ?? 0) + 1);
    if (event.email === String(row.setu_assigned_email ?? '').toLowerCase().trim()) historicalMatch++;
    else {
      historicalDifferent++;
      differences.push({ id: row.id, when: event.at, historic: key, current: setuName });
    }
  }
  const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
  return <main className="mx-auto max-w-5xl space-y-5 p-6 text-slate-900">
    <h1 className="text-2xl font-bold">Interakt assignment evidence — 7 days</h1>
    <p className="text-sm">Checked at {new Date().toISOString()}. Read-only; no leads or assignments changed.</p>
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="font-bold">Important: Current Interakt inbox ownership is not verified</h2>
      <p>The Interakt Contacts Retrieval API returned {contacts.size} contacts, but supplied usable assignee emails for only {apiProvidedOwner} of {rows.length} recent SETU records. The other {apiOwnerUnavailable} are <strong>unknown</strong>, not proven unassigned. {notReturned} were not included in the API result.</p>
      <p>API owner matches: {apiOwnerMatches}. Differences: {apiOwnerDiffers}. These numbers must not be interpreted as a full assignment audit.</p>
    </section>
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-bold">SETU's current owners ({rows.length} records)</h2>
      <table className="mt-3 w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Salesperson</th><th className="p-2 text-right">Records</th></tr></thead><tbody>
        {[...setuCounts].sort(byCount).map(([name,count]) => <tr className="border-b" key={name}><td className="p-2">{name}</td><td className="p-2 text-right">{count}</td></tr>)}
      </tbody></table>
    </section>
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-bold">Latest Interakt webhook-reported owner</h2>
      <p className="text-sm text-slate-600">Historical event snapshots, not a current live inbox export. Covers only these {rows.length} SETU records.</p>
      <table className="mt-3 w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Interakt webhook owner</th><th className="p-2 text-right">Contacts</th></tr></thead><tbody>
        {[...historicalCounts].sort(byCount).map(([name,count]) => <tr className="border-b" key={name}><td className="p-2">{name}</td><td className="p-2 text-right">{count}</td></tr>)}
      </tbody></table>
      <p className="mt-3 text-sm">Historical webhook vs current SETU: {historicalMatch} same, {historicalDifferent} different, {historicalNoOwner} owner omitted, {historicalNoEvent} without a recent inbound webhook.</p>
    </section>
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-bold">Potential ownership changes ({differences.length})</h2>
      <p className="text-sm text-slate-600">These require confirmation. A later reassignment in Interakt can legitimately explain a difference.</p>
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">SETU intake</th><th className="p-2">Webhook owner</th><th className="p-2">SETU owner</th><th className="p-2">Webhook time (UTC)</th></tr></thead><tbody>
        {differences.slice(0,100).map(item => <tr className="border-b" key={item.id}><td className="p-2 font-mono text-xs">{item.id.slice(0,8)}</td><td className="p-2">{item.historic}</td><td className="p-2">{item.current}</td><td className="p-2">{item.when}</td></tr>)}
        </tbody></table>
      </div>
    </section>
    <section className="rounded-xl border p-4">
      <h2 className="font-bold">What will prove current Interakt ownership?</h2>
      <p>Export the current Interakt inbox/contact ownership using the Assignee filter, including the contact identifier and assigned agent. That export, or a documented read-only current-chat-owner endpoint, can be compared directly to SETU. The Get Users contact endpoint alone cannot substantiate the distribution.</p>
    </section>
  </main>;
}
