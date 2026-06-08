import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const enforcement = readFileSync('src/lib/trial/enforcement.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260608202000_s24_trial_194_server_enforcement.sql', 'utf8');
const leadGateway = readFileSync('src/features/leads/server/actions.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function has(source, text) {
  assert.ok(source.includes(text), `Expected source to include: ${text}`);
}

test('S24-TRIAL-194 keeps reusable app-side trial enforcement decisions available', () => {
  has(enforcement, 'export type TrialActionKind');
  has(enforcement, 'export function evaluateTrialAction');
  has(enforcement, 'export async function enforceTrialAction');
  has(enforcement, 'export function toTrialActionError');
});

test('S24-TRIAL-194 enforces counted trial entities at the database boundary', () => {
  has(migration, 'create or replace function public.enforce_guided_trial_insert_limit()');
  has(migration, 'from public.get_trial_capability(new.organization_id)');
  has(migration, 's24_trial_194_enforce_lead_limit');
  has(migration, 's24_trial_194_enforce_quote_limit');
  has(migration, 's24_trial_194_enforce_order_limit');
  has(migration, 's24_trial_194_enforce_invite_limit');
});

test('S24-TRIAL-194 blocks limits and restricted invitation capability server-side', () => {
  has(migration, "action_kind = 'create_lead'");
  has(migration, "action_kind = 'create_quote'");
  has(migration, "action_kind = 'create_order'");
  has(migration, "action_kind = 'invite_user'");
  has(migration, 'capability.max_leads');
  has(migration, 'capability.max_quotes');
  has(migration, 'capability.max_orders');
  has(migration, 'capability.max_users');
  has(migration, 'capability.allow_invites');
  has(migration, 'Guided trial limit reached');
});

test('S24-TRIAL-194 keeps non-trial organizations and public lead gateway stable', () => {
  has(migration, 'coalesce(capability.is_trial, false) = false');
  has(leadGateway, "export * from '@/features/leads/server/actions/legacy-actions';");
});

test('S24-TRIAL-194 regression is wired into npm test', () => {
  has(packageJson.scripts.test, 'tests/s24-trial-194-server-enforcement.test.mjs');
});
