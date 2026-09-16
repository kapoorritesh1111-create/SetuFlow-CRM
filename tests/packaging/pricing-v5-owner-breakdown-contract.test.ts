import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine=fs.readFileSync('src/lib/packaging-pricing-v5/sup-formula-engine.ts','utf8');
const registry=fs.readFileSync('src/lib/packaging-pricing-v5/engine-registry.ts','utf8');
const ui=fs.readFileSync('public/pricing-v5-matrix-review-truth.js','utf8');
const matrix=fs.readFileSync('public/pricing-v5-matrix-pagination.js','utf8');

test('Pricing v5 owner detail exposes engine-backed reconciled cost breakdown',()=>{
  for(const key of ['material_cost','printing_cost','lamination_cost','slitting_cost','pouch_making_cost','zipper_cost','base_production_cost','waste_cost','margin_cost','additional_charges_cost','final_price']){
    assert.match(engine,new RegExp(key));
  }
  assert.match(engine,/reconciliation_delta/);
  assert.match(registry,/cost_breakdown:\s*result\.cost_breakdown/);
});

test('Premium owner detail renders engine values and selected matrix charges',()=>{
  assert.match(ui,/r\.cost_breakdown\?\.per_unit/);
  assert.match(ui,/Base production cost/);
  assert.match(ui,/Engine reconciled/);
  assert.match(ui,/selected_charge_codes/);
  assert.match(matrix,/selected_charge_codes/);
});
