import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const dashboard = read('src/app/(app)/dashboard/_lib/render-dashboard-page.tsx');
const widget = read('src/features/setu-guru/setu-guru-widget.tsx');
const research = read('src/app/api/setu-guru/research/route.ts');

test('dashboard mobile component is wrapped in its required permissions provider', () => {
  assert.match(dashboard, /<MobilePermissionsProvider organizationId=\{workspace\.organization\.id\}>\s*<MobileDashboardHome data=\{data\}\s*\/>\s*<\/MobilePermissionsProvider>/);
});

test('general user question goes to existing AI route instead of a dashboard topic', () => {
  assert.match(widget, /async function runGeneralQuestion\(question: string\)/);
  assert.match(widget, /fetch\('\/api\/setu-guru\/research'/);
  assert.match(widget, /void runGeneralQuestion\(question\);/);
  assert.doesNotMatch(widget, /setMessages\(\(current\) => \[\.\.\.current, topicMessage\(getBestSetuGuruHelpTopic\(question, pathname\)/);
  assert.match(widget, /Ask Guru anything/);
  const askHandler = widget.slice(widget.indexOf('function handleAsk('), widget.indexOf('function handleAction('));
  assert.doesNotMatch(askHandler, /packagingPricingMessage\(question\)/);
  assert.match(askHandler, /void runGeneralQuestion\(question\)/);
});

test('only explicit page-help requests use page help', () => {
  const extract = widget.match(/function isPageHelpQuestion\(question: string\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(extract, /on this page/);
  assert.doesNotMatch(extract, /\['help',/);
  assert.doesNotMatch(extract, /'what should i do'/);
});

test('AI route authenticates and uses server-resolved workspace identity', () => {
  assert.match(research, /getWorkspaceAccess\(\)/);
  assert.match(research, /workspace\.currentRoles\.join/);
  assert.match(research, /workspace\.organization\.id/);
  assert.match(research, /answerFromApprovedLessons/);
  assert.doesNotMatch(research, /role: body\.role/);
  assert.doesNotMatch(research, /organization: body\.organization/);
});

test('center seal MOQ uses verified frame-family rule context and avoids guessed PCS', () => {
  assert.match(research, /minimum_run_length_m/);
  assert.match(research, /250 meters/);
  assert.match(research, /not a live quote calculation/i);
  assert.match(research, /never calculate a precise MOQ/i);
});

test('AI response extraction supports Responses API output array and output_text', () => {
  assert.match(research, /Array\.isArray\(result\.output\)/);
  assert.match(research, /result\.output_text/);
  assert.match(research, /confidence: shouldUseLiveSearch \? 'source_backed' : 'ai_guidance'/);
});
