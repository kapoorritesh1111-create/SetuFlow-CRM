/**
 * Pass 9 Database Capability Design Tests
 *
 * Pure assertions that the proposed DB-level helper mirrors the existing
 * application-layer permission model. No live Supabase connection.
 *
 * Run: tsx --test tests/security/db-capability-design.test.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasWorkspaceCapability, type WorkspaceCapability } from '../../src/lib/workspace/permissions.ts';

const capabilityDraft = readFileSync('supabase/migrations/pass9_004_db_capability_helper_advisor_remediation.sql', 'utf8');
const evidenceGate = readFileSync('docs/BUYER_CONFIDENCE_100_EVIDENCE_GATE_PASS9.md', 'utf8');

const capabilityExpectations: Record<WorkspaceCapability, { allowed: string[]; denied: string[] }> = {
  'catalog.manage': { allowed: ['owner', 'admin', 'manager'], denied: ['sales', 'operations', 'viewer'] },
  'settings.manage': { allowed: ['owner', 'admin', 'manager'], denied: ['sales', 'operations', 'viewer'] },
  'lead.manage': { allowed: ['owner', 'admin', 'manager', 'sales', 'operations', 'sourcing', 'procurement', 'contributor'], denied: ['viewer'] },
  'quote.send': { allowed: ['owner', 'admin', 'manager', 'sales'], denied: ['operations', 'viewer'] },
  'compliance.review': { allowed: ['owner', 'admin', 'manager', 'operations'], denied: ['sales', 'viewer'] },
  'reporting.view': { allowed: ['owner', 'admin', 'manager', 'sales', 'operations', 'contributor', 'viewer'], denied: ['sourcing', 'procurement'] },
};

describe('DB capability helper draft shape', () => {
  test('declares the intended helper name and arguments', () => {
    assert.match(capabilityDraft, /app_has_workspace_capability/i);
    assert.match(capabilityDraft, /p_organization_id uuid/i);
    assert.match(capabilityDraft, /p_user_id uuid/i);
    assert.match(capabilityDraft, /p_capability text/i);
  });

  test('requires active membership lookup', () => {
    assert.match(capabilityDraft, /organization_members/i);
    assert.match(capabilityDraft, /is_active = true/i);
    assert.match(capabilityDraft, /user_id = p_user_id/i);
  });
});

describe('DB capability mapping mirrors application roles', () => {
  for (const [capability, expectation] of Object.entries(capabilityExpectations) as [WorkspaceCapability, { allowed: string[]; denied: string[] }][]) {
    for (const role of expectation.allowed) {
      test(`${role} is allowed for ${capability}`, () => {
        assert.equal(hasWorkspaceCapability([role], capability), true);
        assert.match(capabilityDraft, new RegExp(`${capability.replace('.', '\\.')}'.*${role}|${role}.*${capability.replace('.', '\\.')}`, 's'));
      });
    }

    for (const role of expectation.denied) {
      test(`${role} is denied for ${capability}`, () => {
        assert.equal(hasWorkspaceCapability([role], capability), false);
      });
    }
  }
});

describe('100/100 evidence gate remains conservative', () => {
  test('100/100 is not claimable from draft-only remediation', () => {
    assert.match(evidenceGate, /100\/100 not claimable/i);
    assert.match(evidenceGate, /Open findings remain; Pass 9 draft-only/i);
  });

  test('99/100 requires applied remediation, not plans', () => {
    assert.match(evidenceGate, /~98 → 99/i);
    assert.match(evidenceGate, /Authorized Supabase remediation applied/i);
  });
});
