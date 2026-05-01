/**
 * Unit tests — FX Resolution Helpers
 * src/features/quotes/pricing/services/fx-resolution.helpers.ts
 *
 * Pure-function tests: no Supabase, no network, no mocks needed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEffectiveAt,
  validateFxRate,
  shouldUseManualFx,
  buildManualFxSnapshot,
  buildUsdIdentityFxSnapshot,
} from '../../src/features/quotes/pricing/services/fx-resolution.helpers.ts';

// ── normalizeEffectiveAt ──────────────────────────────────────────────────────

describe('normalizeEffectiveAt', () => {
  test('returns an ISO string when called with no argument', () => {
    const result = normalizeEffectiveAt(null);
    assert.ok(result.endsWith('Z'), `Expected ISO string, got: ${result}`);
    assert.ok(!Number.isNaN(new Date(result).getTime()));
  });

  test('returns an ISO string for a valid date string', () => {
    const input = '2026-01-15T10:00:00.000Z';
    const result = normalizeEffectiveAt(input);
    assert.equal(result, new Date(input).toISOString());
  });

  test('accepts a short date string like YYYY-MM-DD', () => {
    const result = normalizeEffectiveAt('2026-06-01');
    assert.ok(!Number.isNaN(new Date(result).getTime()));
  });

  test('throws for a non-date string', () => {
    assert.throws(
      () => normalizeEffectiveAt('not-a-date'),
      /Invalid FX asOf/,
    );
  });
});

// ── validateFxRate ────────────────────────────────────────────────────────────

describe('validateFxRate', () => {
  test('returns the rate when it is a positive finite number', () => {
    assert.equal(validateFxRate(84.5, 'INR rate'), 84.5);
  });

  test('returns 1 as valid (USD identity rate)', () => {
    assert.equal(validateFxRate(1), 1);
  });

  test('throws for rate === 0', () => {
    assert.throws(() => validateFxRate(0, 'rate'), /positive/);
  });

  test('throws for a negative rate', () => {
    assert.throws(() => validateFxRate(-5, 'rate'), /positive/);
  });

  test('throws for Infinity', () => {
    assert.throws(() => validateFxRate(Infinity), /positive/);
  });

  test('throws for NaN', () => {
    assert.throws(() => validateFxRate(NaN), /positive/);
  });

  test('includes the label in the error message', () => {
    assert.throws(
      () => validateFxRate(-1, 'Manual FX rate'),
      /Manual FX rate/,
    );
  });
});

// ── shouldUseManualFx ─────────────────────────────────────────────────────────

describe('shouldUseManualFx', () => {
  test('returns true when non-USD, allowManualFx=true, and manualRate is set', () => {
    assert.equal(
      shouldUseManualFx({ displayCurrency: 'INR', allowManualFx: true, manualRate: 84 }),
      true,
    );
  });

  test('returns false when displayCurrency is USD even with allowManualFx and rate', () => {
    assert.equal(
      shouldUseManualFx({ displayCurrency: 'USD', allowManualFx: true, manualRate: 1 }),
      false,
    );
  });

  test('returns false when allowManualFx is false', () => {
    assert.equal(
      shouldUseManualFx({ displayCurrency: 'INR', allowManualFx: false, manualRate: 84 }),
      false,
    );
  });

  test('returns false when manualRate is null', () => {
    assert.equal(
      shouldUseManualFx({ displayCurrency: 'INR', allowManualFx: true, manualRate: null }),
      false,
    );
  });
});

// ── buildManualFxSnapshot ─────────────────────────────────────────────────────

describe('buildManualFxSnapshot', () => {
  test('returns a correct snapshot for a valid manual INR rate', () => {
    const result = buildManualFxSnapshot({
      displayCurrency: 'INR',
      allowManualFx: true,
      manualRate: 84,
      asOf: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(result.baseCurrency, 'USD');
    assert.equal(result.displayCurrency, 'INR');
    assert.equal(result.rate, 84);
    assert.equal(result.provider, 'manual_override');
    assert.ok(result.effectiveAt.endsWith('Z'));
  });

  test('throws when the input does not satisfy shouldUseManualFx', () => {
    assert.throws(
      () =>
        buildManualFxSnapshot({
          displayCurrency: 'INR',
          allowManualFx: false,
          manualRate: 84,
        }),
      /Manual FX snapshot/,
    );
  });
});

// ── buildUsdIdentityFxSnapshot ────────────────────────────────────────────────

describe('buildUsdIdentityFxSnapshot', () => {
  test('returns rate 1 for the USD identity', () => {
    const result = buildUsdIdentityFxSnapshot(null);
    assert.equal(result.rate, 1);
    assert.equal(result.baseCurrency, 'USD');
    assert.equal(result.displayCurrency, 'USD');
    assert.equal(result.provider, 'system_identity');
  });

  test('effectiveAt is a valid ISO string', () => {
    const result = buildUsdIdentityFxSnapshot(null);
    assert.ok(!Number.isNaN(new Date(result.effectiveAt).getTime()));
  });
});
