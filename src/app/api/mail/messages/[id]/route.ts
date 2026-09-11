import { NextRequest, NextResponse } from 'next/server';
import { mailOrganizerContext, MailAccessError } from '@/lib/mail/organizer-context';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await mailOrganizerContext(request);
    if (!ctx.canMove) return NextResponse.json({ error: 'This mailbox is read-only for your account.' }, { status: 403 });
    const { db, organizationId, mailbox } = ctx;
    const { data: message, error: readError } = await db.from('mail_messages').select('id,direction,status,folder').eq('id', params.id).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).maybeSingle();
    if (readError) return NextResponse.json({ error: 'Unable to load message.' }, { status: 500 });
    if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    let action = String(body?.action ?? '').trim(); let value = body?.value !== false;
    if (!action) for (const key of ['read', 'star', 'archive', 'trash']) {
      if (typeof body?.[key] === 'boolean') { action = key; value = body[key] as boolean; break; }
    }
    const now = new Date().toISOString();
    const restoreFolder = message.status === 'draft' ? 'drafts' : message.direction === 'outbound' ? 'sent' : 'inbox';
    let patch: Record<string, unknown> = { updated_at: now };
    if (action === 'read') patch.is_read = value;
    else if (action === 'star') patch.is_starred = value;
    else if (action === 'archive') patch = { ...patch, custom_folder_id: null, archived_at: value ? now : null, trashed_at: null, folder: value ? 'archive' : restoreFolder };
    else if (action === 'trash') patch = { ...patch, custom_folder_id: null, trashed_at: value ? now : null, archived_at: null, folder: value ? 'trash' : restoreFolder };
    else return NextResponse.json({ error: 'Unsupported message action.' }, { status: 400 });
    const { data, error } = await db.from('mail_messages').update(patch).eq('id', params.id).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).select('id,is_read,is_starred,folder,custom_folder_id,archived_at,trashed_at').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Unable to update message.' }, { status: 500 });
    return NextResponse.json({ ok: true, message: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof MailAccessError ? error.message : 'Unable to update message.' }, { status: error instanceof MailAccessError ? error.status : 500 });
  }
}
