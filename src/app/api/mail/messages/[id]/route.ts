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
  const body = await request.json().catch(() => null) as { action?: string; value?: boolean } | null;
  const action = String(body?.action ?? '');
  const now = new Date().toISOString();
  let patch: Record<string, unknown> = { updated_at: now };
  if (action === 'read') patch.is_read = body?.value !== false;
  else if (action === 'star') patch.is_starred = body?.value !== false;
  else if (action === 'archive') patch = { ...patch, archived_at: body?.value === false ? null : now, folder: body?.value === false ? 'inbox' : 'archive' };
  else if (action === 'trash') patch = { ...patch, trashed_at: body?.value === false ? null : now, folder: body?.value === false ? 'inbox' : 'trash' };
  else return NextResponse.json({ error: 'Unsupported message action.' }, { status: 400 });
  const { data, error } = await supabase.from('mail_messages').update(patch).eq('id', params.id).eq('mailbox_id', mailbox.id).select('id,is_read,is_starred,folder,archived_at,trashed_at').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Unable to update message.' }, { status: 500 });
  return NextResponse.json({ ok: true, message: data });
}
