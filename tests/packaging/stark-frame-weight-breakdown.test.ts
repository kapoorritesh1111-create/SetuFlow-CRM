import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFrameFamilyPriceReviewV5 } from '../../src/lib/packaging-pricing-v5/frame-family-cost-core';

// Regression: the approved material/ink/lamination weight is independent of
// full web material consumed in manufacturing and never modifies owner pricing.
test('frame-family price exposes workbook GSM components and finished roll mass', () => {
  const masters: any[] = [
    {id:'m1',code:'MAT_BOPP',name:'18 Matt BOPP',gsm:16.65,current_rate:100,rate_basis:'per_kg'},
    {id:'m2',code:'MAT_METPET',name:'12 MetPET',gsm:16.8,current_rate:100,rate_basis:'per_kg'},
    {id:'m3',code:'MAT_PE',name:'60 PE',gsm:55.5,current_rate:100,rate_basis:'per_kg'},
    {id:'adh',code:'MAT_ADHESIVE',name:'Lamination adhesive',gsm:1.5,current_rate:350,rate_basis:'per_kg',metadata:{gsm_per_bond:1.5}},
    {id:'ink',code:'PROC_PRINT_CMYK',name:'CMYK',current_rate:38,rate_basis:'per_frame'},
    {id:'lam',code:'PROC_LAMINATION',name:'Lamination',current_rate:5,rate_basis:'per_running_metre'},
    {id:'slit',code:'PROC_SLITTING',name:'Slitting',current_rate:2,rate_basis:'per_running_metre'},
  ];
  const context:any={
    template:{currency:'INR',production_rules_json:{machine_width_mm:740,machine_length_mm:1120,default_commercial_bucket:21,printing_ink_gsm:4,minimum_run_length_m:250},quote_config_json:{gst_pct:18}},
    masters,
    constructions:[{id:'construction',name:'18 Matt BOPP / 12 MetPET / 60 PE',layer_count:3}],
    constructionLayers:[
      {construction_id:'construction',layer_position:1,cost_master_item_id:'m1'},
      {construction_id:'construction',layer_position:2,cost_master_item_id:'m2'},
      {construction_id:'construction',layer_position:3,cost_master_item_id:'m3'},
    ],
    bands:[{pricing_bucket:21,run_length_max_m:1000,wastage_pct:10,margin_per_frame:25,sort_order:1}],
    charges:[],
  };
  const input:any={supply_form:'center_seal_roll',width_mm:300,height_mm:200,construction_id:'construction',quantity:5000,print:'CMYK',commercial_bucket:null};
  const result=calculateFrameFamilyPriceReviewV5(context,input);
  assert.equal(result.ok,true,result.validation_errors.join('; '));
  assert.equal(result.roll_weight?.total_gsm,95.95);
  assert.equal(result.roll_weight?.finished_weight_kg,28.79);
  assert.equal(result.roll_weight?.material_gsm,88.95);
  assert.equal(result.roll_weight?.lamination_gsm,3);
  assert.equal(result.roll_weight?.printing_ink_gsm,4);
  assert.equal(result.roll_weight?.material_layers.length,3);
  assert.ok((result.roll_weight?.production_material_weight_kg??0)>28.785);
  assert.equal(result.geometry.units_per_frame,10);
  assert.equal(result.frames_exact,500);
  assert.equal(result.margin_per_frame,25);
  assert.equal(result.wastage_pct,10);
  const moreInk=calculateFrameFamilyPriceReviewV5({...context,template:{...context.template,production_rules_json:{...context.template.production_rules_json,printing_ink_gsm:5}}},input);
  assert.equal(moreInk.roll_weight?.total_gsm,96.95);
  assert.equal(moreInk.selling_price.product_total,result.selling_price.product_total,'weight-only adjustment must not silently change cost pricing');
});
