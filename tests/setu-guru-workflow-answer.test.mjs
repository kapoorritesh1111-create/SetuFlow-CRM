import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const formatter = readFileSync('src/lib/setu-guru/workflow-status-answer.ts', 'utf8');
const wrapper = readFileSync('src/app/api/setu-guru/org-search-v2/route.ts', 'utf8');
const config = readFileSync('next.config.mjs', 'utf8');

test('workflow answer names the customer and treats incomplete readiness as work remaining', () => {
  assert.match(formatter, /customerName/);
  assert.match(formatter, /not ready to dispatch or close yet/);
  assert.match(formatter, /payment is/);
  assert.match(formatter, /fulfillment is/);
  assert.match(formatter, /dispatch is/);
  assert.match(formatter, /no order documents/);
  assert.match(formatter, /no freight request/);
  assert.match(formatter, /no finance or invoice handoff/);
  assert.doesNotMatch(formatter, /No live blocker/);
});

test('org search wrapper handles order status and keeps legacy fallback', () => {
  assert.match(wrapper, /wantsOrderStatus/);
  assert.match(wrapper, /buildConversationalWorkflowStatusAnswer/);
  assert.match(wrapper, /legacyOrgSearchPost/);
  assert.match(config, /org-search-v2/);
});
