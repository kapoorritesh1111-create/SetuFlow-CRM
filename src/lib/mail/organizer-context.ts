import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { isMailId } from './organization';

export class MailAccessError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** Never infer access from a sender address, CRM role, or mail_mailboxes.user_id. */
export async function mailOrganizerContext(request: Request) {
  const w = await getCurrentWorkspace();
  if (!w.user) throw new MailAccessError('Authentication required.', 401);
  if (!w.organization || !w.membership) throw new MailAccessError('Active workspace required.', 403);
  const db = (await createClient()) as any;
  const organizationId = w.organization.id;
  const userId = w.user.id;
  const requestedId = new URL(request.url).searchParams.get('mailboxId');
  if (requestedId !== null && !isMailId(requestedId)) throw new MailAccessError('Choose a valid mailbox.', 400);
  const [grant, product] = await Promise.all([
    db.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    db.from('organization_member_product_access').select('mail_enabled').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle(),
  ]);
  if (grant.error || product.error) throw new MailAccessError('Unable to verify mail access.', 503);
  if (!grant.data?.enabled || product.data?.mail_enabled === false) throw new MailAccessError('Setu Mail access is not enabled.', 403);
  const mailbox = requestedId
    ? (await db.from('mail_mailboxes').select('id,address,status').eq('id', requestedId).eq('organization_id', organizationId).eq('status', 'active').maybeSingle()).data
    : await resolveUserMailbox(db, organizationId, userId, 'id,address,status');
  if (!mailbox) throw new MailAccessError('No accessible mailbox was found.', 404);
  const access = await db.from('mail_mailbox_access').select('can_read,can_send,can_manage').eq('mailbox_id', mailbox.id).eq('organization_id', organizationId).eq('user_id', userId).maybeSingle();
  if (access.error) throw new MailAccessError('Unable to verify mailbox permissions.', 503);
  if (!access.data?.can_read) throw new MailAccessError('You do not have access to this mailbox.', 403);
  return { db, organizationId, userId, mailbox, canSend: access.data.can_send === true, canManage: access.data.can_manage === true, canMove: access.data.can_send === true || access.data.can_manage === true };
}

export const MAIL_MESSAGE_FIELDS = 'id,thread_id,direction,status,folder,custom_folder_id,from_address,to_addresses,cc_addresses,bcc_addresses,subject,text_body,is_read,is_starred,archived_at,trashed_at,draft_saved_at,message_id_header,in_reply_to,reference_headers,created_at,updated_at,sent_at,received_at';
