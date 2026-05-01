/**
 * Unit tests — Order Execution Evaluation
 * src/lib/order-execution.ts
 *
 * Tests the pure evaluateOrderExecution logic that gates order progression
 * through: draft → ready → released → dispatched → completed.
 *
 * Run: npm run test:orders
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateOrderExecution,
  getOrderExecutionStateLabel,
  normalizeOrderExecutionState,
} from '../../src/lib/order-execution.ts';

// ── normalizeOrderExecutionState ──────────────────────────────────────────────

describe('normalizeOrderExecutionState', () => {
  test('returns draft for "draft"', () => {
    assert.equal(normalizeOrderExecutionState('draft'), 'draft');
  });

  test('returns ready for "ready"', () => {
    assert.equal(normalizeOrderExecutionState('ready'), 'ready');
  });

  test('returns released, dispatched, completed', () => {
    assert.equal(normalizeOrderExecutionState('released'), 'released');
    assert.equal(normalizeOrderExecutionState('dispatched'), 'dispatched');
    assert.equal(normalizeOrderExecutionState('completed'), 'completed');
  });

  test('is case-insensitive', () => {
    assert.equal(normalizeOrderExecutionState('DRAFT'), 'draft');
    assert.equal(normalizeOrderExecutionState('Ready'), 'ready');
  });

  test('returns null for unrecognised states', () => {
    assert.equal(normalizeOrderExecutionState('active'), null);
    assert.equal(normalizeOrderExecutionState(''), null);
    assert.equal(normalizeOrderExecutionState(null), null);
  });
});

// ── getOrderExecutionStateLabel ────────────────────────────────────────────────

describe('getOrderExecutionStateLabel', () => {
  test('labels match expected strings', () => {
    assert.equal(getOrderExecutionStateLabel('draft'), 'Draft execution');
    assert.equal(getOrderExecutionStateLabel('ready'), 'Ready for release');
    assert.equal(getOrderExecutionStateLabel('released'), 'Released to operations');
    assert.equal(getOrderExecutionStateLabel('dispatched'), 'Dispatched');
    assert.equal(getOrderExecutionStateLabel('completed'), 'Completed');
  });

  test('unknown state returns draft label', () => {
    assert.equal(getOrderExecutionStateLabel('unknown'), 'Draft execution');
  });
});

// ── Shared base input ─────────────────────────────────────────────────────────

function baseInput(overrides = {}) {
  return {
    quoteAccepted: true,
    hasContract: true,
    contractStatus: 'signed',
    contractSignedAt: '2026-04-01T10:00:00.000Z',
    commercialLockState: 'locked',
    lineCount: 11,
    openDocumentBlockers: 0,
    openComplianceBlockers: 0,
    currentState: 'draft',
    ...overrides,
  };
}

// ── Draft state — ready gate ──────────────────────────────────────────────────

describe('evaluateOrderExecution — draft state', () => {
  test('can advance from draft when all prerequisites are met', () => {
    const result = evaluateOrderExecution(baseInput());
    assert.equal(result.currentState, 'draft');
    assert.equal(result.nextState, 'ready');
    assert.equal(result.canAdvance, true);
    assert.equal(result.blockers.length, 0);
  });

  test('blocked when quote is not accepted', () => {
    const result = evaluateOrderExecution(baseInput({ quoteAccepted: false }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.some((b) => b.includes('accepted')));
  });

  test('blocked when contract record is missing', () => {
    const result = evaluateOrderExecution(baseInput({ hasContract: false }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.some((b) => b.includes('Contract')));
  });

  test('blocked when contract is NOT signed (signed_at is null)', () => {
    const result = evaluateOrderExecution(baseInput({
      contractStatus: 'draft',
      contractSignedAt: null,
    }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.some((b) => b.toLowerCase().includes('signed')));
  });

  test('signed_at alone unblocks the signed contract check', () => {
    // Even if status is 'draft', a signed_at timestamp is sufficient
    const result = evaluateOrderExecution(baseInput({
      contractStatus: 'draft',
      contractSignedAt: '2026-04-01T10:00:00.000Z',
      commercialLockState: 'locked',
    }));
    // Should not have a "signed contract" blocker
    const hasSignedBlocker = result.blockers.some((b) => b.toLowerCase().includes('signed'));
    assert.equal(hasSignedBlocker, false);
  });

  test('blocked when commercial lock state is not locked', () => {
    const result = evaluateOrderExecution(baseInput({ commercialLockState: 'pending' }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.some((b) => b.includes('lock')));
  });

  test('blocked when lineCount is 0', () => {
    const result = evaluateOrderExecution(baseInput({ lineCount: 0 }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.some((b) => b.includes('line')));
  });

  test('multiple blockers are all listed', () => {
    const result = evaluateOrderExecution(baseInput({
      quoteAccepted: false,
      hasContract: false,
      contractSignedAt: null,
    }));
    assert.ok(result.blockers.length >= 2, `Expected ≥2 blockers, got ${result.blockers.length}`);
  });
});

// ── Ready state — release gate ────────────────────────────────────────────────

describe('evaluateOrderExecution — ready state', () => {
  test('can advance from ready to released when no blockers', () => {
    const result = evaluateOrderExecution(baseInput({ currentState: 'ready' }));
    assert.equal(result.currentState, 'ready');
    assert.equal(result.nextState, 'released');
    assert.equal(result.canAdvance, true);
  });

  test('blocked at ready when there are document requirement blockers', () => {
    const result = evaluateOrderExecution(baseInput({
      currentState: 'ready',
      documentRequirementReasons: ['Phytosanitary certificate missing'],
    }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.includes('Phytosanitary certificate missing'));
  });

  test('blocked at ready when there are compliance requirement blockers', () => {
    const result = evaluateOrderExecution(baseInput({
      currentState: 'ready',
      complianceRequirementReasons: ['Lab report not approved'],
    }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.includes('Lab report not approved'));
  });
});

// ── Released state — dispatch gate ────────────────────────────────────────────

describe('evaluateOrderExecution — released state', () => {
  test('can advance from released to dispatched when no blockers', () => {
    const result = evaluateOrderExecution(baseInput({ currentState: 'released' }));
    assert.equal(result.nextState, 'dispatched');
    assert.equal(result.canAdvance, true);
  });

  test('dispatch blocker reasons propagate', () => {
    const result = evaluateOrderExecution(baseInput({
      currentState: 'released',
      dispatchArtifactReasons: ['Shipping manifest not uploaded'],
    }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.includes('Shipping manifest not uploaded'));
  });
});

// ── Dispatched state — completion gate ────────────────────────────────────────

describe('evaluateOrderExecution — dispatched state', () => {
  test('can advance from dispatched to completed', () => {
    const result = evaluateOrderExecution(baseInput({ currentState: 'dispatched' }));
    assert.equal(result.nextState, 'completed');
    assert.equal(result.canAdvance, true);
  });

  test('completion blocker reasons propagate', () => {
    const result = evaluateOrderExecution(baseInput({
      currentState: 'dispatched',
      completionArtifactReasons: ['Delivery confirmation not received'],
    }));
    assert.equal(result.canAdvance, false);
    assert.ok(result.blockers.includes('Delivery confirmation not received'));
  });
});

// ── Completed state ────────────────────────────────────────────────────────────

describe('evaluateOrderExecution — completed state', () => {
  test('completed state has no next state', () => {
    const result = evaluateOrderExecution(baseInput({ currentState: 'completed' }));
    assert.equal(result.currentState, 'completed');
    assert.equal(result.nextState, null);
    assert.equal(result.canAdvance, false);
  });
});

// ── Blocker deduplication ─────────────────────────────────────────────────────

describe('evaluateOrderExecution — deduplication', () => {
  test('duplicate blocker reasons are deduplicated in the output', () => {
    const result = evaluateOrderExecution(baseInput({
      currentState: 'ready',
      documentRequirementReasons: ['Doc A missing', 'Doc A missing'],
      complianceRequirementReasons: ['Doc A missing'],
    }));
    const docACount = result.blockers.filter((b) => b === 'Doc A missing').length;
    assert.equal(docACount, 1, 'Expected deduplicated blocker');
  });
});
