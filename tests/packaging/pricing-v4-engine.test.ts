import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupFormula } from '../../src/lib/packaging-pricing/sup-formula-engine';
import { calculateMatrixPerFrame, matrixGeometry } from '../../src/lib/packaging-pricing/matrix-per-frame-engine';
import type { PricingContext } from '../../src/lib/packaging-pricing/types';

const m = (id: string, code: string, name: string, type: 'material'|'process', basis: any, rate: number|null, micron: number|null=null, density: number|null=null, gsm: number|null=null, metadata: any={}) => ({ id,code,name,item_type:type,rate_basis:basis,current_rate:rate,rate_uom:basis==='per_kg'?'kg':basis==='per_frame'?'frame':'running_m',currency:'INR',micron,gsm,density,metadata });

const base: PricingContext = {
  template: { id:'tpl',family_id:'sup',name:'Stark SUP Formula v4',currency:'INR',calculation_version:4,calculation_engine_key:'sup_formula',status:'draft',production_rules_json:{machine_width_mm:740,machine_length_mm:1120,trim_allowance_mm:20,outer_print_web_mm:760,inner_web_ladder:[{required_max_mm:585,stock_web_mm:590},{required_max_mm:660,stock_web_mm:670},{stock_web_mm:770}],pe_web_ladder:[{required_max_mm:590,stock_web_mm:595},{required_max_mm:660,stock_web_mm:675},{stock_web_mm:775}]},quote_config_json:{gst_pct:18}},
  masters:[
    m('bopp','MAT_BOPP_MATT_18','18 Matt BOPP','material','per_kg',190,18,0.93),
    m('met','MAT_METPET_12','12 MetPET','material','per_kg',165,12,1.4),
    m('pe75','MAT_PE_75','PE 75µ','material','per_kg',185,75,0.925),
    m('adh','MAT_ADHESIVE','Adhesive','material','per_kg',350,null,null,1.5,{gsm_per_bond:1.5}),
    m('print','PROC_PRINT_CMYKW','CMYKW Print','process','per_frame',46),
    m('lam','PROC_LAMINATION','Lamination','process','per_running_metre',5),
    m('slit','PROC_SLITTING','Slitting','process','per_running_metre',2),
    m('pouch','PROC_POUCHING','Pouching','process','per_running_metre',8),
  ],
  charges:[{id:'zip',code:'EXTRA_ZIPPER',name:'Zipper',category:'extra',basis:'per_running_metre',application_stage:'before_wastage_margin',current_rate:1.3,currency:'INR'}],
  recipes:[
    {id:'1',construction_key:'matte_foil',role_key:'outer_layer',source_type:'cost_master',cost_master_item_id:'bopp',charge_master_item_id:null,consumption_rule_json:{web:'outer'},condition_json:{},sort_order:10,is_required:true},
    {id:'2',construction_key:'matte_foil',role_key:'middle_layer',source_type:'cost_master',cost_master_item_id:'met',charge_master_item_id:null,consumption_rule_json:{web:'inner'},condition_json:{},sort_order:20,is_required:true},
    {id:'3',construction_key:'*',role_key:'inner_pe',source_type:'cost_master',cost_master_item_id:'pe75',charge_master_item_id:null,consumption_rule_json:{web:'pe'},condition_json:{variation_keys:['250g']},sort_order:50,is_required:true},
    {id:'4',construction_key:'*',role_key:'adhesive',source_type:'cost_master',cost_master_item_id:'adh',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:60,is_required:true},
    {id:'5',construction_key:'*',role_key:'printing_cmykw',source_type:'cost_master',cost_master_item_id:'print',charge_master_item_id:null,consumption_rule_json:{},condition_json:{print:'CMYKW'},sort_order:70,is_required:false},
    {id:'6',construction_key:'*',role_key:'lamination',source_type:'cost_master',cost_master_item_id:'lam',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:80,is_required:true},
    {id:'7',construction_key:'*',role_key:'slitting',source_type:'cost_master',cost_master_item_id:'slit',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:90,is_required:true},
    {id:'8',construction_key:'*',role_key:'pouching',source_type:'cost_master',cost_master_item_id:'pouch',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:100,is_required:true},
  ],
  bands:[{run_length_max_m:500,wastage_pct:20,margin_per_frame:35,sort_order:1},{run_length_max_m:1000,wastage_pct:10,margin_per_frame:25,sort_order:2},{run_length_max_m:2000,wastage_pct:8,margin_per_frame:20,sort_order:3},{run_length_max_m:3000,wastage_pct:7,margin_per_frame:17,sort_order:4},{run_length_max_m:5000,wastage_pct:6,margin_per_frame:15,sort_order:5},{run_length_max_m:10000,wastage_pct:5,margin_per_frame:13,sort_order:6}],
  variations:[{id:'v250',variation_key:'250g',name:'250gm',capacity_label:'250gm',width_mm:160,height_mm:230,bottom_gusset_each_mm:50,dimension_label:'160 × 230 mm · BG 50+50'}],
  matrixRows:[],
};

