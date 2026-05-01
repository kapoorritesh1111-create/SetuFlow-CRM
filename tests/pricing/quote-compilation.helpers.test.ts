/**
 * Unit tests — Quote Compilation Helpers
 * src/features/quotes/pricing/services/quote-compilation.helpers.ts
 *
 * Pure-function tests: no Supabase, no network, no mocks needed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveLineBasis,
  resolvePricingMode,
  resolveBaseUsdValue,
  resolveNativePriceForCurrency,
  resolveFreightAddOnUsd,
  buildCompiledLine,
  buildCompilationHash,
} from '../../src/features/quotes/pricing/services/quote-compilation.helpers.ts';

// ── Shared test fixtures ──────────────────────────────────────────────────────

function makeRule(overrides = {}) {
  return {
    id: 'rule-1',
    organizationId: 'org-1',
    pricingRuleSetId: 'set-1',
    skuCode: 'SVCHP-100',
    productName: 'Sweet Corn Chips 100g',
    categoryType: 'chips',
    isActive: true,
    isQuoteable: true,
    exFactoryUsd: 2.5,
    fobUsd: 2.8,
    bulkExFactoryUsdPerKg: null,
    exFactoryInr: 210,
    fobInr: null,
    bulkExFactoryInrPerKg: null,
    sortOrder: 1,
    ...overrides,
  };
}

function makeFreight(overrides = {}) {
  return {
    freightProfileId: 'fp-1',
    chipsAddOnUsdPerUnit: 0.25,
    powdersAddOnUsdPerKg: 0.10,
    freightContext: {},
    ...overrides,
  };
}

// ── resolveLineBasis ──────────────────────────────────────────────────────────

describe('resolveLineBasis', () => {
  test('returns quoteBasis unchanged when basis is ex_factory', () => {
    assert.equal(resolveLineBasis({ quoteBasis: 'ex_factory', rule: makeRule() }), 'ex_factory');
  });

  test('returns quoteBasis unchanged when basis is fob', () => {
    assert.equal(resolveLineBasis({ quoteBasis: 'fob', rule: makeRule() }), 'fob');
  });

  test('returns quoteBasis unchanged when basis is cif', () => {
    assert.equal(resolveLineBasis({ quoteBasis: 'cif', rule: makeRule() }), 'cif');
  });

  test('returns bulk_chips when bulk_chips basis and rule has bulkExFactoryUsdPerKg', () => {
    const rule = makeRule({ bulkExFactoryUsdPerKg: 5.0 });
    assert.equal(resolveLineBasis({ quoteBasis: 'bulk_chips', rule }), 'bulk_chips');
  });

  test('falls back to ex_factory when bulk_chips but rule has no bulk kg price', () => {
    const rule = makeRule({ bulkExFactoryUsdPerKg: null });
    assert.equal(resolveLineBasis({ quoteBasis: 'bulk_chips', rule }), 'ex_factory');
  });
});

// ── resolvePricingMode ────────────────────────────────────────────────────────

describe('resolvePricingMode', () => {
  test('returns bulk_kg when basisApplied is bulk_chips', () => {
    assert.equal(
      resolvePricingMode({ rule: makeRule(), basisApplied: 'bulk_chips' }),
      'bulk_kg',
    );
  });

  test('returns kg when rule has bulkExFactoryUsdPerKg and basis is not bulk_chips', () => {
    const rule = makeRule({ bulkExFactoryUsdPerKg: 5.0 });
    assert.equal(resolvePricingMode({ rule, basisApplied: 'ex_factory' }), 'kg');
  });

  test('returns unit when no kg price and basis is not bulk_chips', () => {
    assert.equal(
      resolvePricingMode({ rule: makeRule(), basisApplied: 'ex_factory' }),
      'unit',
    );
  });
});

// ── resolveBaseUsdValue ───────────────────────────────────────────────────────

describe('resolveBaseUsdValue', () => {
  test('returns exFactoryUsd for ex_factory basis', () => {
    assert.equal(resolveBaseUsdValue({ rule: makeRule(), basisApplied: 'ex_factory' }), 2.5);
  });

  test('returns fobUsd for fob basis', () => {
    assert.equal(resolveBaseUsdValue({ rule: makeRule(), basisApplied: 'fob' }), 2.8);
  });

  test('returns fobUsd as base for cif basis (freight is added separately)', () => {
    assert.equal(resolveBaseUsdValue({ rule: makeRule(), basisApplied: 'cif' }), 2.8);
  });

  test('returns bulkExFactoryUsdPerKg for bulk_chips basis', () => {
    const rule = makeRule({ bulkExFactoryUsdPerKg: 4.5 });
    assert.equal(resolveBaseUsdValue({ rule, basisApplied: 'bulk_chips' }), 4.5);
  });

  test('returns null when the price field is null', () => {
    const rule = makeRule({ exFactoryUsd: null });
    assert.equal(resolveBaseUsdValue({ rule, basisApplied: 'ex_factory' }), null);
  });

  test('returns null when the price field is 0 (not a positive price)', () => {
    const rule = makeRule({ fobUsd: 0 });
    assert.equal(resolveBaseUsdValue({ rule, basisApplied: 'fob' }), null);
  });
});

// ── resolveNativePriceForCurrency ─────────────────────────────────────────────

describe('resolveNativePriceForCurrency', () => {
  test('returns exFactoryInr for INR + ex_factory', () => {
    assert.equal(
      resolveNativePriceForCurrency({ rule: makeRule(), basisApplied: 'ex_factory', displayCurrency: 'INR' }),
      210,
    );
  });

  test('returns null for INR + cif (CIF always converts via FX)', () => {
    assert.equal(
      resolveNativePriceForCurrency({ rule: makeRule(), basisApplied: 'cif', displayCurrency: 'INR' }),
      null,
    );
  });

  test('returns null for non-INR currencies', () => {
    assert.equal(
      resolveNativePriceForCurrency({ rule: makeRule(), basisApplied: 'ex_factory', displayCurrency: 'USD' }),
      null,
    );
  });

  test('returns null when the native INR field itself is null', () => {
    const rule = makeRule({ exFactoryInr: null });
    assert.equal(
      resolveNativePriceForCurrency({ rule, basisApplied: 'ex_factory', displayCurrency: 'INR' }),
      null,
    );
  });
});

// ── resolveFreightAddOnUsd ────────────────────────────────────────────────────

describe('resolveFreightAddOnUsd', () => {
  test('returns null when basis is not cif', () => {
    assert.equal(
      resolveFreightAddOnUsd({ basisApplied: 'ex_factory', pricingMode: 'unit', freight: makeFreight() }),
      null,
    );
  });

  test('returns null when basis is cif but freight is not provided', () => {
    assert.equal(
      resolveFreightAddOnUsd({ basisApplied: 'cif', pricingMode: 'unit', freight: null }),
      null,
    );
  });

  test('returns chipsAddOnUsdPerUnit for unit pricing mode + cif', () => {
    assert.equal(
      resolveFreightAddOnUsd({ basisApplied: 'cif', pricingMode: 'unit', freight: makeFreight() }),
      0.25,
    );
  });

  test('returns powdersAddOnUsdPerKg for kg pricing mode + cif', () => {
    assert.equal(
      resolveFreightAddOnUsd({ basisApplied: 'cif', pricingMode: 'kg', freight: makeFreight() }),
      0.10,
    );
  });

  test('returns powdersAddOnUsdPerKg for bulk_kg pricing mode + cif', () => {
    assert.equal(
      resolveFreightAddOnUsd({ basisApplied: 'cif', pricingMode: 'bulk_kg', freight: makeFreight() }),
      0.10,
    );
  });
});

// ── buildCompiledLine ─────────────────────────────────────────────────────────

describe('buildCompiledLine', () => {
  test('returns null when no valid base USD price exists', () => {
    const rule = makeRule({ exFactoryUsd: null, fobUsd: null });
    const line = buildCompiledLine({
      rule,
      basisApplied: 'ex_factory',
      pricingMode: 'unit',
      displayCurrency: 'USD',
      fxRate: 1,
    });
    assert.equal(line, null);
  });

  test('builds a correct unit line for ex_factory USD basis', () => {
    const rule = makeRule({ unitsPerCase: 12 });
    const line = buildCompiledLine({
      rule,
      basisApplied: 'ex_factory',
      pricingMode: 'unit',
      displayCurrency: 'USD',
      fxRate: 1,
    });
    assert.ok(line != null, 'Expected a non-null line');
    assert.equal(line.finalUnitPrice, 2.5);
    assert.equal(line.finalCasePrice, 30);     // 2.5 × 12
    assert.equal(line.finalKgPrice, null);
    assert.equal(line.displayCurrency, 'USD');
    assert.equal(line.fxRate, 1);
    assert.equal(line.basisApplied, 'ex_factory');
  });

  test('applies FX rate for non-USD display currency', () => {
    const rule = makeRule({ unitsPerCase: 10, exFactoryInr: null }); // no native INR → must use FX
    const line = buildCompiledLine({
      rule,
      basisApplied: 'ex_factory',
      pricingMode: 'unit',
      displayCurrency: 'EUR',
      fxRate: 0.93,
    });
    assert.ok(line != null);
    // 2.5 × 0.93 = 2.325 → rounded to 2.33
    assert.ok(Math.abs((line.finalUnitPrice ?? 0) - 2.33) < 0.01, `Got ${line.finalUnitPrice}`);
  });

  test('prefers native INR price over FX conversion when available', () => {
    const line = buildCompiledLine({
      rule: makeRule(),           // exFactoryInr = 210
      basisApplied: 'ex_factory',
      pricingMode: 'unit',
      displayCurrency: 'INR',
      fxRate: 84,
    });
    assert.ok(line != null);
    assert.equal(line.finalUnitPrice, 210);  // native, not 2.5 × 84 = 210 (coincidence in test data)
    assert.equal(line.calculationMeta.usedNativeCurrency, true);
  });

  test('adds freight add-on for CIF basis', () => {
    const line = buildCompiledLine({
      rule: makeRule(),           // fobUsd = 2.8
      basisApplied: 'cif',
      pricingMode: 'unit',
      displayCurrency: 'USD',
      fxRate: 1,
      freightAddOnUsd: 0.25,
    });
    assert.ok(line != null);
    // 2.8 + 0.25 = 3.05
    assert.equal(line.finalUnitPrice, 3.05);
    assert.equal(line.freightAddOnUsd, 0.25);
  });

  test('builds a correct kg line for bulk pricing mode', () => {
    const rule = makeRule({ bulkExFactoryUsdPerKg: 4.5 });
    const line = buildCompiledLine({
      rule,
      basisApplied: 'bulk_chips',
      pricingMode: 'bulk_kg',
      displayCurrency: 'USD',
      fxRate: 1,
    });
    assert.ok(line != null);
    assert.equal(line.finalKgPrice, 4.5);
    assert.equal(line.finalUnitPrice, null);
    assert.equal(line.finalCasePrice, null);
  });
});

// ── buildCompilationHash ──────────────────────────────────────────────────────

describe('buildCompilationHash', () => {
  const baseInput = {
    quoteId: 'q-1',
    pricingRuleSetId: 'set-1',
    pricingBasis: 'fob' as const,
    displayCurrency: 'USD' as const,
    fxRate: 1,
    freightProfileId: null,
    lines: [],
  };

  test('returns a 64-char hex string (SHA-256)', () => {
    const hash = buildCompilationHash(baseInput);
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]+$/);
  });

  test('is deterministic — same input produces same hash', () => {
    assert.equal(buildCompilationHash(baseInput), buildCompilationHash(baseInput));
  });

  test('changes when quoteId changes', () => {
    const changed = { ...baseInput, quoteId: 'q-2' };
    assert.notEqual(buildCompilationHash(baseInput), buildCompilationHash(changed));
  });

  test('changes when fxRate changes', () => {
    const changed = { ...baseInput, fxRate: 84 };
    assert.notEqual(buildCompilationHash(baseInput), buildCompilationHash(changed));
  });
});
