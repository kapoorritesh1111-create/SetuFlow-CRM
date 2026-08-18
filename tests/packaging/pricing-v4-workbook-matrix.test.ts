import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatrixPerFrame, matrixGeometry } from '../../src/lib/packaging-pricing/matrix-per-frame-engine';
import type { PricingContext } from '../../src/lib/packaging-pricing/types';

function context(supplyForm:'center_seal'|'three_side_seal_roll'|'three_side_seal_pouch', productId:string, construction:string, rates:number[]):PricingContext {
  return {
    template:{
      id:'tpl',family_id:'family',name:'Workbook pricing',currency:'INR',calculation_version:4,
      calculation_engine_key:'matrix_per_frame',status:'draft',
      production_rules_json:{machine_width_mm:740,machine_length_mm:1120},
      quote_config_json:{gst_pct:18,workbook_model:'dimension_construction_price_breaks',tiers:{Q1:250,Q2:500,Q3:1000,Q4:2000,Q5:3000}},
    },
    masters:[],charges:[],recipes:[],bands:[],variations:[],
    matrixRows:[{
      id:'row',supply_form:supplyForm,construction_key:construction,client_product_id:productId,width_mm:null,height_mm:null,
      q1_rate_per_frame:rates[0],q2_rate_per_frame:rates[1],q3_rate_per_frame:rates[2],q4_rate_per_frame:rates[3],q5_rate_per_frame:rates[4],
      source_worksheet:supplyForm==='center_seal'?'CS DATA':supplyForm==='three_side_seal_roll'?'3SS ROLL FORM DATA':'3SS POUCH FORM DATA',
      source_row_number:2,source_reference:'client workbook',metadata:{},
    }],
  };
}

test('S51-PKG-046 rebuild: Center Seal uses workbook fixed orientation and never best-rotates',()=>{
  const g=matrixGeometry(500,100,'center_seal');
  assert.equal(g.across,1);
  assert.equal(g.along,11);
  assert.equal(g.pouches_per_frame,11);
  assert.equal(g.orientation,'fixed_width_across');
});

test('S51-PKG-046 rebuild: Center Seal 100x140 SPPL88 reproduces the client Q1-Q5 quantity breaks',()=>{
  const c=context('center_seal','SPPL88','3 layer - 12 pet + 12 metpet + 95 PE - Roll form',[115,110,98,92.5,87.5]);
  const result=calculateMatrixPerFrame(c,{width_mm:100,height_mm:140,supply_form:'center_seal',client_product_id:'SPPL88',tier:'Q1'});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_calculation.pouches_per_frame,56);
  assert.equal(result.customer_requirement.quantity,14000);
  assert.ok(Math.abs(result.selling_price.unit_price-2.05357143)<0.00000001);
  const breaks=result.production_calculation.price_breaks as any[];
  assert.deepEqual(breaks.map(x=>x.quantity),[14000,28000,56000,112000,168000]);
  assert.deepEqual(breaks.map(x=>x.frame_quantity),[250,500,1000,2000,3000]);
  assert.equal('frame_rate' in breaks[0],false,'Sales-safe break payload must not expose the workbook frame rate');
});

test('S51-PKG-046 rebuild: 3SS Roll 148x50 SPPL200 reproduces 110 pieces/frame and Q1 price',()=>{
  const c=context('three_side_seal_roll','SPPL200','3 layer - 12 pet + 9 Al foil + 60 PE - Roll form',[122,117,103,97.5,92.5]);
  const result=calculateMatrixPerFrame(c,{width_mm:148,height_mm:50,supply_form:'three_side_seal_roll',client_product_id:'SPPL200',tier:'Q1'});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_calculation.pouches_per_frame,110);
  assert.equal(result.customer_requirement.quantity,27500);
  assert.ok(Math.abs(result.selling_price.unit_price-1.10909091)<0.00000001);
});

test('S51-PKG-046 rebuild: 3SS Pouch 60x60 SPPL236 derives 132mm open laminate and 90 pieces/frame',()=>{
  const c=context('three_side_seal_pouch','SPPL236','3 layer - 18 matt bopp + 12 metpet + 60 PE - Pouch form',[122,117,108.44,100.75,94.625]);
  const result=calculateMatrixPerFrame(c,{width_mm:60,height_mm:60,supply_form:'three_side_seal_pouch',client_product_id:'SPPL236',tier:'Q1'});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_calculation.open_laminate_width_mm,132);
  assert.equal(result.production_calculation.repeat_length_mm,60);
  assert.equal(result.production_calculation.pouches_per_frame,90);
  assert.equal(result.customer_requirement.quantity,22500);
  assert.ok(Math.abs(result.selling_price.unit_price-1.35555556)<0.00000001);
});

test('S51-PKG-046 rebuild: workbook pricing rejects arbitrary quantities instead of inventing interpolation',()=>{
  const c=context('center_seal','SPPL88','construction',[115,110,98,92.5,87.5]);
  const result=calculateMatrixPerFrame(c,{width_mm:100,height_mm:140,supply_form:'center_seal',client_product_id:'SPPL88',tier:'Q1',quantity:5000});
  assert.equal(result.ok,false);
  assert.match(result.validation_errors.join(' '),/only the five approved frame breaks/i);
});
