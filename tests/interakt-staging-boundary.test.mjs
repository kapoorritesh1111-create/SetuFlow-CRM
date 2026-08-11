import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync('src/features/integrations/interakt/client.ts', 'utf8');
const server = fs.readFileSync('src/features/integrations/interakt/server.ts', 'utf8');
const webhook = fs.readFileSync('src/features/integrations/interakt/webhook.ts', 'utf8');
const route = fs.readFileSync('src/app/api/webhooks/interakt/route.ts', 'utf8');
const inboundPage = fs.readFileSync('src/app/(app)/leads/inbound/page.tsx', 'utf8');
const baseMigration = fs.readFileSync('supabase/migrations/20260811093000_interakt_lead_intake_staging.sql', 'utf8');
const salesDeskMigration = fs.readFileSync('supabase/migrations/20260811112500_interakt_inbound_sales_desk.sql', 'utf8');

const combinedRuntime = `${client}\n${server}\n${webhook}\n${route}\n${inboundPage}`;

test('Interakt contacts retrieval uses the documented endpoint and Basic auth', () => {
  assert.match(client, /https:\/\/api\.interakt\.ai\/v1\/public\/apis\/users\//);
  assert.match(client, /Authorization: `Basic \$\{getApiKey\(\)\}`/);
  assert.match(client, /filters: buildFilters/);
});

test('Interakt WhatsApp send is explicit and uses the public template endpoint', () => {
  assert.match(client, /https:\/\/api\.interakt\.ai\/v1\/public\/message\//);
  assert.match(client, /type: 'Template'/);
  assert.match(server, /export async function sendStarkInteraktTemplate/);
  assert.match(inboundPage, /Send WhatsApp template/);
  assert.doesNotMatch(webhook, /sendInteraktTemplate/);
});

test('Interakt webhook verifies HMAC signature and records message/workflow evidence', () => {
  assert.match(webhook, /INTERAKT_STARK_PACKMATE_WEBHOOK_SECRET/);
  assert.match(webhook, /Interakt-Signature|verifyInteraktSignature/);
  assert.match(webhook, /workflow_response_update/);
  assert.match(webhook, /message_received/);
  assert.match(webhook, /lead_intake_messages/);
  assert.match(webhook, /lead_intake_workflow_answers/);
  assert.match(webhook, /lead_intake_webhook_events/);
  assert.match(route, /processInteraktWebhook/);
});

test('cumulative workflow webhooks use payload-sensitive idempotency', () => {
  assert.match(webhook, /workflowEventKey|webhookEventKey/);
  assert.match(webhook, /createHash\('sha256'\)\.update\(rawBody\)/);
  assert.match(webhook, /later answers in the same workflow are processed/);
});

test('lead conversion is human gated by ready_to_qualify and duplicate checked', () => {
  assert.match(server, /export async function qualifyStarkInteraktAsLead/);
  assert.match(server, /row\.intake_status !== 'ready_to_qualify'/);
  assert.match(server, /findDuplicateLead/);
  assert.match(server, /\.from\('leads'\)\.insert/);
  assert.match(server, /intake_status: 'qualified'/);
  assert.match(inboundPage, /selected\.intake_status !== 'ready_to_qualify'/);
  assert.match(inboundPage, /Qualify as Lead/);
  assert.doesNotMatch(webhook, /\.from\(['"]leads['"]\)/);
});

test('active inbound queue hides terminal statuses and incremental sync preserves status', () => {
  assert.match(server, /TERMINAL_INBOUND_STATUSES/);
  assert.match(server, /qualified/);
  assert.match(server, /duplicate/);
  assert.match(server, /existing_customer/);
  assert.match(server, /not_relevant/);
  assert.match(server, /newestSourceWatermark/);
  assert.match(server, /modifiedAfter: watermark/);
  assert.match(server, /existingStatus\.get\(contact\.externalContactId\)/);
  assert.match(server, /organization_id,source_provider,external_contact_id/);
});

test('inbound sales desk schema keeps pre-lead messages and evidence isolated', () => {
  assert.match(baseMigration, /create table if not exists public\.lead_intake_staging/);
  assert.match(salesDeskMigration, /create table if not exists public\.lead_intake_messages/);
  assert.match(salesDeskMigration, /create table if not exists public\.lead_intake_workflow_answers/);
  assert.match(salesDeskMigration, /create table if not exists public\.lead_intake_webhook_events/);
  assert.match(salesDeskMigration, /qualified_lead_id uuid references public\.leads/);
  assert.doesNotMatch(salesDeskMigration, /trigger[\s\S]*insert\s+into\s+public\.leads/i);
});

test('Setu Guru review exposes editable qualification, conversation, and Meta attribution', () => {
  assert.match(inboundPage, /Packaging type/);
  assert.match(inboundPage, /Quantity \/ MOQ/);
  assert.match(inboundPage, /Conversation/);
  assert.match(inboundPage, /Chatbot answers/);
  assert.match(inboundPage, /Acquisition attribution/);
  assert.match(inboundPage, /Meta ad/);
});

test('Interakt secrets stay server-only', () => {
  assert.match(client, /process\.env\.INTERAKT_STARK_PACKMATE_API_KEY/);
  assert.match(webhook, /process\.env\.INTERAKT_STARK_PACKMATE_WEBHOOK_SECRET/);
  assert.doesNotMatch(combinedRuntime, /NEXT_PUBLIC_INTERAKT/);
});
