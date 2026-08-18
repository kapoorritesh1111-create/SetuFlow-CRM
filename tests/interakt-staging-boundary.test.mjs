import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync('src/features/integrations/interakt/client.ts', 'utf8');
const server = fs.readFileSync('src/features/integrations/interakt/server.ts', 'utf8');
const salesMessageActions = fs.readFileSync('src/features/integrations/interakt/sales-message-actions.ts', 'utf8');
const workspaceV2 = fs.readFileSync('src/features/integrations/interakt/workspace-v2.ts', 'utf8');
const pendingButton = fs.readFileSync('src/features/integrations/interakt/components/pending-submit-button.tsx', 'utf8');
const reviewActions = fs.readFileSync('src/features/integrations/interakt/review-actions.ts', 'utf8');
const webhook = fs.readFileSync('src/features/integrations/interakt/webhook.ts', 'utf8');
const intelligence = fs.readFileSync('src/features/integrations/interakt/intelligence.ts', 'utf8');
const route = fs.readFileSync('src/app/api/webhooks/interakt/route.ts', 'utf8');
const inboundPage = fs.readFileSync('src/app/(app)/leads/inbound/page.tsx', 'utf8');
const baseMigration = fs.readFileSync('supabase/migrations/20260811093000_interakt_lead_intake_staging.sql', 'utf8');
const salesDeskMigration = fs.readFileSync('supabase/migrations/20260811112500_interakt_inbound_sales_desk.sql', 'utf8');
const companyMigration = fs.readFileSync('supabase/migrations/20260811121500_interakt_company_media_intelligence.sql', 'utf8');

const combinedRuntime = `${client}\n${server}\n${salesMessageActions}\n${workspaceV2}\n${reviewActions}\n${webhook}\n${intelligence}\n${route}\n${inboundPage}`;

