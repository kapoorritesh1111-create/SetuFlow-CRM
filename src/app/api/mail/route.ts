import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function normalizeAddress(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;

  const { data: grant } = await supabase
    .from('org_module_grants')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('module_key', 'setu_mail')
    .maybeSingle();
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });

  let { data: mailbox } = await supabase
    .from('mail_mailboxes')
    .select('id,address,display_name,inbound_enabled,status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!mailbox) {
    const address = normalizeAddress(workspace.profile?.email ?? workspace.user.email);
    if (address) {
      const { data: created } = await supabase
        .from('mail_mailboxes')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          address,
          display_name: workspace.profile?.full_name ?? workspace.profile?.username ?? null,
          inbound_enabled: false,
        })
        .select('id,address,display_name,inbound_enabled,status')
        .single();
      mailbox = created ?? null;
    }
  }

  if (!mailbox) {
    return NextResponse.json({ mailbox: null, messages: [], attachments: [], signature: null, providerReady: Boolean(process.env.RESEND_API_KEY), inboundReady: false });
  }

  const [messagesResult, attachmentsResult, signatureResult] = await Promise.all([
    supabase
      .from('mail_messages')
      .select('id,thread_id,direction,status,folder,from_address,to_addresses,cc_addresses,bcc_addresses,subject,text_body,is_read,is_starred,archived_at,trashed_at,draft_saved_at,message_id_header,in_reply_to,reference_headers,created_at,sent_at,received_at')
      .eq('mailbox_id', mailbox.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('mail_attachments')
      .select('id,message_id,filename,content_type,size_bytes,created_at')
      .eq('mailbox_id', mailbox.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('mail_signatures')
      .select('id,name,text_signature,html_signature,is_default,updated_at')
      .eq('mailbox_id', mailbox.id)
      .eq('user_id', userId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle(),
  ]);

  if (messagesResult.error) return NextResponse.json({ error: 'Unable to load mailbox messages.' }, { status: 500 });

  return NextResponse.json({
    mailbox,
    messages: messagesResult.data ?? [],
    attachments: attachmentsResult.data ?? [],
    signature: signatureResult.data ?? null,
    providerReady: Boolean(process.env.RESEND_API_KEY),
    inboundReady: Boolean(mailbox.inbound_enabled && process.env.RESEND_WEBHOOK_SECRET),
  });
}
