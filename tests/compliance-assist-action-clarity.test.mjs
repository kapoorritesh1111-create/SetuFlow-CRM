import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const compliancePage = readFileSync('src/app/(app)/compliance/assist/page.tsx', 'utf8');
const quotePrep = readFileSync('src/features/leads/command-center/workflow/QuotePrepChecklist.tsx', 'utf8');
const complianceHelp = readFileSync('docs/help/compliance.md', 'utf8');

test('Compliance Assist exposes explicit evidence waiver and dispatch deferral actions', () => {
  assert.match(compliancePage, /Attach evidence for review/);
  assert.match(compliancePage, /Waive for quote with reason/);
  assert.match(compliancePage, /Ignore for quote, record for dispatch/);
  assert.match(compliancePage, /Defer to dispatch with reason/);
  assert.match(compliancePage, /Why this is blocked/);
});

test('lead quote prep routes compliance blockers to the fix panel', () => {
  assert.match(quotePrep, /Open compliance fix panel/);
  assert.match(quotePrep, /attach evidence, waive for this quote, or defer the document to dispatch/);
  assert.match(quotePrep, /\/compliance\/assist\?leadId=/);
});

test('Setu Guru compliance help documents quote waiver and dispatch deferral boundaries', () => {
  assert.match(complianceHelp, /Defer to dispatch/);
  assert.match(complianceHelp, /attach evidence, waive for quote, or defer to dispatch with reason/);
  assert.match(complianceHelp, /must not approve, waive, defer, clear, delete, or mark compliance complete/);
});
