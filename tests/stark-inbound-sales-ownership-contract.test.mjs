import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const assignment = fs.readFileSync('src/features/integrations/interakt/assignment-management.ts', 'utf8');
const inboundActions = fs.readFileSync('src/features/integrations/interakt/inbound-actions.ts', 'utf8');
const salesMessages = fs.readFileSync('src/features/integrations/interakt/sales-message-actions.ts', 'utf8');
const inboundPage = fs.readFileSync('src/app/(app)/leads/inbound/page.tsx', 'utf8');
const sharedConversation = fs.readFileSync('src/features/integrations/interakt/shared-inbound-conversation.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260917223000_stark_inbound_exclude_support_assignment.sql', 'utf8');

test('automatic inbound ownership excludes support and stays sales-only', () => {
  assert.match(migration, /lower\(r\.name\) = 'sales'/);
  assert.match(migration, /not like 'support@%'/);
  assert.doesNotMatch(migration, /lower\(r\.name\) = 'field_sales'/);
});

test('manual assignment supports Sales and Field Sales across inbound providers', () => {
  assert.match(assignment, /\['sales', 'field_sales'\]/);
  assert.match(assignment, /SUPPORTED_PROVIDERS = \['interakt', 'indiamart'\]/);
  assert.match(assignment, /\/\^support@\/i/);
});

test('converted Setu lead keeps the validated inbound sales owner', () => {
  assert.match(inboundActions, /resolveInboundLeadOwnerUserId/);
  assert.match(inboundActions, /\['sales', 'field_sales'\]/);
  assert.match(inboundActions, /owner_user_id: leadOwnerUserId/);
  assert.match(inboundActions, /Support accounts cannot own converted leads/);
});

test('IndiaMART remains the source while Interakt is the WhatsApp transport', () => {
  assert.match(salesMessages, /SUPPORTED_INBOUND_PROVIDERS = \['interakt', 'indiamart'\]/);
  assert.match(salesMessages, /sendInteraktTemplate/);
  assert.match(salesMessages, /sendInteraktText/);
  assert.match(salesMessages, /provider: SOURCE_PROVIDER/);
  assert.match(salesMessages, /IN: '91'/);
});

test('IndiaMART uses the shared Sales Inbox conversation and composer UX', () => {
  assert.match(inboundPage, /readSharedInboundConversation/);
  assert.match(inboundPage, /<InboundConversationPanel messages=\{messages\}/);
  assert.match(inboundPage, /<SalesMessageComposer rowId=\{selected\.id\}/);
  assert.doesNotMatch(inboundPage, /wa\.me/);
  assert.match(sharedConversation, /event_type: 'indiamart_enquiry'/);
  assert.match(sharedConversation, /SUPPORTED_INBOUND_PROVIDERS = \['interakt', 'indiamart'\]/);
});
