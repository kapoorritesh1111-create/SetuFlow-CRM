/**
 * current security baseline Security Boundary Tests — Order/Contract Action Gates
 *
 * These tests cover the pure permission predicates used by order execution,
 * contract signing, and order document upload actions. No Supabase connection.
 *
 * Live Supabase posture was separately inspected through the GPT Supabase connector on 2026-04-30; these tests remain deterministic repo-level action-gate tests and do not mutate Q-00025 or contract d129ffe2-c913-4cf7-9a7b-86ea6c9da54e.
 *
 * Run: npm run test:security
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { hasWorkspaceCapability } from '../../src/lib/workspace/permissions.ts';

function canProgressOrderExecution(roles: string[] | undefined) {
  return hasWorkspaceCapability(roles, 'lead.manage');
}

function canSignContract(roles: string[] | undefined) {
  return (
    hasWorkspaceCapability(roles, 'lead.manage') ||
    hasWorkspaceCapability(roles, 'compliance.review')
  );
}

function canUploadOrderDocument(roles: string[] | undefined) {
  return (
    hasWorkspaceCapability(roles, 'lead.manage') ||
    hasWorkspaceCapability(roles, 'compliance.review')
  );
}

describe('progressOrderExecution permission gate', () => {
  test('viewer-only users cannot progress orders', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], 'lead.manage'), false);
    assert.equal(canProgressOrderExecution(['viewer']), false);
  });

  test('sales users can progress orders through the lead.manage gate', () => {
    assert.equal(canProgressOrderExecution(['sales']), true);
  });
});

describe('signContractAction permission gate', () => {
  test('viewer-only users cannot sign contracts', () => {
    assert.equal(canSignContract(['viewer']), false);
  });

  test('operations users can sign contracts through compliance.review', () => {
    assert.equal(hasWorkspaceCapability(['operations'], 'compliance.review'), true);
    assert.equal(canSignContract(['operations']), true);
  });
});

describe('uploadOrderDocument permission gate', () => {
  test('viewer-only users cannot upload order documents', () => {
    assert.equal(canUploadOrderDocument(['viewer']), false);
  });

  test('sourcing users can upload order documents through lead.manage', () => {
    assert.equal(hasWorkspaceCapability(['sourcing'], 'lead.manage'), true);
    assert.equal(canUploadOrderDocument(['sourcing']), true);
  });

  test('viewer users cannot review compliance', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], 'compliance.review'), false);
  });
});
