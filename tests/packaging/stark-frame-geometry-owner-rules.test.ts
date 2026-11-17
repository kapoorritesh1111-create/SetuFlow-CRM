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

// Center Seal pouch retains the existing open-width inputs.
test('Center Seal pouch uses entered open laminate width', () => {
  const g = resolveFrameFamilyGeometryV5('center_seal_pouch', 140, 200);
  assert.equal(g.open_laminate_width_mm, 140);
  assert.equal(g.repeat_length_mm, 200);
  assert.equal(g.across, 5);
  assert.equal(g.along, 5);
  assert.equal(g.units_per_frame, 25);
  assert.equal(g.apply_pouching, true);
});

test('3SS pouch converts finished 210 x 270 dimensions into approved production geometry', () => {
  const g = resolveFrameFamilyGeometryV5('three_side_seal_pouch', 210, 270);
  assert.equal(g.open_laminate_width_mm, 552);
  assert.equal(g.repeat_length_mm, 210);
  assert.equal(g.across, 1);
  assert.equal(g.along, 5);
  assert.equal(g.units_per_frame, 5);
  assert.equal(g.apply_pouching, true);
});
test('3SS pouch also matches approved workbook 85 x 135 example', () => {
  const g = resolveFrameFamilyGeometryV5('three_side_seal_pouch', 85, 135);
  assert.equal(g.open_laminate_width_mm, 282);
  assert.equal(g.repeat_length_mm, 85);
  assert.equal(g.across, 2);
  assert.equal(g.along, 13);
  assert.equal(g.units_per_frame, 26);
});

test('3SS roll uses entered open width and repeat length', () => {
  const g = resolveFrameFamilyGeometryV5('three_side_seal_roll', 150, 220);
  assert.equal(g.open_laminate_width_mm, 150);
  assert.equal(g.repeat_length_mm, 220);
  assert.equal(g.across, 4);
  assert.equal(g.along, 5);
  assert.equal(g.units_per_frame, 20);
  assert.equal(g.apply_pouching, false);
});

test('all unaffected frame forms preserve entered open width', () => {
  for (const form of ['center_seal_roll', 'center_seal_pouch', 'three_side_seal_roll'] as const) {
    const g = resolveFrameFamilyGeometryV5(form, 300, 200);
    assert.equal(g.open_laminate_width_mm, 300, form);
    assert.equal(g.repeat_length_mm, 200, form);
    assert.equal(g.across, 2, form);
    assert.equal(g.along, 5, form);
    assert.equal(g.units_per_frame, 10, form);
  }
});