test('Interakt contacts retrieval uses the documented endpoint and Basic auth', () => {
  assert.match(client, /https:\/\/api\.interakt\.ai\/v1\/public\/apis\/users\//);
  assert.match(client, /Authorization: `Basic \$\{getInteraktApiKey\(\)\}`/);
  assert.match(client, /filters: buildFilters/);
});

test('WhatsApp sending stays explicit and uses the public Interakt template endpoint', () => {
  assert.match(client, /https:\/\/api\.interakt\.ai\/v1\/public\/message\//);
  assert.match(client, /type: 'Template'/);
  assert.match(salesMessageActions, /sendInteraktTemplate/);
  assert.match(salesMessageActions, /qualification_follow_up/);
  assert.match(inboundPage, /Message customer/);
  assert.match(inboundPage, /Send WhatsApp follow-up/);
  assert.doesNotMatch(inboundPage, /name="templateName"/);
  assert.doesNotMatch(inboundPage, /name="bodyValues"/);
  assert.doesNotMatch(webhook, /sendInteraktTemplate/);
});

test('long-running inbound actions expose visible pending feedback', () => {
  assert.match(pendingButton, /useFormStatus/);
  assert.match(pendingButton, /aria-busy/);
  assert.match(inboundPage, /Syncing contacts/);
  assert.match(inboundPage, /Evaluating…/);
  assert.match(inboundPage, /Sending WhatsApp…/);
});

test('webhook verifies signature and records message and workflow evidence', () => {
  assert.match(webhook, /INTERAKT_STARK_PACKMATE_WEBHOOK_SECRET/);
  assert.match(webhook, /verifyInteraktSignature/);
  assert.match(webhook, /workflow_response_update/);
  assert.match(webhook, /message_received/);
  assert.match(webhook, /lead_intake_messages/);
  assert.match(webhook, /lead_intake_workflow_answers/);
  assert.match(webhook, /lead_intake_webhook_events/);
  assert.match(route, /processInteraktWebhook/);
});

test('cumulative workflow webhooks use payload-sensitive idempotency', () => {
  assert.match(webhook, /webhookEventKey/);
  assert.match(webhook, /createHash\('sha256'\)\.update\(rawBody\)/);
});

test('company and brand workflow mapping avoids generic welcome copy', () => {
  assert.match(webhook, /isBrandQuestion/);
  assert.match(webhook, /brand\\s\*name/);
  assert.match(webhook, /company\|business name\|organisation\|organization/);
  assert.match(webhook, /brand_name: answer/);
});

test('strong Meta CTWA attribution is preserved across sparse later events', () => {
  assert.match(webhook, /mergeAttribution/);
  assert.match(webhook, /currentIsCtwa/);
  assert.match(webhook, /ad_url: incoming\.ad_url \?\? intake\.ad_url/);
  assert.match(webhook, /interakt_assignee_name/);
});

test('customer conversation can enrich obvious quantity evidence', () => {
  assert.match(webhook, /quantityFromMessage/);
  assert.match(webhook, /quantity_text = quantity|identityPatch\.quantity_text = quantity/);
});

test('customer text and images support bounded company intelligence', () => {
  assert.match(webhook, /media_url/);
  assert.match(webhook, /extractExplicitCompanyFromText/);
  assert.match(webhook, /analyzeInteraktCustomerImage/);
  assert.match(webhook, /proposed_company_name/);
  assert.match(webhook, /proposed_brand_name/);
  assert.match(intelligence, /input_image/);
  assert.match(intelligence, /If only a brand\/logo is visible and the legal company is not visible/);
});

test('image-derived identity remains human confirmed', () => {
  assert.match(server, /export async function acceptStarkInteraktCompanySuggestion/);
  assert.match(inboundPage, /Setu Guru identity evidence/);
  assert.match(inboundPage, /Use this company/);
  assert.match(inboundPage, /Use this brand/);
});

test('sales inbox supports conversation, sales-safe messaging and call logging', () => {
  assert.match(inboundPage, /Sales Inbox/);
  assert.match(inboundPage, /Conversation/);
  assert.match(inboundPage, /Chatbot capture/);
  assert.match(inboundPage, /Message customer/);
  assert.match(inboundPage, /Log a call/);
  assert.match(salesMessageActions, /sendStarkInteraktSalesFollowUp/);
  assert.match(reviewActions, /export async function logStarkInteraktCall/);
  assert.match(reviewActions, /event_type: 'call_logged'/);
});

test('lead conversion remains human controlled, duplicate checked and preserves captured requirement', () => {
  assert.match(workspaceV2, /createStarkInteraktLeadOverride/);
  assert.match(workspaceV2, /findDuplicateLead/);
  assert.match(workspaceV2, /\.from\('leads'\)\.insert/);
  assert.match(workspaceV2, /lead_product_interests/);
  assert.match(workspaceV2, /interest_type: 'captured_requirement'/);
  assert.match(workspaceV2, /intake_status: 'qualified'/);
  assert.match(inboundPage, /Create Lead/);
  assert.doesNotMatch(webhook, /\.from\(['"]leads['"]\)/);
});

test('browsing-only contacts stay out of active sales queue', () => {
  assert.match(workspaceV2, /sales_queue_suppressed/);
  assert.match(workspaceV2, /browsingHidden/);
  assert.match(inboundPage, /browsing hidden/);
});

test('active queue hides terminal statuses and incremental sync preserves status', () => {
  assert.match(server, /TERMINAL_INBOUND_STATUSES/);
  assert.match(server, /modifiedAfter: watermark/);
  assert.match(server, /existingStatus\.get\(contact\.externalContactId\)/);
});

test('pre-lead messages and intelligence remain isolated and auditable', () => {
  assert.match(baseMigration, /create table if not exists public\.lead_intake_staging/);
  assert.match(salesDeskMigration, /create table if not exists public\.lead_intake_messages/);
  assert.match(salesDeskMigration, /create table if not exists public\.lead_intake_workflow_answers/);
  assert.match(salesDeskMigration, /create table if not exists public\.lead_intake_webhook_events/);
  assert.match(companyMigration, /proposed_company_name/);
  assert.match(companyMigration, /media_url/);
  assert.doesNotMatch(companyMigration, /create\s+trigger[\s\S]*insert\s+into\s+public\.leads/i);
});

test('Interakt and image intelligence secrets stay server-only', () => {
  assert.match(client, /process\.env\.INTERAKT_STARK_PACKMATE_API_KEY/);
  assert.match(webhook, /process\.env\.INTERAKT_STARK_PACKMATE_WEBHOOK_SECRET/);
  assert.match(intelligence, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(combinedRuntime, /NEXT_PUBLIC_INTERAKT/);
  assert.doesNotMatch(combinedRuntime, /NEXT_PUBLIC_OPENAI/);
});
