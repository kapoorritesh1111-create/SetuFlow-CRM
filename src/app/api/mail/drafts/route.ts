import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mailOrganizerContext, MailAccessError, MAIL_MESSAGE_FIELDS } from '@/lib/mail/organizer-context';
import { isMailId } from '@/lib/mail/organization';

export const dynamic = 'force-dynamic';
const Input = z.object({
  id: z.string().uuid().nullable().optional(),
  to: z.array(z.string().max(320)).max(100).default([]),
  cc: z.array(z.string().max(320)).max(100).default([]),
  bcc: z.array(z.string().max(320)).max(100).default([]),
  subject: z.string().max(998).default(''), text: z.string().max(100000).default(''),
  threadId: z.string().uuid().nullable().optional(),
});
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof MailAccessError ? error.message : 'Unable to save draft.' }, { status: error instanceof MailAccessError ? error.status : 500 });
}
export async function POST(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    if (!ctx.canSend) return NextResponse.json({ error: 'Sending permission is required to edit drafts.' }, { status: 403 });
    const parsed = Input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'The draft contains invalid or oversized fields.' }, { status: 400 });
    const body = parsed.data;
    if (body.threadId) {
      const thread = await ctx.db.from('mail_threads').select('id').eq('id', body.threadId).eq('organization_id', ctx.organizationId).eq('mailbox_id', ctx.mailbox.id).maybeSingle();
      if (thread.error) return NextResponse.json({ error: 'Unable to verify the draft conversation.' }, { status: 503 });
      if (!thread.data) return NextResponse.json({ error: 'Conversation not found in this mailbox.' }, { status: 404 });
    }
    const now = new Date().toISOString();
    const payload = { organization_id: ctx.organizationId, mailbox_id: ctx.mailbox.id, thread_id: body.threadId || null, direction: 'outbound', status: 'draft', folder: 'drafts', from_address: ctx.mailbox.address, to_addresses: body.to, cc_addresses: body.cc, bcc_addresses: body.bcc, subject: body.subject, text_body: body.text, html_body: null, is_read: true, draft_saved_at: now, updated_at: now };
    const query = body.id
      ? ctx.db.from('mail_messages').update(payload).eq('id', body.id).eq('organization_id', ctx.organizationId).eq('mailbox_id', ctx.mailbox.id).eq('status', 'draft').eq('folder', 'drafts')
      : ctx.db.from('mail_messages').insert(payload);
    const { data, error } = await query.select(MAIL_MESSAGE_FIELDS).maybeSingle();
    if (error) return NextResponse.json({ error: 'Unable to save draft. Your message is still open.' }, { status: 500 });
    // A stale autosave must never resurrect a trashed draft or overwrite a sent message.
    if (!data) return NextResponse.json({ error: 'This draft was sent or moved to Trash. Refresh before editing it.' }, { status: 409 });
    return NextResponse.json({ ok: true, draft: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    if (!ctx.canMove) return NextResponse.json({ error: 'This mailbox is read-only.' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!isMailId(id)) return NextResponse.json({ error: 'A valid draft id is required.' }, { status: 400 });
    const { data, error } = await ctx.db.from('mail_messages').delete().eq('id', id).eq('organization_id', ctx.organizationId).eq('mailbox_id', ctx.mailbox.id).eq('status', 'draft').select('id').maybeSingle();
    if (error) return NextResponse.json({ error: 'Unable to delete draft.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
