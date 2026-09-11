import { NextRequest, NextResponse } from 'next/server';
import { mailOrganizerContext, MailAccessError, MAIL_MESSAGE_FIELDS } from '@/lib/mail/organizer-context';
import { isMailId } from '@/lib/mail/organization';
import { sanitizeMailHtml } from '@/lib/mail/safe-html';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof MailAccessError ? error.message : 'Unable to update message.' }, { status: error instanceof MailAccessError ? error.status : 500 });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await mailOrganizerContext(request);
    if (!isMailId(params.id)) return NextResponse.json({ error: 'Invalid message id.' }, { status: 400 });
    const [message, attachments] = await Promise.all([
      ctx.db.from('mail_messages').select(MAIL_MESSAGE_FIELDS).eq('id', params.id).eq('organization_id', ctx.organizationId).eq('mailbox_id', ctx.mailbox.id).maybeSingle(),
      ctx.db.from('mail_attachments').select('id,message_id,filename,content_type,size_bytes,created_at').eq('message_id', params.id).eq('organization_id', ctx.organizationId).eq('mailbox_id', ctx.mailbox.id),
    ]);
    if (message.error || attachments.error) return NextResponse.json({ error: 'Unable to load the complete message. Please try again.' }, { status: 503 });
    if (!message.data) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    const safeMessage = { ...message.data, html_body: sanitizeMailHtml(message.data.html_body) || null };
    return NextResponse.json({ message: safeMessage, attachments: attachments.data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await mailOrganizerContext(request);
    if (!ctx.canMove) return NextResponse.json({ error: 'This mailbox is read-only for your account.' }, { status: 403 });
    if (!isMailId(params.id)) return NextResponse.json({ error: 'Invalid message id.' }, { status: 400 });
    const { db, organizationId, mailbox } = ctx;
    const { data: message, error: readError } = await db.from('mail_messages').select('id,direction,status,folder').eq('id', params.id).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).maybeSingle();
    if (readError) return NextResponse.json({ error: 'Unable to load message.' }, { status: 500 });
    if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    let action = String(body?.action ?? '').trim();
    let value = body?.value;
    // Preserve the existing mobile boolean action contract.
    if (!action) for (const key of ['read', 'star', 'archive', 'trash']) {
      if (typeof body?.[key] === 'boolean') { action = key; value = body[key]; break; }
    }
    if (!['read', 'star', 'archive', 'trash'].includes(action) || (value !== undefined && typeof value !== 'boolean')) return NextResponse.json({ error: 'Choose a valid message action and boolean value.' }, { status: 400 });
    const enabled = value !== false;
    if (action === 'archive' && message.status === 'draft') return NextResponse.json({ error: 'Drafts can be edited or moved to Trash, not archived.' }, { status: 409 });
    const now = new Date().toISOString();
    const restoreFolder = message.status === 'draft' ? 'drafts' : message.direction === 'outbound' ? 'sent' : 'inbox';
    let patch: Record<string, unknown> = { updated_at: now };
    if (action === 'read') patch.is_read = enabled;
    else if (action === 'star') patch.is_starred = enabled;
    else if (action === 'archive') patch = { ...patch, custom_folder_id: null, archived_at: enabled ? now : null, trashed_at: null, folder: enabled ? 'archive' : restoreFolder };
    else if (action === 'trash') patch = { ...patch, custom_folder_id: null, trashed_at: enabled ? now : null, archived_at: null, folder: enabled ? 'trash' : restoreFolder };
    const { data, error } = await db.from('mail_messages').update(patch).eq('id', params.id).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).eq('status', message.status).select(MAIL_MESSAGE_FIELDS).maybeSingle();
    if (error) return NextResponse.json({ error: 'Unable to update message.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'The message changed. Refresh mail and try again.' }, { status: 409 });
    return NextResponse.json({ ok: true, message: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
