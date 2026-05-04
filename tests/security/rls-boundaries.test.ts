/**
 * current security baseline Security Boundary Tests — Workspace RLS/Application Gates
 *
 * Pure logic tests for the application-layer permission helpers that guard
 * write operations before Supabase/RLS is reached. No live Supabase connection.
 *
 * Live Supabase posture was separately inspected through the GPT Supabase connector on 2026-04-30; these tests remain deterministic repo-level application-gate tests.
 *
 * Run: npm run test:security
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspaceRoles } from '../../src/lib/workspace/roles.ts';
import {
  getReadOnlyWorkspaceMessage,
  hasWorkspaceCapability,
  type WorkspaceCapability,
} from '../../src/lib/workspace/permissions.ts';

const allCapabilities: WorkspaceCapability[] = [
  'catalog.manage',
  'settings.manage',
  'lead.manage',
  'quote.send',
  'compliance.review',
  'reporting.view',
];

describe('hasWorkspaceCapability — viewer boundary', () => {
  test('viewer cannot manage leads', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], 'lead.manage'), false);
  });

  test('viewer cannot send quotes', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], 'quote.send'), false);
  });

  test('viewer cannot manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], 'catalog.manage'), false);
  });

  test('viewer cannot review compliance', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], 'compliance.review'), false);
  });
});

describe('hasWorkspaceCapability — owner boundary', () => {
  for (const capability of allCapabilities) {
    test(`owner can ${capability}`, () => {
      assert.equal(hasWorkspaceCapability(['owner'], capability), true);
    });
  }
});

describe('hasWorkspaceCapability — sales boundary', () => {
  test('sales can send quotes', () => {
    assert.equal(hasWorkspaceCapability(['sales'], 'quote.send'), true);
  });

  test('sales can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['sales'], 'lead.manage'), true);
  });

  test('sales cannot manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['sales'], 'catalog.manage'), false);
  });

  test('sales cannot review compliance', () => {
    assert.equal(hasWorkspaceCapability(['sales'], 'compliance.review'), false);
  });
});

describe('hasWorkspaceCapability — operations boundary', () => {
  test('operations can review compliance', () => {
    assert.equal(hasWorkspaceCapability(['operations'], 'compliance.review'), true);
  });

  test('operations can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['operations'], 'lead.manage'), true);
  });

  test('operations cannot send quotes', () => {
    assert.equal(hasWorkspaceCapability(['operations'], 'quote.send'), false);
  });

  test('operations cannot manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['operations'], 'catalog.manage'), false);
  });
});

describe('getReadOnlyWorkspaceMessage', () => {
  test('returns a message when the role lacks a capability', () => {
    const message = getReadOnlyWorkspaceMessage(['viewer'], 'quote.send');
    assert.equal(typeof message, 'string');
    assert.match(message ?? '', /cannot send quotes/i);
  });

  test('returns null when the role has the capability', () => {
    assert.equal(getReadOnlyWorkspaceMessage(['sales'], 'quote.send'), null);
  });
});

describe('normalizeWorkspaceRoles', () => {
  test('filters null and undefined entries', () => {
    assert.deepEqual(normalizeWorkspaceRoles([null, undefined, 'sales']), ['sales']);
  });

  test('deduplicates repeated canonical roles', () => {
    assert.deepEqual(normalizeWorkspaceRoles(['sales', 'SALES', ' sales ']), ['sales']);
  });

  test('resolves ops alias to operations', () => {
    assert.deepEqual(normalizeWorkspaceRoles(['ops']), ['operations']);
  });

  test('filters invalid roles while preserving valid roles', () => {
    assert.deepEqual(normalizeWorkspaceRoles(['viewer', 'superuser', undefined, 'ops']), ['viewer', 'operations']);
  });
});

describe('empty and undefined roles', () => {
  for (const capability of allCapabilities) {
    test(`empty role array cannot ${capability}`, () => {
      assert.equal(hasWorkspaceCapability([], capability), false);
    });

    test(`undefined roles cannot ${capability}`, () => {
      assert.equal(hasWorkspaceCapability(undefined, capability), false);
    });
  }
});

describe('multi-role combinations', () => {
  test('viewer + sales can send quotes', () => {
    assert.equal(hasWorkspaceCapability(['viewer', 'sales'], 'quote.send'), true);
  });

  test('viewer + operations can review compliance', () => {
    assert.equal(hasWorkspaceCapability(['viewer', 'operations'], 'compliance.review'), true);
  });

  test('viewer + operations still cannot send quotes', () => {
    assert.equal(hasWorkspaceCapability(['viewer', 'operations'], 'quote.send'), false);
  });
});
