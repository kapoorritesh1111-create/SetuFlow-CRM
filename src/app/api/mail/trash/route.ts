import { NextRequest, NextResponse } from 'next/server';
import { mailOrganizerContext, MailAccessError } from '@/lib/mail/organizer-context';
import { isMailId } from '@/lib/mail/organization';

export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  if (error instanceof MailAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: 'Unable to update Trash.' }, { status: 500 });
}

/** Permanently delete one Trash message or empty the active mailbox Trash. */
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    if (!ctx.canMove) return NextResponse.json({ error: 'This mailbox is read-only for your account.' }, { status: 403 });
    const messageId = String(request.nextUrl.searchParams.get('messageId') || '').trim();
    if (messageId && !isMailId(messageId)) return NextResponse.json({ error: 'Choose a valid Trash message.' }, { status: 400 });

    let query = ctx.db.from('mail_messages')
      .delete({ count: 'exact' })
      .eq('organization_id', ctx.organizationId)
      .eq('mailbox_id', ctx.mailbox.id)
      .eq('folder', 'trash');
    if (messageId) query = query.eq('id', messageId);
    const { error, count } = await query;
    if (error) return NextResponse.json({ error: 'Unable to permanently delete Trash messages.' }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: Number(count || 0) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return failure(error);
  }
}
