import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {transform} from 'esbuild';
const src=fs.readFileSync('src/lib/packaging-pricing-v5/customer-quote-unit.ts','utf8');
const generated=(await transform(src,{loader:'ts',format:'cjs'})).code;const module={exports:{}};new Function('module','exports',generated)(module,module.exports);
const resolve=module.exports.resolveFrameQuotePresentation;
const line=(form,unit)=>({quantity:20000,unit_price:2.5,input_snapshot_json:{calculation_engine_key:'frame_formula_v5',input:{supply_form:form}},pricing_breakdown_json:{roll_weight:{finished_weight_kg:100},...(unit?{customer_quote_unit:unit}:{})}});
test('roll defaults kg, pouch defaults pcs and either may override',()=>{
 assert.equal(resolve(line('center_seal_roll')).unit,'kg');
 assert.equal(resolve(line('three_side_seal_pouch')).unit,'pcs');
 assert.equal(resolve(line('center_seal_roll','pcs')).unit,'pcs');
 assert.equal(resolve(line('three_side_seal_pouch','kg')).unit,'kg');
});
test('unit conversion preserves final amount including negotiated price',()=>{
 const item=line('three_side_seal_roll','kg');item.unit_price=2.35;
 const v=resolve(item);assert.equal(v.total,47000);assert.equal(v.displayQuantity,100);assert.equal(v.displayPrice,470);
 assert.equal(resolve(line('three_side_seal_roll','pcs')).total,50000);
});
test('kg requires positive saved weight, legacy non-frame pricing stays unchanged',()=>{
 const item=line('three_side_seal_roll','kg');item.pricing_breakdown_json.roll_weight.finished_weight_kg=0;
 assert.equal(resolve(item).invalidKg,true);assert.equal(resolve(item).unit,'pcs');
 const other={quantity:100,unit_price:40,pricing_breakdown_json:{customer_quote_unit:'kg'}};
 assert.equal(resolve(other).unit,'pcs');
});
test('pdf and customer link share the same presentation helper',()=>{
 const pdf=fs.readFileSync('src/app/api/quotes/[quoteId]/pdf/route.ts','utf8');
 const web=fs.readFileSync('src/app/quote-review/[token]/page.tsx','utf8');
 assert.match(pdf,/resolveFrameQuotePresentation\(line\)/);
 assert.match(web,/resolveFrameQuotePresentation\(line\)/);
});
