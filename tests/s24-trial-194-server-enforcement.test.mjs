import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const enforcement = readFileSync('src/lib/trial/enforcement.ts', 'utf8');
const leadActions = readFileSync('src/features/leads/server/actions.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function has(source, text) {
  assert.ok(source.includes(text), `Expected source to include: ${text}`);
}

test('S24-TRIAL-194 adds reusable server-side trial enforcement decisions', () => {
  has(enforcement, 'export type TrialActionKind');
  has(enforcement, 'export function evaluateTrialAction');
  has(enforcement, 'export async function enforceTrialAction');
  has(enforcement, 'export function toTrialActionError');
});

test('S24-TRIAL-194 blocks trial limits and restricted capabilities server-side', () => {
  for (const action of ['create_lead', 'create_quote', 'create_order', 'invite_user', 'export_data', 'edit_settings', 'dispatch_order']) {
    has(enforcement, action);
  }

  has(enforcement, 'capability.lead_count');
  has(enforcement, 'capability.max_leads');
  has(enforcement, 'capability.quote_count');
  has(enforcement, 'capability.max_quotes');
  has(enforcement, 'capability.order_count');
  has(enforcement, 'capability.max_orders');
  has(enforcement, 'capability.allow_invites');
  has(enforcement, 'capability.allow_exports');
  has(enforcement, 'capability.allow_settings_edit');
});

test('S24-TRIAL-194 keeps non-trial organizations unaffected', () => {
  has(enforcement, 'if (!capability?.is_trial) return allow(capability ?? null);');
});

test('S24-TRIAL-194 wraps lead and quote create actions before legacy actions run', () => {
  has(leadActions, 'saveLead as legacySaveLead');
  has(leadActions, 'openOrCreateLeadQuoteDraft as legacyOpenOrCreateLeadQuoteDraft');
  has(leadActions, 'saveLeadQuoteDraftPreview as legacySaveLeadQuoteDraftPreview');
  has(leadActions, "action: 'create_lead'");
  has(leadActions, "action: 'create_quote'");
  has(leadActions, 'return legacySaveLead(previousState, formData);');
  has(leadActions, 'return legacyOpenOrCreateLeadQuoteDraft(leadId);');
});

test('S24-TRIAL-194 regression is wired into npm test', () => {
  has(packageJson.scripts.test, 'tests/s24-trial-194-server-enforcement.test.mjs');
});
