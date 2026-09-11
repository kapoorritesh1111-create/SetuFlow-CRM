import { NextRequest, NextResponse } from 'next/server';
import { MailAccessError, mailOrganizerContext, MAIL_MESSAGE_FIELDS } from '@/lib/mail/organizer-context';
import { folderName, isMailId, MailInputError, movePatch, validateRule } from '@/lib/mail/organization';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  if (error instanceof MailAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof MailInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  const code = (error as { code?: string })?.code;
  if (code === '23505') return NextResponse.json({ error: 'A folder with that name already exists in this mailbox.' }, { status: 409 });
  if (code === '23503') return NextResponse.json({ error: 'Move the messages out and remove any rules using this folder before deleting it.' }, { status: 409 });
  if (code === '23514') return NextResponse.json({ error: 'Check the folder name, rule settings, or mailbox folder/rule limit.' }, { status: 400 });
  console.error('mail.organizer.failed', { code: code ?? 'unknown' });
  return NextResponse.json({ error: 'Unable to update mail organization. Please try again.' }, { status: 500 });
}
function requireId(value: unknown): string {
  if (!isMailId(value)) throw new MailInputError('Choose a valid item.');
  return value;
}
export async function GET(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    const { db, organizationId, mailbox } = ctx;
    const folderId = request.nextUrl.searchParams.get('folderId');
    if (folderId !== null) {
      requireId(folderId);
      const offsetText = request.nextUrl.searchParams.get('offset') ?? '0';
      if (!/^\d{1,7}$/.test(offsetText)) throw new MailInputError('Choose a valid page.');
      const offset = Number(offsetText);
      const folder = await db.from('mail_folders').select('id,name').eq('id', folderId).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).maybeSingle();
      if (folder.error) throw folder.error;
      if (!folder.data) throw new MailAccessError('Folder not found in this mailbox.', 404);
      const result = await db.from('mail_messages').select(MAIL_MESSAGE_FIELDS, { count: 'exact' }).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).eq('custom_folder_id', folderId).eq('folder', 'custom').order('created_at', { ascending: false }).order('id').range(offset, offset + 99);
      if (result.error) throw result.error;
      const ids = (result.data ?? []).map((message: { id: string }) => message.id);
      const attachments = ids.length ? await db.from('mail_attachments').select('id,message_id,filename,content_type,size_bytes,created_at').eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).in('message_id', ids).order('created_at') : { data: [], error: null };
      if (attachments.error) throw attachments.error;
      return NextResponse.json({ folder: folder.data, messages: result.data ?? [], attachments: attachments.data ?? [], total: result.count ?? 0, nextOffset: offset + 100 < Number(result.count) ? offset + 100 : null });
    }
    const [folders, rules] = await Promise.all([
      db.rpc('mail_folder_counts', { p_organization_id: organizationId, p_mailbox_id: mailbox.id }),
      db.from('mail_rules').select('id,name,enabled,priority,conditions,actions,target_folder_id,created_at').eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).order('priority').order('created_at').order('id'),
    ]);
    if (folders.error || rules.error) throw folders.error || rules.error;
    return NextResponse.json({ mailboxId: mailbox.id, folders: folders.data ?? [], rules: rules.data ?? [], canManage: ctx.canManage, canMove: ctx.canMove });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    const { db, organizationId, userId, mailbox } = ctx;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MailInputError('Enter valid mail organization details.');
    const action = String(body.action ?? '');
    if (action === 'moveMessage' ? !ctx.canMove : !ctx.canManage) throw new MailAccessError(action === 'moveMessage' ? 'This mailbox is read-only for your account.' : 'Mailbox management permission is required.', 403);
    const now = new Date().toISOString();
    if (action === 'moveMessage') {
      const id = requireId(body.id);
      if (body.folderId !== null && !isMailId(body.folderId)) throw new MailInputError('Choose a destination folder.');
      const message = await db.from('mail_messages').select('id,status,direction').eq('id', id).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).maybeSingle();
      if (message.error) throw message.error;
      if (!message.data) throw new MailAccessError('Message not found in this mailbox.', 404);
      if (body.folderId) {
        const folder = await db.from('mail_folders').select('id').eq('id', body.folderId).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).maybeSingle();
        if (folder.error) throw folder.error;
        if (!folder.data) throw new MailAccessError('Destination folder not found in this mailbox.', 404);
      }
      const patch = movePatch(message.data, body.folderId);
      const result = await db.from('mail_messages').update({ ...patch, updated_at: now }).eq('id', id).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).neq('status', 'draft').select(MAIL_MESSAGE_FIELDS).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new MailAccessError('The message changed. Refresh mail and try again.', 409);
      return NextResponse.json({ ok: true, message: result.data });
    }
    if (action === 'createFolder' || action === 'renameFolder') {
      const name = folderName(body.name);
      if (action === 'createFolder') {
        const total = await db.from('mail_folders').select('id', { head: true, count: 'exact' }).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id);
        if (total.error) throw total.error;
        if (Number(total.count) >= 50) throw new MailAccessError('This mailbox supports up to 50 custom folders.', 409);
      }
      const query = action === 'createFolder'
        ? db.from('mail_folders').insert({ organization_id: organizationId, mailbox_id: mailbox.id, user_id: userId, ...name })
        : db.from('mail_folders').update({ ...name, updated_at: now }).eq('id', requireId(body.id)).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id);
      const result = await query.select('id,name').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new MailAccessError('Folder not found.', 404);
      return NextResponse.json({ ok: true, folder: result.data });
    }
    if (action === 'deleteFolder') {
      const result = await db.from('mail_folders').delete().eq('id', requireId(body.id)).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).select('id').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new MailAccessError('Folder not found.', 404);
      return NextResponse.json({ ok: true });
    }
    if (action === 'createRule' || action === 'updateRule') {
      const rule = validateRule(body.rule);
      if (rule.target_folder_id) {
        const target = await db.from('mail_folders').select('id').eq('id', rule.target_folder_id).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).maybeSingle();
        if (target.error) throw target.error;
        if (!target.data) throw new MailAccessError('Choose a folder in this mailbox.', 400);
      }
      if (action === 'createRule') {
        const total = await db.from('mail_rules').select('id', { head: true, count: 'exact' }).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id);
        if (total.error) throw total.error;
        if (Number(total.count) >= 100) throw new MailAccessError('This mailbox supports up to 100 rules.', 409);
      }
      const query = action === 'createRule'
        ? db.from('mail_rules').insert({ organization_id: organizationId, mailbox_id: mailbox.id, user_id: userId, ...rule })
        : db.from('mail_rules').update({ ...rule, updated_at: now }).eq('id', requireId(body.id)).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id);
      const result = await query.select('id,name,enabled,priority,conditions,actions,target_folder_id,created_at').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new MailAccessError('Rule not found.', 404);
      return NextResponse.json({ ok: true, rule: result.data });
    }
    if (action === 'deleteRule') {
      const result = await db.from('mail_rules').delete().eq('id', requireId(body.id)).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).select('id').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new MailAccessError('Rule not found.', 404);
      return NextResponse.json({ ok: true });
    }
    throw new MailInputError('This mail organization action is not supported.');
  } catch (error) { return failure(error); }
}
