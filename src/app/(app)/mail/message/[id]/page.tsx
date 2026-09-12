import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { listUserMailboxes } from '@/lib/mail/resolve-user-mailbox';

export const dynamic = 'force-dynamic';

function when(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default async function MailMessagePage({ params }: { params: { id: string } }) {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) redirect('/login');
  const db = (await createClient()) as any;

  const { data: message } = await db.from('mail_messages')
    .select('id,mailbox_id,direction,from_address,to_addresses,cc_addresses,subject,text_body,received_at,sent_at,is_read')
    .eq('id', params.id)
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();
  if (!message) redirect('/mail');

  const mailboxes = await listUserMailboxes(db, workspace.organization.id, workspace.user.id);
  if (!mailboxes.some(mailbox => mailbox.id === message.mailbox_id && mailbox.can_read)) redirect('/mail');

  if (!message.is_read && message.direction === 'inbound') {
    await db.from('mail_messages').update({ is_read: true, updated_at: new Date().toISOString() }).eq('id', message.id).eq('mailbox_id', message.mailbox_id);
  }

  const peer = message.direction === 'inbound' ? message.from_address : (message.to_addresses ?? []).join(', ');
  const timestamp = message.direction === 'inbound' ? message.received_at : message.sent_at;

  return <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">Setu Mail</div><h1 className="mt-1 truncate text-xl font-black text-slate-950">{message.subject || '(No subject)'}</h1></div>
        <Link href="/mail" className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Back to Inbox</Link>
      </div>
      <div className="border-b border-slate-100 px-5 py-4 text-sm">
        <div className="font-bold text-slate-900">{peer}</div>
        <div className="mt-1 text-xs text-slate-500">{message.direction === 'inbound' ? `To ${(message.to_addresses ?? []).join(', ')}` : `From ${message.from_address}`}{when(timestamp) ? ` · ${when(timestamp)}` : ''}</div>
        {(message.cc_addresses ?? []).length ? <div className="mt-1 text-xs text-slate-400">Cc {(message.cc_addresses ?? []).join(', ')}</div> : null}
      </div>
      <div className="whitespace-pre-wrap break-words px-5 py-6 text-sm leading-7 text-slate-700">{message.text_body || 'No plain-text message body was provided.'}</div>
    </div>
  </div>;
}
