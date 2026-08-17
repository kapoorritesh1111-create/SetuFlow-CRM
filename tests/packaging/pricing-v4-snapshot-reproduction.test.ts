import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupFormula } from '../../src/lib/packaging-pricing/sup-formula-engine';
import { createPackagingPricingSnapshot, reproducePackagingPricingSnapshot } from '../../src/lib/packaging-pricing/snapshot';
import type { PackagingPricingInputSnapshotV4 } from '../../src/lib/packaging-pricing/snapshot';
import type { PricingContext, PricingMasterRate } from '../../src/lib/packaging-pricing/types';

const master = (id:string, code:string, name:string, item_type:'material'|'process', rate_basis:PricingMasterRate['rate_basis'], current_rate:number, micron:number|null=null, density:number|null=null, gsm:number|null=null, metadata:Record<string,unknown>={}) => ({
  id, code, name, item_type, rate_basis, current_rate,
  rate_uom: rate_basis === 'per_kg' ? 'kg' : rate_basis === 'per_frame' ? 'frame' : 'running_m',
  currency:'INR', micron, gsm, density, metadata,
});

function sourceContext(peRate = 185): PricingContext {
  return {
    template:{id:'tpl',family_id:'sup',name:'Stark SUP Formula v4',currency:'INR',calculation_version:4,calculation_engine_key:'sup_formula',status:'published',production_rules_json:{machine_width_mm:740,machine_length_mm:1120,trim_allowance_mm:20,outer_print_web_mm:760,inner_web_ladder:[{required_max_mm:585,stock_web_mm:590},{required_max_mm:660,stock_web_mm:670},{stock_web_mm:770}],pe_web_ladder:[{required_max_mm:590,stock_web_mm:595},{required_max_mm:660,stock_web_mm:675},{stock_web_mm:775}]},quote_config_json:{gst_pct:18,constructions:['matte_foil']}},
    masters:[
      master('bopp','MAT_BOPP_MATT_18','18 Matt BOPP','material','per_kg',190,18,0.93),
      master('met','MAT_METPET_12','12 MetPET','material','per_kg',165,12,1.4),
      master('pe75','MAT_PE_75','PE 75µ','material','per_kg',peRate,75,0.925),
      master('adh','MAT_ADHESIVE','Adhesive','material','per_kg',350,null,null,1.5,{gsm_per_bond:1.5}),
      master('print','PROC_PRINT_CMYKW','CMYKW Print','process','per_frame',46),
      master('lam','PROC_LAMINATION','Lamination','process','per_running_metre',5),
      master('slit','PROC_SLITTING','Slitting','process','per_running_metre',2),
      master('pouch','PROC_POUCHING','Pouching','process','per_running_metre',8),
    ],
    charges:[],
    recipes:[
      {id:'1',construction_key:'matte_foil',role_key:'outer_layer',source_type:'cost_master',cost_master_item_id:'bopp',charge_master_item_id:null,consumption_rule_json:{web:'outer'},condition_json:{},sort_order:10,is_required:true},
      {id:'2',construction_key:'matte_foil',role_key:'middle_layer',source_type:'cost_master',cost_master_item_id:'met',charge_master_item_id:null,consumption_rule_json:{web:'inner'},condition_json:{},sort_order:20,is_required:true},
      {id:'3',construction_key:'*',role_key:'inner_pe',source_type:'cost_master',cost_master_item_id:'pe75',charge_master_item_id:null,consumption_rule_json:{web:'pe'},condition_json:{variation_keys:['250g']},sort_order:50,is_required:true},
      {id:'4',construction_key:'*',role_key:'adhesive',source_type:'cost_master',cost_master_item_id:'adh',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:60,is_required:true},
      {id:'5',construction_key:'*',role_key:'printing_cmykw',source_type:'cost_master',cost_master_item_id:'print',charge_master_item_id:null,consumption_rule_json:{},condition_json:{print:'CMYKW'},sort_order:70,is_required:true},
      {id:'6',construction_key:'*',role_key:'lamination',source_type:'cost_master',cost_master_item_id:'lam',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:80,is_required:true},
      {id:'7',construction_key:'*',role_key:'slitting',source_type:'cost_master',cost_master_item_id:'slit',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:90,is_required:true},
      {id:'8',construction_key:'*',role_key:'pouching',source_type:'cost_master',cost_master_item_id:'pouch',charge_master_item_id:null,consumption_rule_json:{},condition_json:{},sort_order:100,is_required:true},
    ],
    bands:[{run_length_max_m:500,wastage_pct:20,margin_per_frame:35,sort_order:1},{run_length_max_m:1000,wastage_pct:10,margin_per_frame:25,sort_order:2},{run_length_max_m:2000,wastage_pct:8,margin_per_frame:20,sort_order:3},{run_length_max_m:3000,wastage_pct:7,margin_per_frame:17,sort_order:4},{run_length_max_m:5000,wastage_pct:6,margin_per_frame:15,sort_order:5},{run_length_max_m:10000,wastage_pct:5,margin_per_frame:13,sort_order:6}],
    variations:[{id:'v250',variation_key:'250g',name:'250gm',capacity_label:'250gm',width_mm:160,height_mm:230,bottom_gusset_each_mm:50,dimension_label:'160 × 230 mm · BG 50+50'}],
    matrixRows:[],
  };
}

