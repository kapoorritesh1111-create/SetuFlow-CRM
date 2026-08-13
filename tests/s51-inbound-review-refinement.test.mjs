import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const page = read('src/app/(app)/leads/inbound/page.tsx');
const conversation = read('src/features/integrations/interakt/components/inbound-conversation-panel.tsx');
const composer = read('src/features/integrations/interakt/components/sales-message-composer.tsx');
const intelligence = read('src/features/integrations/interakt/intelligence.ts');
const webhook = read('src/features/integrations/interakt/webhook.ts');
const packageJson = read('package.json');

test('S51-LEADS-014 presents one coherent conversation intelligence section', () => {
  assert.match(page, /InboundConversationPanel/);
  assert.match(page, /captured=\{\{/);
  assert.match(page, /industry: selected\.industry/);
  assert.match(page, /evidenceAnswers=\{compactAnswers\.map/);
  assert.doesNotMatch(page, /Chatbot capture ·/);
  assert.match(conversation, /Conversation intelligence/);
  assert.match(conversation, /Setu Guru understood/);
  assert.match(conversation, /Latest reply/);
  assert.match(conversation, /View full conversation/);
});

test('S51-LEADS-014 keeps useful Guru understanding visible without contradicting captured fields', () => {
  assert.match(conversation, /requirementCaptures/);
  assert.match(conversation, /captured\.companyName/);
  assert.match(conversation, /captured\.packagingType/);
  assert.match(conversation, /captured\.pouchType/);
  assert.match(conversation, /captured\.quantityText/);
  assert.match(conversation, /captured\.industry \|\| inferIndustry/);
  assert.match(conversation, /Possible pack size/);
  assert.match(conversation, /Asking about MOQ/);
  assert.doesNotMatch(conversation, /No structured buyer detail has been extracted/);
});

test('S51-LEADS-014 collapses only rapid exact repeat replies in the visual thread', () => {
  assert.match(conversation, /function dedupeDisplayMessages/);
  assert.match(conversation, /currentText === previousText/);
  assert.match(conversation, /Math\.abs\(currentAt - previousAt\) <= 10_000/);
  assert.match(conversation, /repeated .*collapsed/);
});

test('S51-LEADS-015 normalizes company identity without losing the raw workflow answer', () => {
  assert.match(intelligence, /export function normalizeWorkflowCompanyAnswer/);
  assert.match(intelligence, /startup\|company\|business\|firm/);
  assert.match(intelligence, /confidence: 0\.9/);
  assert.match(intelligence, /looksLikeNaturalSentence/);
  assert.match(webhook, /normalizeWorkflowCompanyAnswer\(answerText\)/);
  assert.match(webhook, /patch\.company_name = normalizedCompany\.companyName/);
  assert.match(webhook, /answer_text: answerText/);
  assert.match(webhook, /evidence: answerText/);
  assert.doesNotMatch(webhook, /return \{ company_name: answer \}/);
});

test('S51-LEADS-017 recovers safe structured message replies when workflow context is missing', () => {
  assert.match(webhook, /function visibleMessageText/);
  assert.match(webhook, /function industryFromMessage/);
  assert.match(webhook, /\['food and beverage', 'Food and Beverage'\]/);
  assert.match(webhook, /const visibleText = visibleMessageText\(text\)/);
  assert.match(webhook, /!intake\.industry \? industryFromMessage\(visibleText\)/);
  assert.match(webhook, /identityPatch\.industry = industry/);
  assert.match(webhook, /bareRange/);
});

test('S51-LEADS-016 keeps one recommended reply prominent and moves alternatives and brochure into compact controls', () => {
  assert.match(composer, /Setu recommended reply/);
  assert.match(composer, /Change reply/);
  assert.match(composer, /suggestions\.map\(\(suggestion\) => <option/);
  assert.match(composer, /Attach brochure/);
  assert.match(composer, /open=\{Boolean\(brochureId\)\}/);
  assert.doesNotMatch(composer, /Setu suggested replies/);
  assert.match(composer, /name="draftRowId" value=\{draftRowId\}/);
  assert.match(composer, /const contextChanged = draftRowId !== rowId/);
});

test('S51-LEADS-016 reduces reply-window guidance to an info affordance instead of a heavy banner', () => {
  assert.match(composer, /whatsappHelp/);
  assert.match(composer, /title=\{whatsappHelp\}/);
  assert.match(composer, /aria-label=\{whatsappHelp\}/);
  assert.match(composer, /ⓘ/);
  assert.doesNotMatch(composer, /Setu has prepared one recommended reply\. Edit it if needed, add a brochure only when useful, then send\./);
});

test('S51 inbound feature additions use product design-system tokens and run in the normal test command', () => {
  for (const source of [composer, conversation]) {
    assert.doesNotMatch(source, /\bfont-(black|extrabold)\b/);
    assert.doesNotMatch(source, /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/);
    assert.doesNotMatch(source, /\b(?:bg|text|border)-(?:slate|blue|violet|emerald|rose)-\d+/);
    assert.doesNotMatch(source, /tracking-\[[^\]]+\]/);
  }
  assert.match(packageJson, /tests\/s51-inbound-composer-context\.test\.mjs/);
  assert.match(packageJson, /tests\/s51-inbound-review-refinement\.test\.mjs/);
});
