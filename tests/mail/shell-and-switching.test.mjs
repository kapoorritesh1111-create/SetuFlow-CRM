import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('mailbox resolution uses an access-validated active mailbox cookie before primary assignment', () => {
  const source = read('src/lib/mail/resolve-user-mailbox.ts');
  assert.match(source, /ACTIVE_MAILBOX_COOKIE/);
  assert.match(source, /cookies\(\)\.get\(ACTIVE_MAILBOX_COOKIE\)/);
  assert.match(source, /listUserMailboxes/);
  assert.match(source, /mail_mailbox_access/);
  assert.match(source, /options\.mailboxId\s*\?\s*mailboxes\.find/);
  assert.match(source, /cookieId[\s\S]*mailboxes\[0\]/);
  assert.doesNotMatch(source, /mail_mailboxes\.user_id/);
});

test('active mailbox endpoint verifies product and mailbox access before setting an httpOnly preference', () => {
  const source = read('src/app/api/mail/active-mailbox/route.ts');
  assert.match(source, /org_module_grants/);
  assert.match(source, /organization_member_product_access/);
  assert.match(source, /target\?\.can_read/);
  assert.match(source, /httpOnly: true/);
  assert.match(source, /NextResponse\.redirect\(new URL\('\/mail'/);
});

test('send honors an explicit active mailbox and requires send permission for the selected From identity', () => {
  const source = read('src/app/api/mail/send/route.ts');
  assert.match(source, /requestedMailboxId/);
  assert.match(source, /isMailId\(requestedMailboxId\)/);
  assert.match(source, /mailboxId: requestedMailboxId, permission: 'send'/);
  assert.match(source, /You do not have sending access to this mailbox/);
});

test('mail routes through a dedicated Outlook-familiar product shell while CRM routes keep AppShell', () => {
  const router = read('src/components/layout/authenticated-shell-router.tsx');
  const layout = read('src/app/(app)/layout.tsx');
  assert.match(router, /pathname === '\/mail'/);
  assert.match(router, /<MailProductShell/);
  assert.match(router, /<AppShell \{\.\.\.props\} \/>/);
  assert.match(layout, /AuthenticatedShellRouter/);
});

test('mail product shell exposes functional app launcher, future Calendar, mailbox switching and gated CRM destinations', () => {
  const source = read('src/components/layout/mail-product-shell.tsx');
  assert.match(source, /Setu Mail/);
  assert.match(source, /Search Setu Mail/);
  assert.match(source, /Switch mailbox/);
  assert.match(source, /aria-expanded=\{appsOpen\}/);
  assert.match(source, /Setu apps menu/);
  assert.match(source, /Calendar — coming next/);
  assert.match(source, /Setu Flow CRM/);
  assert.match(source, /crmEnabled: false/);
  assert.match(source, /access\.crmEnabled/);
  assert.match(source, /target\.tabIndex = -1/);
  assert.match(source, /href="\/profile"/);
  assert.match(source, /function CrmProductIcon/);
  assert.match(source, /src="\/logos\/setu-flow-logo\.svg"/);
  assert.doesNotMatch(source, /AppWindow/);
  assert.doesNotMatch(source, /Microsoft|Outlook/);
});

test('desktop mail workspace is full-height and removes the duplicate in-pane search visual', () => {
  const source = read('src/app/(app)/mail/mail-premium.module.css');
  assert.match(source, /height: calc\(100vh - 48px\) !important/);
  assert.match(source, /border-radius: 0 !important/);
  assert.match(source, /clip-path: inset\(50%\)/);
  assert.match(read('src/components/layout/mail-product-shell.module.css'), /flex-shrink: 0/);
});
