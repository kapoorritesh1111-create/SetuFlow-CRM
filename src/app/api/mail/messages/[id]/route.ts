import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const supabase = (await createClient()) as any;
  const { data: mailbox } = await supabase.from('mail_mailboxes').select('id').eq('organization_id', workspace.organization.id).eq('user_id', workspace.user.id).eq('status', 'active').limit(1).maybeSingle();
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  const { data: message } = await supabase.from('mail_messages').select('id,direction,status,folder').eq('id', params.id).eq('mailbox_id', mailbox.id).maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  let action = String(body?.action ?? '').trim();
  let value = body?.value !== false;
  if (!action) {
    for (const candidate of ['read', 'star', 'archive', 'trash']) {
      if (typeof body?.[candidate] === 'boolean') { action = candidate; value = body[candidate] as boolean; break; }
    }
  }

  const now = new Date().toISOString();
  const restoreFolder = message.status === 'draft' ? 'drafts' : message.direction === 'outbound' ? 'sent' : 'inbox';
  let patch: Record<string, unknown> = { updated_at: now };
  if (action === 'read') patch.is_read = value;
  else if (action === 'star') patch.is_starred = value;
  else if (action === 'archive') patch = { ...patch, archived_at: value ? now : null, trashed_at: null, folder: value ? 'archive' : restoreFolder };
  else if (action === 'trash') patch = { ...patch, trashed_at: value ? now : null, archived_at: null, folder: value ? 'trash' : restoreFolder };
  else return NextResponse.json({ error: 'Unsupported message action.' }, { status: 400 });

  const { data, error } = await supabase.from('mail_messages').update(patch).eq('id', params.id).eq('mailbox_id', mailbox.id).select('id,is_read,is_starred,folder,archived_at,trashed_at').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Unable to update message.' }, { status: 500 });
  return NextResponse.json({ ok: true, message: data });
}
