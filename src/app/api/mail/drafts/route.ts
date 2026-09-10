import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string; to?: string[]; cc?: string[]; bcc?: string[]; subject?: string; text?: string; threadId?: string } | null;
  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  const { data: mailbox } = await supabase.from('mail_mailboxes').select('id,address').eq('organization_id', organizationId).eq('user_id', workspace.user.id).eq('status', 'active').limit(1).maybeSingle();
  if (!mailbox) return NextResponse.json({ error: 'No active Setu Mail mailbox is configured.' }, { status: 409 });

  const now = new Date().toISOString();
  const payload = {
    organization_id: organizationId,
    mailbox_id: mailbox.id,
    thread_id: body?.threadId || null,
    direction: 'outbound',
    status: 'draft',
    folder: 'drafts',
    from_address: mailbox.address,
    to_addresses: Array.isArray(body?.to) ? body?.to : [],
    cc_addresses: Array.isArray(body?.cc) ? body?.cc : [],
    bcc_addresses: Array.isArray(body?.bcc) ? body?.bcc : [],
    subject: String(body?.subject ?? ''),
    text_body: String(body?.text ?? ''),
    html_body: null,
    is_read: true,
    draft_saved_at: now,
    updated_at: now,
  };

  if (body?.id) {
    const { data, error } = await supabase.from('mail_messages').update(payload).eq('id', body.id).eq('mailbox_id', mailbox.id).eq('status', 'draft').select('id,draft_saved_at').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Unable to update draft.' }, { status: 500 });
    return NextResponse.json({ ok: true, draft: data });
  }
  const { data, error } = await supabase.from('mail_messages').insert(payload).select('id,draft_saved_at').single();
  if (error || !data) return NextResponse.json({ error: 'Unable to save draft.' }, { status: 500 });
  return NextResponse.json({ ok: true, draft: data });
}

export async function DELETE(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Draft id is required.' }, { status: 400 });
  const supabase = (await createClient()) as any;
  const { data: mailbox } = await supabase.from('mail_mailboxes').select('id').eq('organization_id', workspace.organization.id).eq('user_id', workspace.user.id).eq('status', 'active').limit(1).maybeSingle();
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });
  const { error } = await supabase.from('mail_messages').delete().eq('id', id).eq('mailbox_id', mailbox.id).eq('status', 'draft');
  if (error) return NextResponse.json({ error: 'Unable to delete draft.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
