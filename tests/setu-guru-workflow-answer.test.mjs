import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const formatter = readFileSync('src/lib/setu-guru/workflow-status-answer.ts', 'utf8');
const wrapper   = readFileSync('src/app/api/setu-guru/org-search-v2/route.ts', 'utf8');
const config    = readFileSync('next.config.mjs', 'utf8');

test('workflow answer uses short header + numbered next-step format', () => {
  assert.match(formatter, /What needs to happen next/);
  assert.match(formatter, /stepNum\+\+/);
  assert.match(formatter, /headerLine/);
  assert.match(formatter, /statusLine/);
  assert.match(formatter, /evidenceLine/);
});

test('workflow answer translates raw status strings to human language', () => {
  assert.match(formatter, /not requested yet/);
  assert.match(formatter, /not started yet/);
  assert.match(formatter, /not ready yet/);
  assert.match(formatter, /humanStatus/);
});

test('workflow answer names next actions per blocker type', () => {
  assert.match(formatter, /Confirm payment terms or issue a proforma invoice/);
  assert.match(formatter, /Packing plan and processing evidence needed/);
  assert.match(formatter, /Cannot dispatch until fulfillment and documents/);
  assert.match(formatter, /Start the freight queue/);
  assert.match(formatter, /Queue the invoice for accounting review/);
});

test('workflow answer names customer and includes evidence summary', () => {
  assert.match(formatter, /customerName/);
  assert.match(formatter, /Evidence checked/);
  assert.match(formatter, /doc\(s\)/);
  assert.match(formatter, /freight request\(s\)/);
  assert.match(formatter, /finance record\(s\)/);
  assert.doesNotMatch(formatter, /No live blocker/);
});

test('org-search-v2 delegates all calls to org-search route', () => {
  assert.match(wrapper, /legacyOrgSearchPost/);
  assert.doesNotMatch(wrapper, /answerOrderStatus/);
  assert.doesNotMatch(wrapper, /findOrder/);
  assert.doesNotMatch(wrapper, /createClient/);
});

test('org-search rewrite config includes org-search-v2', () => {
  assert.match(config, /org-search-v2/);
});
