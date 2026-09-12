import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { ACTIVE_MAILBOX_COOKIE, listUserMailboxes } from '@/lib/mail/resolve-user-mailbox';
import { isMailId } from '@/lib/mail/organization';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.redirect(new URL('/login', request.url), 303);
  if (!workspace.organization || !workspace.membership) return NextResponse.redirect(new URL('/dashboard', request.url), 303);

  const mailboxId = request.nextUrl.searchParams.get('mailboxId');
  const messageId = request.nextUrl.searchParams.get('messageId');
  if (!isMailId(mailboxId) || !isMailId(messageId)) return NextResponse.redirect(new URL('/mail', request.url), 303);

  const db = (await createClient()) as any;
  const mailboxes = await listUserMailboxes(db, workspace.organization.id, workspace.user.id);
  const target = mailboxes.find(mailbox => mailbox.id === mailboxId && mailbox.can_read);
  if (!target) return NextResponse.redirect(new URL('/mail', request.url), 303);

  const { data: message } = await db.from('mail_messages')
    .select('id')
    .eq('id', messageId)
    .eq('organization_id', workspace.organization.id)
    .eq('mailbox_id', mailboxId)
    .maybeSingle();
  if (!message) return NextResponse.redirect(new URL('/mail', request.url), 303);

  const response = NextResponse.redirect(new URL(`/mail/message/${encodeURIComponent(messageId)}`, request.url), 303);
  response.cookies.set(ACTIVE_MAILBOX_COOKIE, mailboxId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