test('S51-PKG-045: approved Stark SUP anchor is reproduced', () => {
  const result=calculateSupFormula(base,{product_variation_id:'v250',construction_key:'matte_foil',print:'CMYKW',quantity:5000,selected_charge_codes:['EXTRA_ZIPPER']});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_calculation.pouches_per_frame,7);
  assert.ok(Math.abs(Number(result.production_calculation.run_length_m)-800)<1e-8);
  const materialWithProductionExtra=(result.cost_build?.material_total_per_frame??0)+(result.cost_build?.production_extras.reduce((s,x)=>s+x.amount_per_frame,0)??0);
  assert.ok(Math.abs(materialWithProductionExtra-15.24761182)<0.000001,`material ${materialWithProductionExtra}`);
  assert.ok(Math.abs((result.cost_build?.process_total_per_frame??0)-62.8)<0.000001);
  assert.ok(Math.abs(result.selling_price.unit_price-15.83605329)<0.000001,`unit ${result.selling_price.unit_price}`);
  assert.ok(Math.abs(result.selling_price.product_total-79180.27)<0.01);
  assert.ok(Math.abs(result.selling_price.gst-14252.45)<0.01);
  assert.ok(Math.abs(result.selling_price.grand_total_before_freight-93432.71)<0.01);
});

test('S51-PKG-045: missing selected Master rate blocks pricing instead of becoming zero', () => {
  const missing={...base,masters:base.masters.map(x=>x.id==='met'?{...x,current_rate:null}:x)};
  const result=calculateSupFormula(missing,{product_variation_id:'v250',construction_key:'matte_foil',print:'CMYKW',quantity:5000,selected_charge_codes:['EXTRA_ZIPPER']});
  assert.equal(result.ok,false);
  assert.match(result.validation_errors.join(' '),/needs a rate/i);
});

test('S51-PKG-046: Center Seal 100×140 resolves to 56 pouches/frame',()=>{
  assert.equal(matrixGeometry(100,140,'center_seal').pouches_per_frame,56);
});

test('S51-PKG-046/047: source-backed Center Seal SPPL78 Q1-Q5 is preserved',()=>{
  const context:PricingContext={...base,template:{...base.template,id:'center',family_id:'center-family',calculation_engine_key:'matrix_per_frame'},matrixRows:[{id:'row',supply_form:'center_seal',construction_key:'2 layer - 12 pet + 35 PE - Roll form',client_product_id:'SPPL78',width_mm:100,height_mm:140,q1_rate_per_frame:110,q2_rate_per_frame:105,q3_rate_per_frame:85,q4_rate_per_frame:79.5,q5_rate_per_frame:74.5,source_worksheet:'Center Seal',source_row_number:null,source_reference:'handoff'}]};
  for(const [tier,rate] of Object.entries({Q1:110,Q2:105,Q3:85,Q4:79.5,Q5:74.5}) as any){
    const result=calculateMatrixPerFrame(context,{width_mm:100,height_mm:140,supply_form:'center_seal',client_product_id:'SPPL78',tier});
    assert.equal(result.ok,true);
    assert.ok(Math.abs(result.selling_price.unit_price-rate/56)<1e-8);
  }
});

test('S51-PKG-046: 3SS pouch uses approved open laminate width rule',()=>{
  const g=matrixGeometry(100,140,'three_side_seal_pouch');
  assert.equal(g.open_laminate_width_mm,292);
});
