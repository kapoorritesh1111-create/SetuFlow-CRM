import { NextRequest, NextResponse } from 'next/server';
import { mailOrganizerContext, MailAccessError } from '@/lib/mail/organizer-context';

export const dynamic = 'force-dynamic';
const FOLDERS = new Set(['inbox','sent','drafts','starred','archive','trash','junk']);
function fail(error: unknown) {
  if (error instanceof MailAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: 'Unable to search Setu Mail.' }, { status: 500 });
}
export async function GET(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
    const requestedFolder = request.nextUrl.searchParams.get('folder');
    const folder = requestedFolder && requestedFolder !== 'all' ? requestedFolder : null;
    if (folder && !FOLDERS.has(folder)) return NextResponse.json({ error: 'Choose a valid mail folder.' }, { status: 400 });
    if (q.length > 300) return NextResponse.json({ error: 'Search must be 300 characters or shorter.' }, { status: 400 });
    const beforeAt = request.nextUrl.searchParams.get('beforeAt');
    const beforeId = request.nextUrl.searchParams.get('beforeId');
    if (Boolean(beforeAt) !== Boolean(beforeId)) return NextResponse.json({ error: 'The mail page cursor is incomplete.' }, { status: 400 });
    const limit = Math.max(10, Math.min(100, Number(request.nextUrl.searchParams.get('limit') ?? 50) || 50));
    const { data, error } = await ctx.db.rpc('mail_search_messages', {
      p_organization_id: ctx.organizationId,
      p_mailbox_id: ctx.mailbox.id,
      p_folder: folder,
      p_query: q,
      p_before_at: beforeAt || null,
      p_before_id: beforeId || null,
      p_limit: limit + 1,
    });
    if (error) {
      console.error('mail.search.failed', { mailboxId: ctx.mailbox.id, code: error.code ?? 'unknown' });
      return NextResponse.json({ error: 'Unable to search or load older messages.' }, { status: 503 });
    }
    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit);
    const tail = messages[messages.length - 1];
    return NextResponse.json({ messages, nextCursor: hasMore && tail ? { beforeAt: tail.created_at, beforeId: tail.id } : null, scope: q ? 'mailbox' : folder ?? 'mailbox' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return fail(error); }
}
