/**
 * Pass 9 RPC Grant Hardening Tests
 *
 * These are pure repository/draft-migration assertions. They do not connect to
 * Supabase and do not mutate production data. Live negative RPC tests remain
 * pending until a safe test database and explicit migration authorization exist.
 *
 * Run: tsx --test tests/security/rpc-grant-hardening.test.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const grantDraft = readFileSync('supabase/migrations/pass9_001_rpc_grant_hardening_advisor_remediation.sql', 'utf8');
const capabilityDraft = readFileSync('supabase/migrations/pass9_004_db_capability_helper_advisor_remediation.sql', 'utf8');
const implementationDoc = readFileSync('docs/SUPABASE_REMEDIATION_IMPLEMENTATION_PASS9.md', 'utf8');
const rollbackDoc = readFileSync('docs/MIGRATION_DRY_RUN_AND_ROLLBACK_PASS9.md', 'utf8');

const privilegedAnonRevokes = [
  'app_move_lead_stage_tx',
  'app_batch_move_leads_stage_tx',
  'app_create_rfq_with_line_items_and_fanout_tx',
  'app_update_rfq_with_line_items_and_fanout_tx',
  'app_update_document_workflow_tx',
  'app_update_compliance_workflow_tx',
  'app_upsert_invitation_tx',
  'app_update_invitation_role_tx',
  'app_update_member_role_tx',
  'app_set_membership_active_tx',
  'app_save_catalog_price_tx',
  'app_delete_catalog_price_tx',
  'app_save_product_with_catalog_pricing_tx',
  'app_deactivate_product_tx',
];

describe('Pass 9 migration drafts are explicitly non-live', () => {
  test('implementation document states migrations were not applied', () => {
    assert.match(implementationDoc, /not authorized to apply live Supabase migrations/i);
    assert.match(implementationDoc, /No production migrations were applied/i);
  });

  test('grant draft is marked draft-only', () => {
    assert.match(grantDraft, /DRAFT ONLY/i);
    assert.match(grantDraft, /DO NOT APPLY WITHOUT AUTHORIZATION/i);
  });

  test('rollback plan exists before live apply', () => {
    assert.match(rollbackDoc, /Rollback principles/i);
    assert.match(rollbackDoc, /captured grant baseline/i);
  });
});

describe('anon RPC grant revocation coverage', () => {
  for (const functionName of privilegedAnonRevokes) {
    test(`draft revokes anon execute for ${functionName}`, () => {
      assert.match(grantDraft, new RegExp(`revoke execute on function public\\.${functionName}`, 'i'));
      assert.match(grantDraft, /from anon/i);
    });
  }
});

describe('authenticated RPCs require database-level backup gates', () => {
  test('quote create/send and contract progress remain authenticated-only with DB gates required', () => {
    assert.match(grantDraft, /grant execute on function public\.app_create_quote_with_line_items_and_fanout_tx/i);
    assert.match(grantDraft, /grant execute on function public\.app_send_quote_version_with_fanout_tx/i);
    assert.match(grantDraft, /grant execute on function public\.app_progress_contract_with_fanout_tx/i);
    assert.match(grantDraft, /DB-level membership\/capability checks/i);
  });

  test('capability helper draft is referenced for privileged RPC guards', () => {
    assert.match(capabilityDraft, /app_has_workspace_capability/i);
    assert.match(capabilityDraft, /insufficient_workspace_capability/i);
  });
});

describe('negative RPC test plan is documented', () => {
  const expectedNegativeCases = [
    /anon cannot execute privileged RPCs/i,
    /viewer cannot progress order/i,
    /viewer cannot update compliance/i,
    /sales cannot catalog manage/i,
    /operations cannot send quote/i,
    /inactive member cannot execute privileged RPCs/i,
    /cross-workspace user cannot mutate records/i,
  ];

  for (const pattern of expectedNegativeCases) {
    test(`negative case present: ${pattern.source}`, () => {
      assert.match(capabilityDraft, pattern);
    });
  }
});
