/**
 * Unit tests — Quote Compilation Service (with mock dependencies)
 * src/features/quotes/pricing/services/quote-compilation.service.ts
 *
 * Tests the orchestration logic: how the service assembles FX, freight,
 * rules, and compiled lines into a CompiledQuoteResult.
 *
 * All dependencies are lightweight in-process mocks — no Supabase required.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DefaultQuoteCompilationService } from '../../src/features/quotes/pricing/services/quote-compilation.service.ts';

// ── Shared fixture builders ───────────────────────────────────────────────────

function makeQuoteParent(overrides = {}) {
  return {
    id: 'quote-1',
    organizationId: 'org-1',
    leadId: 'lead-1',
    rfqId: null,
    quoteNumber: 'Q-00025',
    destinationPort: 'INNSA',
    validUntil: '2026-06-01',
    pricingBasis: 'fob',
    displayCurrency: 'USD',
    currentVersionId: null,
    ...overrides,
  };
}

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
    exFactoryInr: null,
    fobInr: null,
    bulkExFactoryInrPerKg: null,
    unitsPerCase: 12,
    sortOrder: 1,
    ...overrides,
  };
}

function makeFxResult(rate = 1, displayCurrency = 'USD') {
  return {
    baseCurrency: 'USD',
    displayCurrency,
    rate,
    provider: 'test_mock',
    effectiveAt: new Date().toISOString(),
  };
}

function makeFreightResult(overrides = {}) {
  return {
    freightProfileId: 'fp-1',
    chipsAddOnUsdPerUnit: 0.25,
    powdersAddOnUsdPerKg: 0.10,
    freightContext: {},
    ...overrides,
  };
}

function makeService({ rules = [makeRule()], quoteParent = makeQuoteParent(), fxRate = 1, freight = null } = {}) {
  return new DefaultQuoteCompilationService({
    pricingRuleRepository: {
      async listActiveRules() { return rules; },
    },
    quotePricingRepository: {
      async getQuoteParent() { return quoteParent; },
    },
    fxResolutionService: {
      async resolve() { return makeFxResult(fxRate); },
    },
    freightCalculationService: {
      async calculate() { return freight ?? makeFreightResult(); },
    },
  });
}

// ── compile() ────────────────────────────────────────────────────────────────

describe('DefaultQuoteCompilationService.compile', () => {
  const baseInput = {
    organizationId: 'org-1',
    quoteId: 'quote-1',
    pricingRuleSetId: 'set-1',
    pricingBasis: 'fob' as const,
    displayCurrency: 'USD' as const,
  };

  test('throws when quote parent is not found', async () => {
    const service = makeService({ quoteParent: null });
    await assert.rejects(
      () => service.compile(baseInput),
      /Quote parent not found/,
    );
  });

  test('returns a result with the correct quoteId and pricingRuleSetId', async () => {
    const service = makeService();
    const result = await service.compile(baseInput);
    assert.equal(result.quoteId, 'quote-1');
    assert.equal(result.pricingRuleSetId, 'set-1');
    assert.equal(result.pricingBasis, 'fob');
    assert.equal(result.displayCurrency, 'USD');
  });

  test('includes fx snapshot in result', async () => {
    const service = makeService({ fxRate: 1 });
    const result = await service.compile(baseInput);
    assert.equal(result.fx.rate, 1);
  });

  test('freight is null when pricingBasis is fob (not cif)', async () => {
    const service = makeService();
    const result = await service.compile({ ...baseInput, pricingBasis: 'fob' });
    assert.equal(result.freight, null);
  });

  test('freight is null when pricingBasis is cif but no freightProfileId', async () => {
    const service = makeService();
    const result = await service.compile({
      ...baseInput,
      pricingBasis: 'cif',
      freightProfileId: null,
    });
    assert.equal(result.freight, null);
  });

  test('freight is computed when pricingBasis is cif and freightProfileId is set', async () => {
    let freightCalled = false;
    const service = new DefaultQuoteCompilationService({
      pricingRuleRepository: { async listActiveRules() { return [makeRule()]; } },
      quotePricingRepository: { async getQuoteParent() { return makeQuoteParent(); } },
      fxResolutionService: { async resolve() { return makeFxResult(); } },
      freightCalculationService: {
        async calculate() {
          freightCalled = true;
          return makeFreightResult();
        },
      },
    });
    const result = await service.compile({
      ...baseInput,
      pricingBasis: 'cif',
      freightProfileId: 'fp-1',
    });
    assert.equal(freightCalled, true);
    assert.ok(result.freight != null);
  });

  test('lines are sorted by sortOrder ascending', async () => {
    const rules = [
      makeRule({ skuCode: 'B', productName: 'Beetroot', sortOrder: 2 }),
      makeRule({ skuCode: 'A', productName: 'Apple', sortOrder: 1 }),
      makeRule({ skuCode: 'C', productName: 'Carrot', sortOrder: 3 }),
    ];
    const service = makeService({ rules });
    const result = await service.compile(baseInput);
    assert.equal(result.lines[0].skuCode, 'A');
    assert.equal(result.lines[1].skuCode, 'B');
    assert.equal(result.lines[2].skuCode, 'C');
  });

  test('lines with no valid base USD price are excluded from results', async () => {
    const rules = [
      makeRule({ skuCode: 'VALID', fobUsd: 2.8, sortOrder: 1 }),
      makeRule({ skuCode: 'NO-PRICE', exFactoryUsd: null, fobUsd: null, sortOrder: 2 }),
    ];
    const service = makeService({ rules });
    const result = await service.compile(baseInput);
    assert.equal(result.lines.length, 1);
    assert.equal(result.lines[0].skuCode, 'VALID');
  });

  test('totalLineCount matches the number of compiled lines', async () => {
    const rules = [makeRule({ skuCode: 'A', sortOrder: 1 }), makeRule({ skuCode: 'B', sortOrder: 2 })];
    const service = makeService({ rules });
    const result = await service.compile(baseInput);
    assert.equal(result.totalLineCount, result.lines.length);
  });

  test('result includes a non-empty sourceHash (SHA-256 hex)', async () => {
    const service = makeService();
    const result = await service.compile(baseInput);
    assert.equal(typeof result.sourceHash, 'string');
    assert.equal(result.sourceHash.length, 64);
    assert.match(result.sourceHash, /^[0-9a-f]+$/);
  });

  test('sourceHash changes when pricingBasis changes', async () => {
    const service = makeService();
    const fob = await service.compile({ ...baseInput, pricingBasis: 'fob' });
    const ex  = await service.compile({ ...baseInput, pricingBasis: 'ex_factory' });
    assert.notEqual(fob.sourceHash, ex.sourceHash);
  });

  test('quoteContext contains organizationId and quoteNumber from quote parent', async () => {
    const service = makeService();
    const result = await service.compile(baseInput);
    assert.equal(result.quoteContext.organizationId, 'org-1');
    assert.equal(result.quoteContext.quoteNumber, 'Q-00025');
  });

  test('calculationPayload records the rule and line counts', async () => {
    const rules = [makeRule(), makeRule({ skuCode: 'X', sortOrder: 2 })];
    const service = makeService({ rules });
    const result = await service.compile(baseInput);
    assert.equal(result.calculationPayload.pricingRuleCount, 2);
    assert.equal(result.calculationPayload.lineCount, 2);
  });
});
