/**
 * Unit tests — Freight Calculation Helpers
 * src/features/quotes/pricing/services/freight-calculation.helpers.ts
 *
 * Pure-function tests: no Supabase, no network, no mocks needed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNonNegativeNumber,
  normalizeContainerMode,
  getTwentyFtFactor,
  resolvePalletsForMode,
  computeTotalFreightUsd,
  computeChipsAddOnUsdPerUnit,
  computePowdersAddOnUsdPerKg,
} from '../../src/features/quotes/pricing/services/freight-calculation.helpers.ts';

// ── validateNonNegativeNumber ─────────────────────────────────────────────────

describe('validateNonNegativeNumber', () => {
  test('returns 0 (zero is valid — non-negative)', () => {
    assert.equal(validateNonNegativeNumber(0, 'qty'), 0);
  });

  test('returns a positive number unchanged', () => {
    assert.equal(validateNonNegativeNumber(250, 'qty'), 250);
  });

  test('throws for null', () => {
    assert.throws(() => validateNonNegativeNumber(null, 'qty'), /non-negative/);
  });

  test('throws for undefined', () => {
    assert.throws(() => validateNonNegativeNumber(undefined, 'qty'), /non-negative/);
  });

  test('throws for a negative number', () => {
    assert.throws(() => validateNonNegativeNumber(-1, 'freight amount'), /non-negative/);
  });

  test('throws for NaN', () => {
    assert.throws(() => validateNonNegativeNumber(NaN, 'qty'), /non-negative/);
  });

  test('includes the label in the error message', () => {
    assert.throws(
      () => validateNonNegativeNumber(-5, 'Freight item ABC amount'),
      /Freight item ABC amount/,
    );
  });
});

// ── normalizeContainerMode ────────────────────────────────────────────────────

describe('normalizeContainerMode', () => {
  test('returns 40ft for strings containing "40"', () => {
    assert.equal(normalizeContainerMode('40ft'), '40ft');
    assert.equal(normalizeContainerMode('40FT'), '40ft');
    assert.equal(normalizeContainerMode('  40 ft Container '), '40ft');
  });

  test('returns 20ft for strings containing "20"', () => {
    assert.equal(normalizeContainerMode('20ft'), '20ft');
    assert.equal(normalizeContainerMode('20FT'), '20ft');
  });

  test('returns custom for unrecognised strings', () => {
    assert.equal(normalizeContainerMode('LCL'), 'custom');
    assert.equal(normalizeContainerMode(''), 'custom');
  });

  test('returns custom for null', () => {
    assert.equal(normalizeContainerMode(null), 'custom');
  });

  test('returns custom for undefined', () => {
    assert.equal(normalizeContainerMode(undefined), 'custom');
  });
});

// ── getTwentyFtFactor ─────────────────────────────────────────────────────────

describe('getTwentyFtFactor', () => {
  test('returns an explicit twentyFtFactor when provided and positive', () => {
    assert.equal(getTwentyFtFactor({ twentyFtFactor: 0.6, palletsPer40Ft: 24, palletsPer20Ft: 12 }), 0.6);
  });

  test('derives factor from pallets ratio when no explicit factor is given', () => {
    // 12 pallets per 20ft / 24 pallets per 40ft = 0.5
    const factor = getTwentyFtFactor({ palletsPer40Ft: 24, palletsPer20Ft: 12 });
    assert.equal(factor, 0.5);
  });

  test('returns the default 0.5 when no usable data is present', () => {
    assert.equal(getTwentyFtFactor({}), 0.5);
  });

  test('ignores an explicit factor of 0 and falls through to derivation', () => {
    const factor = getTwentyFtFactor({ twentyFtFactor: 0, palletsPer40Ft: 20, palletsPer20Ft: 10 });
    assert.equal(factor, 0.5);
  });
});

// ── resolvePalletsForMode ─────────────────────────────────────────────────────

describe('resolvePalletsForMode', () => {
  const assumptions = { palletsPer40Ft: 24, palletsPer20Ft: 12, twentyFtFactor: 0.5 };

  test('40ft mode uses palletsPer40Ft directly', () => {
    const result = resolvePalletsForMode('40ft', assumptions);
    assert.equal(result.normalizedMode, '40ft');
    assert.equal(result.palletsUsed, 24);
  });

  test('20ft mode uses palletsPer20Ft directly', () => {
    const result = resolvePalletsForMode('20ft', assumptions);
    assert.equal(result.normalizedMode, '20ft');
    assert.equal(result.palletsUsed, 12);
  });

  test('custom mode falls back to palletsPer40Ft', () => {
    const result = resolvePalletsForMode('LCL', assumptions);
    assert.equal(result.normalizedMode, 'custom');
    assert.equal(result.palletsUsed, 24);
  });

  test('40ft mode derives pallets from 20ft when 40ft is missing', () => {
    const result = resolvePalletsForMode('40ft', { palletsPer20Ft: 10, twentyFtFactor: 0.5 });
    // 10 / 0.5 = 20
    assert.equal(result.palletsUsed, 20);
  });
});

// ── computeTotalFreightUsd ────────────────────────────────────────────────────

describe('computeTotalFreightUsd', () => {
  test('sums a single USD active item correctly', () => {
    const total = computeTotalFreightUsd({
      items: [{ id: '1', lineNo: 1, particular: 'Ocean freight', inputCurrency: 'USD', amount: 5000, isActive: true }],
      getUsdRateForCurrency: () => 1,
    });
    assert.equal(total, 5000);
  });

  test('converts non-USD items using the provided rate', () => {
    // INR 420000 at 84 INR/USD = USD 5000
    const total = computeTotalFreightUsd({
      items: [{ id: '2', lineNo: 1, particular: 'Local haulage', inputCurrency: 'INR', amount: 420_000, isActive: true }],
      getUsdRateForCurrency: (currency) => (currency === 'INR' ? 84 : 1),
    });
    assert.ok(Math.abs(total - 5000) < 0.01, `Expected ~5000, got ${total}`);
  });

  test('skips inactive items', () => {
    const total = computeTotalFreightUsd({
      items: [
        { id: '1', lineNo: 1, particular: 'Ocean freight', inputCurrency: 'USD', amount: 3000, isActive: true },
        { id: '2', lineNo: 2, particular: 'Insurance', inputCurrency: 'USD', amount: 1000, isActive: false },
      ],
      getUsdRateForCurrency: () => 1,
    });
    assert.equal(total, 3000);
  });

  test('returns 0 for an empty items array', () => {
    const total = computeTotalFreightUsd({ items: [], getUsdRateForCurrency: () => 1 });
    assert.equal(total, 0);
  });

  test('sums multiple mixed-currency active items', () => {
    // USD 2000 + EUR 1000 at 1.1 USD/EUR ≈ USD 909.09
    const total = computeTotalFreightUsd({
      items: [
        { id: '1', lineNo: 1, particular: 'Ocean', inputCurrency: 'USD', amount: 2000, isActive: true },
        { id: '2', lineNo: 2, particular: 'Port', inputCurrency: 'EUR', amount: 1000, isActive: true },
      ],
      getUsdRateForCurrency: (currency) => (currency === 'EUR' ? 1.1 : 1),
    });
    // EUR 1000 at rate 1.1 (USD per EUR) → amount / rate = 1000 / 1.1 ≈ 909.09
    assert.ok(Math.abs(total - 2909.09) < 0.1, `Got ${total}`);
  });
});

// ── computeChipsAddOnUsdPerUnit ───────────────────────────────────────────────

describe('computeChipsAddOnUsdPerUnit', () => {
  test('uses direct chipsShipQty when provided', () => {
    const result = computeChipsAddOnUsdPerUnit({
      totalFreightUsd: 5000,
      assumptions: { chipsShipQty: 1000 },
    });
    assert.equal(result.addOnUsdPerUnit, 5);
    assert.equal(result.denominatorUnits, 1000);
  });

  test('derives denominator from pallets × cases × bags when chipsShipQty is absent', () => {
    // 24 pallets × 10 cases × 12 bags = 2880 units
    const result = computeChipsAddOnUsdPerUnit({
      totalFreightUsd: 2880,
      assumptions: {
        chipsMode: '40ft',
        palletsPer40Ft: 24,
        casesPerPallet: 10,
        bagsPerCase: 12,
      },
    });
    assert.equal(result.denominatorUnits, 2880);
    assert.equal(result.addOnUsdPerUnit, 1);
  });

  test('throws when the denominator cannot be computed', () => {
    assert.throws(
      () =>
        computeChipsAddOnUsdPerUnit({
          totalFreightUsd: 5000,
          assumptions: { chipsMode: '40ft' }, // no pallets configured
        }),
      /non-negative finite number|denominator/,
    );
  });
});

// ── computePowdersAddOnUsdPerKg ───────────────────────────────────────────────

describe('computePowdersAddOnUsdPerKg', () => {
  test('uses direct powdersShipQty when provided', () => {
    const result = computePowdersAddOnUsdPerKg({
      totalFreightUsd: 10_000,
      assumptions: { powdersShipQty: 20_000 },
    });
    assert.equal(result.addOnUsdPerKg, 0.5);
    assert.equal(result.denominatorKg, 20_000);
  });

  test('derives denominator from pallets × kgPerPallet when powdersShipQty is absent', () => {
    // 20 pallets × 500 kg = 10,000 kg
    const result = computePowdersAddOnUsdPerKg({
      totalFreightUsd: 5_000,
      assumptions: {
        powdersMode: '40ft',
        palletsPer40Ft: 20,
        kgPerPallet: 500,
      },
    });
    assert.equal(result.denominatorKg, 10_000);
    assert.equal(result.addOnUsdPerKg, 0.5);
  });

  test('throws when the denominator cannot be computed', () => {
    assert.throws(
      () =>
        computePowdersAddOnUsdPerKg({
          totalFreightUsd: 5000,
          assumptions: { powdersMode: '40ft' }, // no kgPerPallet
        }),
      /non-negative finite number|denominator/,
    );
  });
});
