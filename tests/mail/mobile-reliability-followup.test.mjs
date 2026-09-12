import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobile = readFileSync('src/features/mail/components/mobile-setu-mail-workspace.tsx', 'utf8');
const webhook = readFileSync('src/app/api/mail/webhooks/resend/route.ts', 'utf8');
const invite = readFileSync('src/app/api/mail/calendar-invite/route.ts', 'utf8');
const incomingInvite = readFileSync('src/lib/calendar/incoming-mail-invite.ts', 'utf8');
const messageDetail = readFileSync('src/app/api/mail/messages/[id]/route.ts', 'utf8');
const delivery = readFileSync('src/lib/notifications/communication-notification-service.ts', 'utf8');
const worker = readFileSync('public/setu-mail-sw.js', 'utf8');

test('mobile Inbox refreshes immediately on communication push and foreground resume', () => {
  assert.match(mobile, /SETU_MAIL_NOTIFICATION/);
  assert.match(mobile, /visibilitychange/);
  assert.match(mobile, /pageshow/);
  assert.match(mobile, /setInterval\(onVisible, 15000\)/);
  assert.match(mobile, /setReloadNonce\(value => value \+ 1\)/);
});

test('unread rows have unmistakable accent, weight and dot while read rows are de-emphasized', () => {
  assert.match(mobile, /border-l-4 border-l-accent-500 bg-info-bg/);
  assert.match(mobile, /aria-label=\"Unread\"/);
  assert.match(mobile, /message\.is_read\?'font-medium text-content-secondary':'font-black text-content-primary'/);
});

test('mobile Reader always exposes a visible 44px Back to Inbox action', () => {
  assert.match(mobile, /aria-label=\"Back to Inbox\"/);
  assert.match(mobile, /h-11 w-11/);
  assert.match(mobile, /setSelectedAttachments\(\[\]\)/);
});

test('inbound ICS survives storage MIME policy and becomes an actionable Setu Calendar invitation', () => {
  assert.match(webhook, /storageContentType = isCalendarAttachment \? 'application\/octet-stream' : contentType/);
  assert.match(invite, /source_ics_uid/);
  assert.match(invite, /security_status !== 'clean'/);
  assert.match(invite, /buildIncomingInviteReply/);
  assert.match(incomingInvite, /\['REQUEST', 'PUBLISH', 'CANCEL'\]/);
  assert.match(incomingInvite, /form\('accepted','Accept',true\)/);
  assert.match(incomingInvite, /form\('tentative','Tentative'\)/);
  assert.match(incomingInvite, /form\('declined','Decline'\)/);
  assert.match(messageDetail, /incomingInviteCardHtml/);
  assert.match(messageDetail, /Original invitation message/);
});

test('push path records zero-delivery diagnostics and worker asks for visible renotification', () => {
  assert.match(delivery, /no device delivery/);
  assert.match(delivery, /pushResult\.sent === 0/);
  assert.match(worker, /renotify: true/);
});
