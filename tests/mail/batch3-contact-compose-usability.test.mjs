import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');

test('received Mail can explicitly create a Contact without creating a Lead', () => {
  const route = read('src/app/api/mail/intelligence/[id]/route.ts');
  assert.match(route, /Save sender to Contacts/);
  assert.match(route, /Create contact/);
  assert.match(route, /message\.direction\s*===\s*'inbound'/);
  assert.match(route, /!identity\.contact/);
  assert.match(route, /\/contacts\?create=1&email=/);
  assert.match(route, /autonomousActions:\s*false/);
});

test('compose recipient lookup includes Contacts CRM and mailbox history', () => {
  const route = read('src/app/api/mail/recipient-suggestions/route.ts');
  assert.match(route, /from\('contacts'\)/);
  assert.match(route, /from\('leads'\)/);
  assert.match(route, /from\('mail_messages'\)/);
  assert.match(route, /eq\('mailbox_id', mailbox\.id\)/);
  assert.match(route, /eq\('direction', 'outbound'\)/);
  assert.match(route, /to_addresses/);
  assert.match(route, /cc_addresses/);
  assert.match(route, /bcc_addresses/);
  assert.match(route, /slice\(0, 8\)/);
});

test('composer wires mailbox suggestions into To Cc and Bcc without dropping earlier recipients', () => {
  const ui = read('src/features/mail/components/mail-interaction-controls.tsx');
  assert.match(ui, /api\/mail\/recipient-suggestions/);
  assert.match(ui, /RecipientInput label="To"/);
  assert.match(ui, /RecipientInput label="Cc"/);
  assert.match(ui, /RecipientInput label="Bcc"/);
  assert.match(ui, /value\.lastIndexOf\(','\)/);
  assert.match(ui, /value\.slice\(0, comma \+ 1\)/);
});