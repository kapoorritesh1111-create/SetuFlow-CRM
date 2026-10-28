import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFrameFamilyGeometryV5 } from '../../src/lib/packaging-pricing-v5/frame-family-geometry';

// Akshay: Center Seal roll takes open width as entered.
test('Center Seal roll uses entered open width and repeat', () => {
  const g = resolveFrameFamilyGeometryV5('center_seal_roll', 300, 200);
  assert.equal(g.open_laminate_width_mm, 300);
  assert.equal(g.repeat_length_mm, 200);
  assert.equal(g.units_per_frame, 10);
  assert.equal(g.apply_pouching, false);
});

// Akshay: Center Seal pouch takes finished pouch width, not open width.
test('Center Seal pouch converts finished pouch width to laminate open width', () => {
  const g = resolveFrameFamilyGeometryV5('center_seal_pouch', 140, 200);
  assert.equal(g.open_laminate_width_mm, 300);
  assert.equal(g.repeat_length_mm, 200);
  assert.equal(g.units_per_frame, 10);
  assert.equal(g.apply_pouching, true);
});

// Akshay: 3SS pouch turns artwork 90 degrees: across uses twice height + 12.
test('3SS pouch uses rotated web layout and sealing allowance', () => {
  const g = resolveFrameFamilyGeometryV5('three_side_seal_pouch', 140, 140);
  assert.equal(g.open_laminate_width_mm, 292);
  assert.equal(g.repeat_length_mm, 140);
  assert.equal(g.across, 2);
  assert.equal(g.along, 8);
  assert.equal(g.apply_pouching, true);
});

// Akshay: 3SS roll uses book-fold laminate, not pouch making orientation.
test('3SS roll uses doubled pouch width and repeat height', () => {
  const g = resolveFrameFamilyGeometryV5('three_side_seal_roll', 150, 220);
  assert.equal(g.open_laminate_width_mm, 300);
  assert.equal(g.repeat_length_mm, 220);
  assert.equal(g.across, 2);
  assert.equal(g.along, 5);
  assert.equal(g.apply_pouching, false);
});
