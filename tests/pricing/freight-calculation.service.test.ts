/**
 * Unit tests — Freight Calculation Service
 * src/features/quotes/pricing/services/freight-calculation.service.ts
 *
 * Tests service orchestration with lightweight in-process repositories.
 * No Supabase, network, or external freight providers are required.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DefaultFreightCalculationService } from '../../src/features/quotes/pricing/services/freight-calculation.service.ts';
import type { FreightProfileAggregate } from '../../src/features/quotes/pricing/repositories/types.ts';
import type { CurrencyCode } from '../../src/features/quotes/pricing/types/index.ts';

function makeProfile(overrides: Partial<FreightProfileAggregate> = {}): FreightProfileAggregate {
  return {
    freightProfileId: 'fp-1',
    organizationId: 'org-1',
    destinationPort: 'INNSA',
    items: [
      {
        id: 'item-usd',
        lineNo: 1,
        particular: 'Ocean freight',
        inputCurrency: 'USD',
        amount: 2_000,
        appliesToContainerType: '40ft',
        isActive: true,
      },
    ],
    assumptions: {
      id: 'assumptions-1',
      chipsMode: '40ft',
      powdersMode: '40ft',
      palletsPer40Ft: 20,
      palletsPer20Ft: 10,
      casesPerPallet: 10,
      bagsPerCase: 10,
      kgPerPallet: 500,
      twentyFtFactor: 0.5,
    },
    ...overrides,
  };
}

function makeService(profile: FreightProfileAggregate | null) {
  const fxCalls: CurrencyCode[] = [];

  const service = new DefaultFreightCalculationService({
    freightProfileRepository: {
      async getActiveProfile(args) {
        assert.equal(args.organizationId, 'org-1');
        assert.equal(args.freightProfileId, 'fp-1');
        return profile;
      },
    },
    fxResolutionService: {
      async resolve(input) {
        fxCalls.push(input.displayCurrency);
        if (input.displayCurrency === 'INR') {
          return {
            baseCurrency: 'USD',
            displayCurrency: 'INR',
            rate: 84,
            provider: 'test_mock',
            effectiveAt: '2026-01-01T00:00:00.000Z',
          };
        }

        return {
          baseCurrency: 'USD',
          displayCurrency: input.displayCurrency,
          rate: 1,
          provider: 'test_mock',
          effectiveAt: '2026-01-01T00:00:00.000Z',
        };
      },
    },
  });

  return { service, fxCalls };
}

describe('DefaultFreightCalculationService.calculate', () => {
  const input = {
    organizationId: 'org-1',
    freightProfileId: 'fp-1',
    displayCurrency: 'USD' as const,
    quoteContext: { quoteId: 'quote-1' },
  };

  test('throws when the active freight profile is missing', async () => {
    const { service } = makeService(null);

    await assert.rejects(
      () => service.calculate(input),
      /Active freight profile not found/,
    );
  });

  test('throws when the profile has no freight assumptions', async () => {
    const { service } = makeService(makeProfile({ assumptions: null }));

    await assert.rejects(
      () => service.calculate(input),
      /Freight assumptions not found/,
    );
  });

  test('calculates chips and powders add-ons from a USD-only freight profile', async () => {
    const { service, fxCalls } = makeService(makeProfile());

    const result = await service.calculate(input);

    assert.equal(result.freightProfileId, 'fp-1');
    assert.equal(result.chipsAddOnUsdPerUnit, 1);
    assert.equal(result.powdersAddOnUsdPerKg, 0.2);
    assert.equal(result.freightContext.destinationPort, 'INNSA');
    assert.equal(result.freightContext.totalFreightUsd, 2_000);
    assert.deepEqual(result.freightContext.fxRatesByCurrency, { USD: 1 });
    assert.equal(fxCalls.length, 0, 'USD freight should not call FX resolution');
  });

  test('converts non-USD active freight items through the FX service once per currency', async () => {
    const profile = makeProfile({
      items: [
        {
          id: 'item-inr-1',
          lineNo: 1,
          particular: 'Local haulage',
          inputCurrency: 'INR',
          amount: 84_000,
          appliesToContainerType: '40ft',
          isActive: true,
        },
        {
          id: 'item-inr-2',
          lineNo: 2,
          particular: 'Port charges',
          inputCurrency: 'INR',
          amount: 84_000,
          appliesToContainerType: '40ft',
          isActive: true,
        },
      ],
    });
    const { service, fxCalls } = makeService(profile);

    const result = await service.calculate(input);

    assert.equal(result.freightContext.totalFreightUsd, 2_000);
    assert.deepEqual(result.freightContext.fxRatesByCurrency, { INR: 84 });
    assert.deepEqual(fxCalls, ['INR']);
  });

  test('ignores inactive freight items when calculating totals and FX calls', async () => {
    const profile = makeProfile({
      items: [
        {
          id: 'active-usd',
          lineNo: 1,
          particular: 'Ocean freight',
          inputCurrency: 'USD',
          amount: 2_000,
          isActive: true,
        },
        {
          id: 'inactive-inr',
          lineNo: 2,
          particular: 'Inactive charge',
          inputCurrency: 'INR',
          amount: 84_000,
          isActive: false,
        },
      ],
    });
    const { service, fxCalls } = makeService(profile);

    const result = await service.calculate(input);

    assert.equal(result.freightContext.totalFreightUsd, 2_000);
    assert.deepEqual(result.freightContext.fxRatesByCurrency, { USD: 1 });
    assert.deepEqual(fxCalls, []);
  });
});
