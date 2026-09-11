import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mailOrganizerContext, MailAccessError } from '@/lib/mail/organizer-context';

export const dynamic = 'force-dynamic';
const Input = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(100),
  junk: z.boolean(),
  senderPolicy: z.enum(['trusted','blocked']).nullable().optional(),
});
function fail(error: unknown) {
  if (error instanceof MailAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: 'Unable to change Junk status.' }, { status: 500 });
}
export async function POST(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    if (!ctx.canMove) return NextResponse.json({ error: 'This mailbox is read-only for your account.' }, { status: 403 });
    const parsed = Input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Choose valid received messages.' }, { status: 400 });
    const { messageIds, junk, senderPolicy = null } = parsed.data;
    if (senderPolicy && !ctx.canManage) return NextResponse.json({ error: 'Mailbox management permission is required to trust or block a sender.' }, { status: 403 });
    if (senderPolicy === 'trusted' && junk) return NextResponse.json({ error: 'Trust sender is available with Not junk.' }, { status: 400 });
    if (senderPolicy === 'blocked' && !junk) return NextResponse.json({ error: 'Block sender is available when marking Junk.' }, { status: 400 });
    const messages: any[] = [], failures: Array<{ id: string; error: string }> = [];
    for (const id of [...new Set(messageIds)]) {
      const { data, error } = await ctx.db.rpc('mail_set_junk', { p_organization_id: ctx.organizationId, p_mailbox_id: ctx.mailbox.id, p_message_id: id, p_junk: junk, p_sender_policy: senderPolicy });
      if (error || !data) failures.push({ id, error: error?.message || 'Unable to update message.' });
      else messages.push(data);
    }
    const status = messages.length ? 200 : 409;
    return NextResponse.json({ ok: failures.length === 0, messages, failures }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return fail(error); }
}
