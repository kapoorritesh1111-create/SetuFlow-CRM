import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const page = read('src/app/(app)/leads/inbound/page.tsx');
const conversation = read('src/features/integrations/interakt/components/inbound-conversation-panel.tsx');
const composer = read('src/features/integrations/interakt/components/sales-message-composer.tsx');
const intelligence = read('src/features/integrations/interakt/intelligence.ts');
const webhook = read('src/features/integrations/interakt/webhook.ts');

test('S51-LEADS-014 shows the latest customer response and collapses earlier history', () => {
  assert.match(page, /InboundConversationPanel/);
  assert.match(conversation, /Latest customer response/);
  assert.match(conversation, /\.reverse\(\)\.find\(hasVisibleCustomerContent\)/);
  assert.match(conversation, /View earlier conversation/);
  assert.match(conversation, /<details/);
  assert.match(conversation, /earlierMessages\.map/);
});

test('S51-LEADS-015 normalizes company identity without losing the raw workflow answer', () => {
  assert.match(intelligence, /export function normalizeWorkflowCompanyAnswer/);
  assert.match(intelligence, /startup\|company\|business\|firm/);
  assert.match(intelligence, /confidence: 0\.9/);
  assert.match(webhook, /normalizeWorkflowCompanyAnswer\(answerText\)/);
  assert.match(webhook, /patch\.company_name = normalizedCompany\.companyName/);
  assert.match(webhook, /answer_text: answerText/);
  assert.doesNotMatch(webhook, /return \{ company_name: answer \}/);
});

test('S51-LEADS-016 keeps one recommended reply prominent and moves alternatives and brochure into compact controls', () => {
  assert.match(composer, /Setu recommended reply/);
  assert.match(composer, /Change reply/);
  assert.match(composer, /suggestions\.map\(\(suggestion\) => <option/);
  assert.match(composer, /Attach brochure/);
  assert.match(composer, /<details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" open=\{Boolean\(brochureId\)\}>/);
  assert.doesNotMatch(composer, /Setu suggested replies/);
  assert.match(composer, /name="draftRowId" value=\{draftRowId\}/);
  assert.match(composer, /const contextChanged = draftRowId !== rowId/);
});
