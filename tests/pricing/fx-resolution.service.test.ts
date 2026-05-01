/**
 * Unit tests — FX Resolution Service
 * src/features/quotes/pricing/services/fx-resolution.service.ts
 *
 * Uses lightweight in-process mock repositories — no Supabase required.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DefaultFxResolutionService } from '../../src/features/quotes/pricing/services/fx-resolution.service.ts';

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeExchangeRateRepo(snapshot = null) {
  return {
    async getLatestRate(_args) {
      return snapshot;
    },
  };
}

function makeService(snapshot = null) {
  return new DefaultFxResolutionService({
    exchangeRateRepository: makeExchangeRateRepo(snapshot),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DefaultFxResolutionService', () => {
  test('returns identity snapshot (rate=1) when displayCurrency is USD', async () => {
    const service = makeService();
    const result = await service.resolve({
      displayCurrency: 'USD',
      allowManualFx: false,
      manualRate: null,
      asOf: null,
    });
    assert.equal(result.rate, 1);
    assert.equal(result.displayCurrency, 'USD');
    assert.equal(result.provider, 'system_identity');
  });

  test('returns manual snapshot when allowManualFx=true and manualRate is set', async () => {
    const service = makeService();
    const result = await service.resolve({
      displayCurrency: 'INR',
      allowManualFx: true,
      manualRate: 84,
      asOf: null,
    });
    assert.equal(result.rate, 84);
    assert.equal(result.provider, 'manual_override');
    assert.equal(result.displayCurrency, 'INR');
  });

  test('fetches rate from repository when manual FX is not eligible', async () => {
    const snapshot = {
      baseCurrency: 'USD',
      displayCurrency: 'INR',
      rate: 83.5,
      provider: 'open_exchange',
      effectiveAt: '2026-01-01T00:00:00.000Z',
    };
    const service = makeService(snapshot);
    const result = await service.resolve({
      displayCurrency: 'INR',
      allowManualFx: false,
      manualRate: null,
      asOf: null,
    });
    assert.equal(result.rate, 83.5);
    assert.equal(result.provider, 'open_exchange');
  });

  test('throws when repository returns no snapshot for a non-USD currency', async () => {
    const service = makeService(null); // no snapshot
    await assert.rejects(
      () =>
        service.resolve({
          displayCurrency: 'EUR',
          allowManualFx: false,
          manualRate: null,
          asOf: null,
        }),
      /No exchange rate snapshot/,
    );
  });

  test('USD identity path does not call the repository', async () => {
    let repoCalled = false;
    const service = new DefaultFxResolutionService({
      exchangeRateRepository: {
        async getLatestRate() {
          repoCalled = true;
          return null;
        },
      },
    });
    await service.resolve({ displayCurrency: 'USD', allowManualFx: false, manualRate: null, asOf: null });
    assert.equal(repoCalled, false);
  });

  test('manual FX path does not call the repository', async () => {
    let repoCalled = false;
    const service = new DefaultFxResolutionService({
      exchangeRateRepository: {
        async getLatestRate() {
          repoCalled = true;
          return null;
        },
      },
    });
    await service.resolve({ displayCurrency: 'INR', allowManualFx: true, manualRate: 84, asOf: null });
    assert.equal(repoCalled, false);
  });
});
