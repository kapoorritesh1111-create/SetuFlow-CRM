/**
 * Unit tests — S24-SPEN-205 Packaging Pricing Engine
 * src/lib/packaging/pricing-engine.ts
 *
 * Pure-function tests: no Supabase, no network, no mocks needed.
 * The Stand Up Pouch template mirrors the seeded sup-pet-metpet-pe rules so
 * these numbers match what the Quote Builder shows for the same inputs.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePackagingPrice, buildPackagingSpecSummary, PACKAGING_ENGINE_VERSION } from '../../src/lib/packaging/pricing-engine';
import { PACKAGING_TEMPLATE_SEEDS } from '../../src/lib/packaging/seed-data';
import type { PackagingCalculationInput, PackagingPricingTemplate } from '../../src/lib/packaging/types';

function seededTemplate(slug: string): PackagingPricingTemplate {
  const seed = PACKAGING_TEMPLATE_SEEDS.find((template) => template.slug === slug);
  if (!seed) throw new Error(`seed ${slug} missing`);
  return {
    id: `test-${slug}`,
    organization_id: 'test-org',
    family_id: 'test-family',
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    currency: seed.currency,
    is_active: true,
    calculation_version: 1,
    allowed_dimension_ranges_json: seed.allowed_dimension_ranges_json,
    material_rates_json: seed.material_rates_json,
    print_rules_json: seed.print_rules_json,
    finish_addon_rates_json: seed.finish_addon_rates_json,
    moq_tiers_json: seed.moq_tiers_json,
    setup_charges_json: seed.setup_charges_json,
    rush_options_json: seed.rush_options_json,
    lead_time_rules_json: seed.lead_time_rules_json,
    waste_factor_pct: seed.waste_factor_pct,
  };
}

const POUCH_INPUT: PackagingCalculationInput = {
  width_mm: 180,
  height_mm: 260,
  gusset_mm: 80,
  material_key: 'pet_metpet_pe',
  print_colors: 6,
  finish_keys: ['matte', 'zipper', 'tear_notch'],
  quantity: 10000,
  designs: 1,
  artwork_status: 'print_ready',
  rush_key: null,
};

describe('dimensional pouch calculation', () => {
  test('computes a deterministic snapshot-verifiable price', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const result = calculatePackagingPrice(template, POUCH_INPUT);
    assert.equal(result.ok, true, result.validation_errors.join('; '));

    // Area: (180 * (260 + 80)) * 2 / 1e6 = 0.1224 sqm; +10% waste = 0.13464
    assert.ok(Math.abs(result.meta.area_sqm_per_unit - 0.1224) < 1e-9);
    assert.ok(Math.abs(result.meta.billable_area_sqm_per_unit - 0.13464) < 1e-9);

    // Expected total derived from the template's own rates so the test
    // verifies the engine formula, independent of sample rate tuning:
    // perUnit = billableArea*materialRate*(colorMultiplier) + matteRate*area
    //           + zipper + tearNotch; tier 10k+ multiplier; + required setup.
    const billable = result.meta.billable_area_sqm_per_unit;
    const materialRate = template.material_rates_json.find((m) => m.key === 'pet_metpet_pe')!.rate_per_sqm!;
    const colorMult = 1.35; // 6 colors tier on this template
    const finishRate = (key: string) => template.finish_addon_rates_json.find((f) => f.key === key)!.rate;
    const perUnit = billable * materialRate * colorMult + billable * finishRate('matte') + finishRate('zipper') + finishRate('tear_notch');
    const setup = template.setup_charges_json.filter((c) => c.required).reduce((sum, c) => sum + c.amount, 0);
    const expectedTotal = Math.round((perUnit * 10000 * 0.85 + setup) * 100) / 100;
    assert.equal(result.total_price, expectedTotal);
    assert.equal(result.unit_price, Math.round((expectedTotal / 10000) * 100) / 100);
    assert.equal(result.currency, 'INR');
    assert.equal(result.calculation_version, PACKAGING_ENGINE_VERSION);
    assert.equal(result.lead_time, '10-12 business days');

    // Tier adjustment appears as a negative breakdown line.
    const tierLine = result.breakdown.find((line) => line.key === 'tier');
    assert.ok(tierLine && tierLine.amount < 0);
    // Setup charge is present.
    assert.ok(result.breakdown.some((line) => line.key === 'setup_cylinder_prepress' && line.amount === 2000));
  });

  test('rush uplift applies to variable total, not setup', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const base = calculatePackagingPrice(template, POUCH_INPUT);
    const rush = calculatePackagingPrice(template, { ...POUCH_INPUT, rush_key: 'rush' });
    assert.equal(rush.ok, true);
    const setup = template.setup_charges_json.filter((c) => c.required).reduce((sum, c) => sum + c.amount, 0);
    const variable = base.total_price - setup;
    const expected = Math.round((variable * 1.15 + setup) * 100) / 100;
    assert.ok(Math.abs(rush.total_price - expected) < 0.05, `${rush.total_price} vs ${expected}`);
    assert.equal(rush.lead_time, '5-7 business days');
  });

  test('rejects out-of-range dimensions with a clear message', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const result = calculatePackagingPrice(template, { ...POUCH_INPUT, width_mm: 500 });
    assert.equal(result.ok, false);
    assert.ok(result.validation_errors.some((error) => error.includes('Width must be between 80 and 300')));
    assert.equal(result.total_price, 0);
  });

  test('rejects quantity below MOQ', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const result = calculatePackagingPrice(template, { ...POUCH_INPUT, quantity: 500 });
    assert.equal(result.ok, false);
    assert.ok(result.validation_errors.some((error) => error.includes('below the template MOQ')));
  });

  test('missing material and dimensions are all reported', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const result = calculatePackagingPrice(template, { quantity: 2000 });
    assert.equal(result.ok, false);
    assert.ok(result.validation_errors.length >= 3);
  });

  test('warns about better quantity tier without blocking', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const result = calculatePackagingPrice(template, { ...POUCH_INPUT, quantity: 6000 });
    assert.equal(result.ok, true);
    assert.ok(result.warnings.some((warning) => warning.includes('10,000')));
  });

  test('missing artwork status produces a warning, not an error', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const result = calculatePackagingPrice(template, { ...POUCH_INPUT, artwork_status: null });
    assert.equal(result.ok, true);
    assert.ok(result.warnings.some((warning) => warning.includes('Artwork status')));
  });
});

describe('label calculation', () => {
  test('uses flat area formula with waste and color multiplier', () => {
    const template = seededTemplate('dl-standard-matte-permanent');
    const result = calculatePackagingPrice(template, {
      width_mm: 100,
      height_mm: 150,
      material_key: 'bopp_white_60',
      print_colors: 2,
      finish_keys: ['matte_lamination'],
      quantity: 2500,
      designs: 1,
      artwork_status: 'print_ready',
    });
    assert.equal(result.ok, true, result.validation_errors.join('; '));
    // Area 0.015 sqm, +8% waste = 0.0162. Expected derived from template rates:
    const billable = result.meta.billable_area_sqm_per_unit;
    assert.ok(Math.abs(billable - 0.0162) < 1e-9);
    const materialRate = template.material_rates_json.find((m) => m.key === 'bopp_white_60')!.rate_per_sqm!;
    const matteRate = template.finish_addon_rates_json.find((f) => f.key === 'matte_lamination')!.rate;
    const perUnit = billable * materialRate * 1.25 + billable * matteRate; // 2 colors → 1.25x tier
    const setup = template.setup_charges_json.filter((c) => c.required).reduce((sum, c) => sum + c.amount, 0);
    const expected = Math.round((perUnit * 2500 * 0.92 + setup) * 100) / 100;
    assert.equal(result.total_price, expected);
  });
});

describe('service pricing mode', () => {
  test('sums per-design and per-job service items', () => {
    const template = seededTemplate('prepress-artwork-check-proof');
    const result = calculatePackagingPrice(template, {
      service_item_keys: ['artwork_check', 'color_management'],
      designs: 2,
      quantity: 1,
      artwork_status: 'needs_prepress',
    });
    assert.equal(result.ok, true, result.validation_errors.join('; '));
    // artwork_check 750 * 2 designs + color_management 1200 per job = 2700
    assert.equal(result.total_price, 2700);
    assert.ok(result.warnings.some((warning) => warning.includes('pre-press')));
  });

  test('per-piece service items require quantity', () => {
    const template = seededTemplate('vdp-barcode-qr-serial');
    const missing = calculatePackagingPrice(template, { service_item_keys: ['vdp_per_piece'] });
    assert.equal(missing.ok, false);
    const ok = calculatePackagingPrice(template, { service_item_keys: ['vdp_per_piece', 'data_setup'], quantity: 10000 });
    assert.equal(ok.ok, true, ok.validation_errors.join('; '));
    // 0.35 * 10000 * 0.9 tier + 750 job setup item = 3150 + 750
    assert.equal(ok.total_price, 3900);
  });

  test('requires at least one service item', () => {
    const template = seededTemplate('prepress-artwork-check-proof');
    const result = calculatePackagingPrice(template, { quantity: 1 });
    assert.equal(result.ok, false);
    assert.ok(result.validation_errors.some((error) => error.includes('service item')));
  });
});

describe('spec summary', () => {
  test('builds a human-readable one-liner', () => {
    const template = seededTemplate('sup-pet-metpet-pe');
    const summary = buildPackagingSpecSummary('Stand Up Pouches', template, POUCH_INPUT);
    assert.ok(summary.includes('Stand Up Pouches'));
    assert.ok(summary.includes('180 × 260 × 80 mm'));
    assert.ok(summary.includes('PET / MET PET / PE'));
    assert.ok(summary.includes('10,000 pcs'));
  });
});