const input = { product_variation_id:'v250', construction_key:'matte_foil' as const, print:'CMYKW' as const, quantity:5000, selected_charge_codes:[] };

test('S51-PKG-050: old quote version reproduces frozen price, Master rate and KLD after live data changes', () => {
  const oldResult = calculateSupFormula(sourceContext(185), input);
  assert.equal(oldResult.ok, true, oldResult.validation_errors.join(' '));
  const oldInputSnapshot: PackagingPricingInputSnapshotV4 = {
    engine_version:4,
    family_id:'sup', family_name:'Stand Up Pouches',
    template_id:'tpl', template_name:'Stark SUP Formula v4', template_version:4,
    calculation_engine_key:'sup_formula', input, source_hash:oldResult.source_hash,
    kld:{id:'kld-v1',file_name:'250gm-v1.pdf',version_label:'v1',storage_path:'stark/250gm-v1.pdf'},
  };
  const frozen = createPackagingPricingSnapshot(oldInputSnapshot, oldResult, '2026-08-17T09:00:00.000Z');

  const newResult = calculateSupFormula(sourceContext(250), input);
  assert.equal(newResult.ok, true, newResult.validation_errors.join(' '));
  const newKld = {id:'kld-v2',file_name:'250gm-v2.pdf',version_label:'v2',storage_path:'stark/250gm-v2.pdf'};
  assert.notEqual(newResult.selling_price.unit_price, oldResult.selling_price.unit_price);
  assert.notEqual(newResult.source_hash, oldResult.source_hash);
  assert.notEqual(newKld.version_label, (frozen.input_snapshot.kld as any)?.version_label);

  const reproduced = reproducePackagingPricingSnapshot(frozen);
  assert.deepEqual(reproduced.pricing_result.selling_price, oldResult.selling_price);
  assert.equal(reproduced.pricing_result.source_hash, oldResult.source_hash);
  assert.equal(reproduced.input_snapshot.source_hash, oldResult.source_hash);
  assert.equal((reproduced.input_snapshot.kld as any)?.file_name, '250gm-v1.pdf');
  assert.equal((reproduced.input_snapshot.kld as any)?.version_label, 'v1');
  const pe = reproduced.pricing_result.cost_build?.materials.find((line) => line.code === 'MAT_PE_75');
  assert.equal(pe?.snapshotted_rate, 185);

  reproduced.pricing_result.selling_price.unit_price = 999;
  assert.equal(frozen.pricing_result.selling_price.unit_price, oldResult.selling_price.unit_price, 'reproduction must be a deep copy');
});

test('S51-PKG-050: snapshot integrity check fails closed if historical KLD/pricing payload is altered', () => {
  const result = calculateSupFormula(sourceContext(185), input);
  const source: PackagingPricingInputSnapshotV4 = {
    engine_version:4, family_id:'sup', family_name:'Stand Up Pouches', template_id:'tpl', template_name:'Stark SUP Formula v4',
    template_version:4, calculation_engine_key:'sup_formula', input, source_hash:result.source_hash,
    kld:{id:'kld-v1',file_name:'250gm-v1.pdf',version_label:'v1'},
  };
  const frozen = createPackagingPricingSnapshot(source, result, '2026-08-17T09:00:00.000Z');
  const tampered:any = JSON.parse(JSON.stringify(frozen));
  tampered.input_snapshot.kld.version_label = 'v2';
  assert.throws(() => reproducePackagingPricingSnapshot(tampered), /integrity check failed/i);
});
