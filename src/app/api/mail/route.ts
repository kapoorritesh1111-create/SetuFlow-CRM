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
    return NextResponse.json({ mailbox: null, messages: [], providerReady: Boolean(process.env.RESEND_API_KEY), inboundReady: false });
  }

  const { data: messages, error } = await supabase
    .from('mail_messages')
    .select('id,direction,status,from_address,to_addresses,cc_addresses,subject,text_body,is_read,created_at,sent_at,received_at')
    .eq('mailbox_id', mailbox.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: 'Unable to load mailbox messages.' }, { status: 500 });

  return NextResponse.json({
    mailbox,
    messages: messages ?? [],
    providerReady: Boolean(process.env.RESEND_API_KEY),
    inboundReady: Boolean(mailbox.inbound_enabled && process.env.RESEND_WEBHOOK_SECRET),
  });
}
