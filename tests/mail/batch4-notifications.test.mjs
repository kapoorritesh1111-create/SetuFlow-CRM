import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');

test('inbound Mail notifies assigned readers without legacy mailbox ownership', () => {
  const webhook = read('src/app/api/mail/webhooks/resend/route.ts');
  assert.match(webhook, /dispatchCommunicationNotification/);
  assert.match(webhook, /from\('mail_mailbox_access'\)/);
  assert.match(webhook, /eq\('can_read', true\)/);
  assert.match(webhook, /from\('organization_members'\)/);
  assert.match(webhook, /eq\('is_active', true\)/);
  assert.doesNotMatch(webhook, /mailbox\.user_id/);
  assert.match(webhook, /type: 'mail_received'/);
  assert.match(webhook, /\/api\/mail\/open\?mailboxId=/);
  assert.match(webhook, /\['junk', 'spam', 'trash'\]/);
});

test('Mail notification click-through validates assignment and switches the active mailbox', () => {
  const open = read('src/app/api/mail/open/route.ts');
  assert.match(open, /listUserMailboxes/);
  assert.match(open, /mailbox\.id === mailboxId && mailbox\.can_read/);
  assert.match(open, /from\('mail_messages'\)/);
  assert.match(open, /ACTIVE_MAILBOX_COOKIE/);
  assert.match(open, /\/mail\/message\//);
  const message = read('src/app/(app)/mail/message/[id]/page.tsx');
  assert.match(message, /listUserMailboxes/);
  assert.match(message, /mailbox\.id === message\.mailbox_id && mailbox\.can_read/);
  assert.match(message, /is_read: true/);
});

test('Communications shell exposes product-scoped notification bell and unread Mail badge', () => {
  const shell = read('src/components/layout/mail-product-shell.tsx');
  const active = read('src/app/api/mail/active-mailbox/route.ts');
  assert.match(shell, /CommunicationNotifications/);
  assert.match(shell, /MobileCommunicationsChrome[^>]*organizationId=\{organizationId\}[^>]*userId=\{userId\}/);
  assert.match(shell, /unreadMailCount/);
  assert.match(shell, /badge=\{access\.unreadMailCount\}/);
  assert.match(shell, /setInterval\(loadAccess,30000\)/);
  assert.match(active, /unreadMailCount/);
  assert.match(active, /eq\('direction', 'inbound'\)/);
  assert.match(active, /eq\('is_read', false\)/);
  assert.match(active, /not\('folder', 'in', '\(junk,spam,trash\)'\)/);
});

test('Communications notification dispatcher honors preferences and deduplicates by entity reference', () => {
  const service = read('src/lib/notifications/communication-notification-service.ts');
  assert.match(service, /get_effective_notif_pref/);
  assert.match(service, /p_channel: channel/);
  assert.match(service, /eq\('entity_ref', input\.entityRef\)/);
  assert.match(service, /sendWebPushToUsers/);
  assert.match(service, /\}, input\.organizationId\)/);
  assert.match(service, /channels_sent/);
  const migration = read('supabase/migrations/20260912024500_s41_batch4_communications_notifications.sql');
  assert.match(migration, /'mail_received'/);
  assert.match(migration, /'calendar_reminder'/);
  assert.match(migration, /true,\s*true,\s*false/);
});
