import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';

export const dynamic = 'force-dynamic';

export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });
  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  const mailbox = await resolveUserMailbox(supabase, organizationId, userId);
  if (!mailbox) return NextResponse.json({ mailbox: null, messages: [], attachments: [], signature: null, providerReady: Boolean(process.env.RESEND_API_KEY), inboundReady: false });
  const [messagesResult, attachmentsResult, signatureResult] = await Promise.all([
    supabase.from('mail_messages').select('id,thread_id,direction,status,folder,from_address,to_addresses,cc_addresses,bcc_addresses,subject,text_body,is_read,is_starred,archived_at,trashed_at,draft_saved_at,message_id_header,in_reply_to,reference_headers,created_at,sent_at,received_at').eq('mailbox_id', mailbox.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('mail_attachments').select('id,message_id,filename,content_type,size_bytes,created_at').eq('mailbox_id', mailbox.id).order('created_at', { ascending: true }),
    supabase.from('mail_signatures').select('id,name,text_signature,html_signature,is_default,updated_at').eq('mailbox_id', mailbox.id).eq('user_id', userId).eq('is_default', true).limit(1).maybeSingle(),
  ]);
  if (messagesResult.error) return NextResponse.json({ error: 'Unable to load mailbox messages.' }, { status: 500 });
  return NextResponse.json({ mailbox, messages: messagesResult.data ?? [], attachments: attachmentsResult.data ?? [], signature: signatureResult.data ?? null, providerReady: Boolean(process.env.RESEND_API_KEY), inboundReady: Boolean(mailbox.inbound_enabled && process.env.RESEND_WEBHOOK_SECRET) });
}
