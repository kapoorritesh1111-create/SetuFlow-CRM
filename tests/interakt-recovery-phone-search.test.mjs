import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('src/features/integrations/interakt/server.ts', 'utf8');
const workspace = fs.readFileSync('src/features/integrations/interakt/workspace-read.ts', 'utf8');
const assignments = fs.readFileSync('src/features/integrations/interakt/assignment-management.ts', 'utf8');

test('Interakt staging refresh includes a rolling recovery window', () => {
  assert.match(server, /recoveryModifiedAfter/);
  assert.match(server, /90 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(server, /collectModifiedContacts\(recoveryModifiedAfter\)/);
  assert.match(server, /contactsById\.set\(contact\.externalContactId, contact\)/);
});

test('Inbound phone search tolerates local leading zero and +91 storage', () => {
  for (const source of [workspace, assignments]) {
    assert.match(source, /normalizedPhoneSearchTerms/);
    assert.match(source, /digits\.startsWith\('0'\)/);
    assert.match(source, /digits\.startsWith\('91'\)/);
    assert.match(source, /full_phone_number\.ilike/);
    assert.match(source, /phone_number\.ilike/);
  }
});
