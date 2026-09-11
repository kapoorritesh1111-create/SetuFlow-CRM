import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLEAN_BUCKET = 'setu-mail-attachments';
const QUARANTINE_BUCKET = 'setu-mail-quarantine';
const BATCH_LIMIT = 500;
const CRON_SECRET = process.env.CRON_SECRET;

type AttachmentRow = {
  id: string;
  storage_path: string | null;
  quarantine_storage_path: string | null;
};

function authorized(request: NextRequest) {
  if (!CRON_SECRET) return false;
  return request.headers.get('authorization') === `Bearer ${CRON_SECRET}`;
}

function cutoff(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

async function removeAttachmentObjects(admin: any, rows: AttachmentRow[]) {
  const clean = rows.map(row => row.storage_path).filter((value): value is string => Boolean(value));
  const quarantine = rows.map(row => row.quarantine_storage_path).filter((value): value is string => Boolean(value));
  const errors: string[] = [];
  if (clean.length) {
    const { error } = await admin.storage.from(CLEAN_BUCKET).remove(clean);
    if (error) errors.push(`clean:${error.message}`);
  }
  if (quarantine.length) {
    const { error } = await admin.storage.from(QUARANTINE_BUCKET).remove(quarantine);
    if (error) errors.push(`quarantine:${error.message}`);
  }
  return errors;
}

async function purgeAttachmentRows(admin: any, rows: AttachmentRow[]) {
  if (!rows.length) return { deleted: 0, errors: [] as string[] };
  const storageErrors = await removeAttachmentObjects(admin, rows);
  if (storageErrors.length) return { deleted: 0, errors: storageErrors };
  const ids = rows.map(row => row.id);
  const { error } = await admin.from('mail_attachments').delete().in('id', ids);
  return { deleted: error ? 0 : ids.length, errors: error ? [error.message] : [] };
}

async function runPolicy(admin: any, policy: any) {
  const organizationId = policy.organization_id;
  const summary = {
    trashMessagesDeleted: 0,
    quarantineAttachmentsDeleted: 0,
    orphanAttachmentsDeleted: 0,
    emptyThreadsDeleted: 0,
    capped: false,
    errors: [] as string[],
  };

  const trashBefore = cutoff(Number(policy.trash_retention_days ?? 30));
  const { data: trashMessages, error: trashError } = await admin.from('mail_messages')
    .select('id,thread_id')
    .eq('organization_id', organizationId)
    .eq('folder', 'trash')
    .lt('trashed_at', trashBefore)
    .order('trashed_at', { ascending: true })
    .limit(BATCH_LIMIT);
  if (trashError) summary.errors.push(`trash-select:${trashError.message}`);
  const messages = trashMessages ?? [];
  if (messages.length === BATCH_LIMIT) summary.capped = true;

  if (messages.length) {
    const messageIds = messages.map((message: any) => message.id);
    const threadIds = Array.from(new Set(messages.map((message: any) => message.thread_id).filter(Boolean))) as string[];
    const { data: attached, error: attachmentError } = await admin.from('mail_attachments')
      .select('id,storage_path,quarantine_storage_path')
      .eq('organization_id', organizationId)
      .in('message_id', messageIds);
    if (attachmentError) summary.errors.push(`trash-attachments:${attachmentError.message}`);
    else {
      const storageErrors = await removeAttachmentObjects(admin, attached ?? []);
      summary.errors.push(...storageErrors.map(error => `trash-storage:${error}`));
      if (!storageErrors.length) {
        const { error: deleteAttachmentError } = await admin.from('mail_attachments').delete().eq('organization_id', organizationId).in('message_id', messageIds);
        if (deleteAttachmentError) summary.errors.push(`trash-attachment-delete:${deleteAttachmentError.message}`);
        else {
          const { error: deleteMessageError } = await admin.from('mail_messages').delete().eq('organization_id', organizationId).in('id', messageIds).eq('folder', 'trash');
          if (deleteMessageError) summary.errors.push(`trash-message-delete:${deleteMessageError.message}`);
          else summary.trashMessagesDeleted = messageIds.length;
        }
      }
    }

    if (!summary.errors.length && threadIds.length) {
      for (const threadId of threadIds) {
        const { count, error } = await admin.from('mail_messages').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('thread_id', threadId);
        if (error) { summary.errors.push(`thread-check:${error.message}`); continue; }
        if (Number(count ?? 0) === 0) {
          const { error: deleteThreadError } = await admin.from('mail_threads').delete().eq('organization_id', organizationId).eq('id', threadId);
          if (deleteThreadError) summary.errors.push(`thread-delete:${deleteThreadError.message}`);
          else summary.emptyThreadsDeleted += 1;
        }
      }
    }
  }

  const quarantineBefore = cutoff(Number(policy.quarantine_retention_days ?? 30));
  const { data: quarantineRows, error: quarantineError } = await admin.from('mail_attachments')
    .select('id,storage_path,quarantine_storage_path')
    .eq('organization_id', organizationId)
    .in('security_status', ['quarantined','scan_error'])
    .lt('quarantined_at', quarantineBefore)
    .order('quarantined_at', { ascending: true })
    .limit(BATCH_LIMIT);
  if (quarantineError) summary.errors.push(`quarantine-select:${quarantineError.message}`);
  else {
    if ((quarantineRows ?? []).length === BATCH_LIMIT) summary.capped = true;
    const result = await purgeAttachmentRows(admin, quarantineRows ?? []);
    summary.quarantineAttachmentsDeleted = result.deleted;
    summary.errors.push(...result.errors.map(error => `quarantine-delete:${error}`));
  }

  const orphanBefore = cutoff(Number(policy.orphan_attachment_retention_days ?? 7));
  const { data: orphanRows, error: orphanError } = await admin.from('mail_attachments')
    .select('id,storage_path,quarantine_storage_path')
    .eq('organization_id', organizationId)
    .is('message_id', null)
    .lt('created_at', orphanBefore)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);
  if (orphanError) summary.errors.push(`orphan-select:${orphanError.message}`);
  else {
    if ((orphanRows ?? []).length === BATCH_LIMIT) summary.capped = true;
    const result = await purgeAttachmentRows(admin, orphanRows ?? []);
    summary.orphanAttachmentsDeleted = result.deleted;
    summary.errors.push(...result.errors.map(error => `orphan-delete:${error}`));
  }

  const status = summary.errors.length ? (summary.trashMessagesDeleted || summary.quarantineAttachmentsDeleted || summary.orphanAttachmentsDeleted ? 'partial' : 'failed') : (summary.capped ? 'partial' : 'ok');
  await admin.from('mail_retention_policies').update({
    last_run_at: new Date().toISOString(),
    last_run_status: status,
    last_run_summary: summary,
    updated_at: new Date().toISOString(),
  }).eq('organization_id', organizationId);
  return { organizationId, status, ...summary };
}

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: 'Cron not configured - CRON_SECRET missing on server.' }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized Mail retention request.' }, { status: 401 });
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ ok: false, error: 'Database admin client unavailable.' }, { status: 503 });

  const { data: policies, error } = await admin.from('mail_retention_policies').select('*').eq('enabled', true).limit(1000);
  if (error) return NextResponse.json({ ok: false, error: 'Unable to load Mail retention policies.' }, { status: 500 });

  const results = [];
  for (const policy of policies ?? []) {
    try {
      results.push(await runPolicy(admin, policy));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Retention policy failed.';
      console.error('[setu-mail:retention] policy failed', { organizationId: policy.organization_id, error: message });
      await admin.from('mail_retention_policies').update({ last_run_at: new Date().toISOString(), last_run_status: 'failed', last_run_summary: { errors: [message] }, updated_at: new Date().toISOString() }).eq('organization_id', policy.organization_id);
      results.push({ organizationId: policy.organization_id, status: 'failed', errors: [message] });
    }
  }

  return NextResponse.json({ ok: results.every(result => result.status === 'ok'), organizations: results.length, results });
}
