import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const conversation = fs.readFileSync('src/features/integrations/interakt/shared-inbound-conversation.ts','utf8');

test('IndiaMART grouped buyer history includes all same-phone enquiry events', () => {
  assert.match(conversation, /relatedRows\.filter/);
  assert.match(conversation, /message_type: queryType === 'P' \? 'Buyer Call' : 'Inquiry'/);
  assert.match(conversation, /indiamart:\$\{row\.id\}:enquiry/);
});
