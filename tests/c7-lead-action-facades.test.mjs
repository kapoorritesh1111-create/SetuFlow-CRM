import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync('src/features/leads/server/actions.ts', 'utf8');
const quote = readFileSync('src/features/leads/server/actions/quote-actions.ts', 'utf8');
const lead = readFileSync('src/features/leads/server/actions/lead-record-actions.ts', 'utf8');
const followUp = readFileSync('src/features/leads/server/actions/follow-up-actions.ts', 'utf8');
const communication = readFileSync('src/features/leads/server/actions/communication-actions.ts', 'utf8');
const approval = readFileSync('src/features/leads/server/actions/approval-actions.ts', 'utf8');

test('C7 Phase 1 keeps the public lead action gateway domain-split and saveLead event-aware', () => {
  for (const modulePath of [
    'quote-actions',
    'lead-record-actions',
    'follow-up-actions',
    'communication-actions',
    'approval-actions',
  ]) {
    assert.match(gateway, new RegExp(`actions/${modulePath}`));
  }
  assert.match(gateway, /lead-capture-event-aware-action/);
  assert.doesNotMatch(gateway, /export \* from ['"]@\/features\/leads\/server\/actions\/legacy-actions['"]/);
});

test('C7 Phase 1 preserves the expected public action surface', () => {
  for (const name of [
    'openOrCreateLeadQuoteDraft',
    'saveLeadQuoteDraftPreview',
    'createNewLeadQuoteDraft',
    'createQuoteRevisionFromQuote',
    'cloneQuoteForRepeatBusiness',
  ]) assert.match(quote, new RegExp(name));

  for (const name of [
    'saveLeadDetails',
    'saveLeadCoverage',
    'deleteLead',
    'batchDeleteLeads',
    'updateLeadQualification',
    'addLeadNote',
  ]) assert.match(lead, new RegExp(name));

  for (const name of [
    'scheduleLeadFollowUp',
    'batchScheduleLeadFollowUps',
    'batchMoveLeadsToStage',
    'completeLeadFollowUp',
  ]) assert.match(followUp, new RegExp(name));

  for (const name of ['recordLeadCommunicationSent','saveLeadCommunicationDraft']) {
    assert.match(communication, new RegExp(name));
  }

  for (const name of [
    'recordLeadQuoteApprovalRequest',
    'approveLeadQuoteAdjustment',
    'rejectLeadQuoteAdjustment',
  ]) assert.match(approval, new RegExp(name));
});

test('C7 Phase 1 facades still delegate to legacy implementation only', () => {
  for (const source of [quote, lead, followUp, communication, approval]) {
    assert.match(source, /from ["']\.\/legacy-actions["']/);
  }
});
