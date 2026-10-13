import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transform } from 'esbuild';

const source = fs.readFileSync('src/lib/packaging-pricing-v5/frame-saved-line.ts', 'utf8');
const ui = fs.readFileSync('src/features/packaging/components/premium-packaging-quote-builder-v5.tsx','utf8');

test('saved frame lines expose actual dimensions, family and supply form', async () => {
 const js=await transform(source,{loader:'ts',format:'cjs'});
 const exports={};
 const module={exports};
 new Function('module','exports',js.code)(module,exports);
 const lines=module.exports.listPricingV5FrameSavedLineSummaries([
 {id:'css',line_type:'packaging',calculation_version:5,quantity:20000,unit_price:1.97,currency:'INR',input_snapshot_json:{calculation_engine_key:'frame_formula_v5',input:{supply_form:'center_seal_pouch',construction_id:'x',width_mm:120,height_mm:90}}},
 {id:'3ss',line_type:'packaging',calculation_version:5,quantity:20000,unit_price:1.86,currency:'INR',input_snapshot_json:{calculation_engine_key:'frame_formula_v5',input:{supply_form:'three_side_seal_roll',construction_id:'y',width_mm:120,height_mm:90}}}
 ]);
 assert.equal(lines.length,2);
 assert.equal(lines[0].sizeLabel,'120 × 90 mm');
 assert.equal(lines[0].familySlug,'center-seal');
 assert.equal(lines[0].label,'Center Seal Pouch');
 assert.equal(lines[1].sizeLabel,'120 × 90 mm');
 assert.equal(lines[1].familySlug,'3ss');
 assert.equal(lines[1].label,'3 Side Seal Roll');
});
test('all basket and commercial views show persisted size, no generic saved-size fallback for frame lines',()=>{
 assert.match(ui,/line\.sizeLabel/);
 assert.match(ui,/line\.supplyForm/);
 assert.match(ui,/Dimensions not specified/);
 assert.match(ui,/line\.label\?\?familyMeta\(family\)\.label/);
});
