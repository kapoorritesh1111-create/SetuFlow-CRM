import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { MAIL_MESSAGE_FIELDS } from '@/lib/mail/organizer-context';
export const dynamic = 'force-dynamic';
export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });
  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id; const userId = workspace.user.id;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  const mailbox = await resolveUserMailbox(supabase, organizationId, userId);
  const emptyCounts = { inbox: 0, sent: 0, drafts: 0, starred: 0, archive: 0, trash: 0, junk: 0 };
  if (!mailbox) return NextResponse.json({ mailbox: null, messages: [], attachments: [], signature: null, counts: emptyCounts, providerReady: Boolean(process.env.RESEND_API_KEY), inboundReady: false }, { headers: { 'Cache-Control': 'private, no-store' } });
  const scopedCount = () => supabase.from('mail_messages').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id);
  const [messagesResult, attachmentsResult, signatureResult, ...countResults] = await Promise.all([
    supabase.from('mail_messages').select(MAIL_MESSAGE_FIELDS).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('mail_attachments').select('id,message_id,filename,content_type,size_bytes,created_at').eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).order('created_at', { ascending: true }),
    supabase.from('mail_signatures').select('id,name,text_signature,html_signature,is_default,updated_at').eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).eq('user_id', userId).eq('is_default', true).limit(1).maybeSingle(),
    scopedCount().eq('folder', 'inbox').eq('is_read', false),
    scopedCount().eq('folder', 'sent').eq('is_read', false),
    scopedCount().eq('folder', 'drafts').eq('status', 'draft'),
    scopedCount().eq('is_starred', true).neq('folder', 'trash'),
    scopedCount().eq('folder', 'archive').eq('is_read', false),
    scopedCount().eq('folder', 'trash').eq('is_read', false),
    scopedCount().in('folder', ['junk', 'spam']).eq('is_read', false),
  ]);
  if (messagesResult.error || countResults.some(result => result.error)) return NextResponse.json({ error: 'Unable to load mailbox messages and counts.' }, { status: 503 });
  const counts = Object.fromEntries(Object.keys(emptyCounts).map((key, index) => [key, Number(countResults[index].count ?? 0)]));
  return NextResponse.json({ mailbox, messages: messagesResult.data ?? [], attachments: attachmentsResult.data ?? [], signature: signatureResult.data ?? null, counts, providerReady: Boolean(process.env.RESEND_API_KEY), inboundReady: Boolean(mailbox.inbound_enabled && process.env.RESEND_WEBHOOK_SECRET) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
