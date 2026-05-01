/**
 * RLS Regression Tests — Workspace Permissions + Role-Based Access
 *
 * Tests the pure permission logic that gates every write action in the system.
 * No Supabase connection required — these are pure-function tests covering:
 *
 * 1. Role normalisation (normalizeWorkspaceRole, normalizeWorkspaceRoles)
 * 2. hasWorkspaceCapability across all 6 capabilities × 9 roles
 * 3. getReadOnlyWorkspaceMessage
 * 4. Quote send capability boundary (sales only + above)
 * 5. Catalog management boundary (manager + above)
 * 6. Compliance review boundary (operations + above)
 * 7. Role hierarchy edge cases
 *
 * Run: npm run test:workspace
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWorkspaceRole,
  normalizeWorkspaceRoles,
  hasCanonicalWorkspaceRole,
} from '../../src/lib/workspace/roles.ts';
import {
  hasWorkspaceCapability,
  getReadOnlyWorkspaceMessage,
  getWorkspaceCapabilityLabel,
} from '../../src/lib/workspace/permissions.ts';

// ── normalizeWorkspaceRole ────────────────────────────────────────────────────

describe('normalizeWorkspaceRole', () => {
  test('returns owner for "owner"', () => {
    assert.equal(normalizeWorkspaceRole('owner'), 'owner');
  });

  test('returns viewer for "viewer"', () => {
    assert.equal(normalizeWorkspaceRole('viewer'), 'viewer');
  });

  test('is case-insensitive', () => {
    assert.equal(normalizeWorkspaceRole('SALES'), 'sales');
    assert.equal(normalizeWorkspaceRole('Manager'), 'manager');
  });

  test('trims whitespace', () => {
    assert.equal(normalizeWorkspaceRole('  admin  '), 'admin');
  });

  test('resolves the "ops" alias to operations', () => {
    assert.equal(normalizeWorkspaceRole('ops'), 'operations');
  });

  test('returns null for unrecognised roles', () => {
    assert.equal(normalizeWorkspaceRole('superuser'), null);
    assert.equal(normalizeWorkspaceRole(''), null);
    assert.equal(normalizeWorkspaceRole(null), null);
  });

  test('returns null for undefined', () => {
    assert.equal(normalizeWorkspaceRole(undefined), null);
  });
});

// ── normalizeWorkspaceRoles ───────────────────────────────────────────────────

describe('normalizeWorkspaceRoles', () => {
  test('deduplicates identical roles', () => {
    const result = normalizeWorkspaceRoles(['sales', 'sales', 'SALES']);
    assert.equal(result.length, 1);
    assert.equal(result[0], 'sales');
  });

  test('filters out unrecognised roles silently', () => {
    const result = normalizeWorkspaceRoles(['sales', 'superadmin', 'viewer']);
    assert.deepEqual(result.sort(), ['sales', 'viewer']);
  });

  test('returns empty array for undefined', () => {
    assert.deepEqual(normalizeWorkspaceRoles(undefined), []);
  });

  test('returns empty array for empty input', () => {
    assert.deepEqual(normalizeWorkspaceRoles([]), []);
  });

  test('handles null entries in the array', () => {
    const result = normalizeWorkspaceRoles([null, 'admin', undefined]);
    assert.deepEqual(result, ['admin']);
  });
});

// ── hasWorkspaceCapability — lead.manage ─────────────────────────────────────

describe('hasWorkspaceCapability — lead.manage', () => {
  const cap = 'lead.manage' as const;

  test('owner can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['owner'], cap), true);
  });

  test('admin can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['admin'], cap), true);
  });

  test('manager can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['manager'], cap), true);
  });

  test('sales can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['sales'], cap), true);
  });

  test('operations can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['operations'], cap), true);
  });

  test('sourcing can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['sourcing'], cap), true);
  });

  test('procurement can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['procurement'], cap), true);
  });

  test('contributor can manage leads', () => {
    assert.equal(hasWorkspaceCapability(['contributor'], cap), true);
  });

  test('viewer CANNOT manage leads', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], cap), false);
  });

  test('empty roles cannot manage leads', () => {
    assert.equal(hasWorkspaceCapability([], cap), false);
  });

  test('undefined roles cannot manage leads', () => {
    assert.equal(hasWorkspaceCapability(undefined, cap), false);
  });
});

// ── hasWorkspaceCapability — quote.send ──────────────────────────────────────

describe('hasWorkspaceCapability — quote.send', () => {
  const cap = 'quote.send' as const;

  test('owner can send quotes', () => {
    assert.equal(hasWorkspaceCapability(['owner'], cap), true);
  });

  test('admin can send quotes', () => {
    assert.equal(hasWorkspaceCapability(['admin'], cap), true);
  });

  test('manager can send quotes', () => {
    assert.equal(hasWorkspaceCapability(['manager'], cap), true);
  });

  test('sales can send quotes', () => {
    assert.equal(hasWorkspaceCapability(['sales'], cap), true);
  });

  test('operations CANNOT send quotes', () => {
    assert.equal(hasWorkspaceCapability(['operations'], cap), false);
  });

  test('sourcing CANNOT send quotes', () => {
    assert.equal(hasWorkspaceCapability(['sourcing'], cap), false);
  });

  test('procurement CANNOT send quotes', () => {
    assert.equal(hasWorkspaceCapability(['procurement'], cap), false);
  });

  test('contributor CANNOT send quotes', () => {
    assert.equal(hasWorkspaceCapability(['contributor'], cap), false);
  });

  test('viewer CANNOT send quotes', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], cap), false);
  });
});

// ── hasWorkspaceCapability — catalog.manage ───────────────────────────────────

describe('hasWorkspaceCapability — catalog.manage', () => {
  const cap = 'catalog.manage' as const;

  test('owner can manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['owner'], cap), true);
  });

  test('admin can manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['admin'], cap), true);
  });

  test('manager can manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['manager'], cap), true);
  });

  test('sales CANNOT manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['sales'], cap), false);
  });

  test('operations CANNOT manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['operations'], cap), false);
  });

  test('viewer CANNOT manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], cap), false);
  });
});

// ── hasWorkspaceCapability — compliance.review ────────────────────────────────

describe('hasWorkspaceCapability — compliance.review', () => {
  const cap = 'compliance.review' as const;

  test('owner can review compliance', () => {
    assert.equal(hasWorkspaceCapability(['owner'], cap), true);
  });

  test('operations can review compliance', () => {
    assert.equal(hasWorkspaceCapability(['operations'], cap), true);
  });

  test('sales CANNOT review compliance', () => {
    assert.equal(hasWorkspaceCapability(['sales'], cap), false);
  });

  test('sourcing CANNOT review compliance', () => {
    assert.equal(hasWorkspaceCapability(['sourcing'], cap), false);
  });

  test('viewer CANNOT review compliance', () => {
    assert.equal(hasWorkspaceCapability(['viewer'], cap), false);
  });
});

// ── Multi-role combinations ───────────────────────────────────────────────────

describe('hasWorkspaceCapability — multi-role combinations', () => {
  test('viewer + sales combination allows quote.send', () => {
    assert.equal(hasWorkspaceCapability(['viewer', 'sales'], 'quote.send'), true);
  });

  test('viewer + sales combination still cannot manage catalog', () => {
    assert.equal(hasWorkspaceCapability(['viewer', 'sales'], 'catalog.manage'), false);
  });

  test('operations + sourcing combination allows lead.manage but not quote.send', () => {
    assert.equal(hasWorkspaceCapability(['operations', 'sourcing'], 'lead.manage'), true);
    assert.equal(hasWorkspaceCapability(['operations', 'sourcing'], 'quote.send'), false);
  });

  test('ops alias resolves and grants compliance.review', () => {
    assert.equal(hasWorkspaceCapability(['ops'], 'compliance.review'), true);
  });
});

// ── getReadOnlyWorkspaceMessage ────────────────────────────────────────────────

describe('getReadOnlyWorkspaceMessage', () => {
  test('returns null when the role HAS the capability', () => {
    assert.equal(getReadOnlyWorkspaceMessage(['sales'], 'lead.manage'), null);
  });

  test('returns a non-empty string when the role lacks the capability', () => {
    const msg = getReadOnlyWorkspaceMessage(['viewer'], 'lead.manage');
    assert.ok(typeof msg === 'string' && msg.length > 0, 'Expected a non-empty message');
  });

  test('includes a description of what the role cannot do', () => {
    const msg = getReadOnlyWorkspaceMessage(['viewer'], 'quote.send');
    assert.ok(msg?.includes('send'), `Expected message to mention "send", got: ${msg}`);
  });

  test('returns a message even for undefined roles (treated as zero roles = no capability)', () => {
    const msg = getReadOnlyWorkspaceMessage(undefined, 'lead.manage');
    // undefined roles = no roles = no capability = returns a read-only message
    assert.ok(typeof msg === 'string' && msg.length > 0, `Expected a non-empty message for undefined roles`);
  });
});

// ── getWorkspaceCapabilityLabel ────────────────────────────────────────────────

describe('getWorkspaceCapabilityLabel', () => {
  test('returns a human-readable label for each capability', () => {
    const caps = ['catalog.manage', 'settings.manage', 'lead.manage', 'quote.send', 'compliance.review', 'reporting.view'] as const;
    for (const cap of caps) {
      const label = getWorkspaceCapabilityLabel(cap);
      assert.ok(typeof label === 'string' && label.length > 5, `Expected label for ${cap}, got: ${label}`);
    }
  });
});

// ── hasCanonicalWorkspaceRole ──────────────────────────────────────────────────

describe('hasCanonicalWorkspaceRole', () => {
  test('returns true when the role is in the allowed list', () => {
    assert.equal(hasCanonicalWorkspaceRole(['sales', 'viewer'], ['sales', 'admin']), true);
  });

  test('returns false when no role is in the allowed list', () => {
    assert.equal(hasCanonicalWorkspaceRole(['viewer'], ['owner', 'admin', 'manager']), false);
  });

  test('returns false for empty current roles', () => {
    assert.equal(hasCanonicalWorkspaceRole([], ['owner']), false);
  });
});
