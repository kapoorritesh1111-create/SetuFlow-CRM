import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupFormulaV5 } from '../../src/lib/packaging-pricing-v5/sup-formula-engine';
import { resolveCommercialBandV5 } from '../../src/lib/packaging-pricing-v5/commercial-band-resolver';
import type { PricingContextV5 } from '../../src/lib/packaging-pricing-v5/types';

const master = (id:string,code:string,name:string,type:'material'|'process',basis:any,rate:number|null,micron:number|null=null,density:number|null=null,gsm:number|null=null,metadata:any={}) => ({
  id,code,name,item_type:type,rate_basis:basis,current_rate:rate,rate_uom:basis==='per_kg'?'kg':basis==='per_frame'?'frame':'running_m',currency:'INR',micron,gsm,density,metadata,
});

const bands:any[] = [
  {pricing_bucket:2,run_length_max_m:250,wastage_pct:25,margin_per_frame:70,sort_order:1},
  {pricing_bucket:2,run_length_max_m:500,wastage_pct:20,margin_per_frame:70,sort_order:2},
  {pricing_bucket:2,run_length_max_m:1000,wastage_pct:10,margin_per_frame:60,sort_order:3},
  {pricing_bucket:2,run_length_max_m:2000,wastage_pct:8,margin_per_frame:50,sort_order:4},
  {pricing_bucket:2,run_length_max_m:3000,wastage_pct:7,margin_per_frame:40,sort_order:5},
  {pricing_bucket:2,run_length_max_m:5000,wastage_pct:6,margin_per_frame:30,sort_order:6},
  {pricing_bucket:2,run_length_max_m:10000,wastage_pct:5,margin_per_frame:25,sort_order:7},
  {pricing_bucket:3,run_length_max_m:250,wastage_pct:25,margin_per_frame:35,sort_order:1},
  {pricing_bucket:3,run_length_max_m:500,wastage_pct:20,margin_per_frame:35,sort_order:2},
  {pricing_bucket:3,run_length_max_m:1000,wastage_pct:10,margin_per_frame:25,sort_order:3},
  {pricing_bucket:3,run_length_max_m:2000,wastage_pct:8,margin_per_frame:20,sort_order:4},
  {pricing_bucket:3,run_length_max_m:3000,wastage_pct:7,margin_per_frame:17,sort_order:5},
  {pricing_bucket:3,run_length_max_m:5000,wastage_pct:6,margin_per_frame:15,sort_order:6},
  {pricing_bucket:3,run_length_max_m:10000,wastage_pct:5,margin_per_frame:13,sort_order:7},
  {pricing_bucket:5,run_length_max_m:250,wastage_pct:25,margin_per_frame:35,sort_order:1},
  {pricing_bucket:5,run_length_max_m:500,wastage_pct:20,margin_per_frame:35,sort_order:2},
  {pricing_bucket:5,run_length_max_m:1000,wastage_pct:10,margin_per_frame:25,sort_order:3},
  {pricing_bucket:5,run_length_max_m:2000,wastage_pct:8,margin_per_frame:20,sort_order:4},
  {pricing_bucket:5,run_length_max_m:3000,wastage_pct:7,margin_per_frame:17,sort_order:5},
  {pricing_bucket:5,run_length_max_m:5000,wastage_pct:6,margin_per_frame:15,sort_order:6},
  {pricing_bucket:5,run_length_max_m:10000,wastage_pct:5,margin_per_frame:13,sort_order:7},
];

const base: PricingContextV5 = {
  template:{
    id:'tpl-v5',family_id:'sup',name:'Stark SUP Formula v5',currency:'INR',calculation_version:5,calculation_engine_key:'sup_formula_v5',status:'draft',
    production_rules_json:{
      machine_width_mm:740,machine_length_mm:1120,trim_allowance_mm:20,gusset_trim_allowance_mm:3,outer_print_web_mm:760,
      inner_web_ladder:[{required_max_mm:585,stock_web_mm:590},{required_max_mm:660,stock_web_mm:670},{stock_web_mm:770}],
      pe_web_ladder:[{required_max_mm:590,stock_web_mm:595},{required_max_mm:660,stock_web_mm:675},{stock_web_mm:775}],
      lamination_rate_by_layer_count:{'3':5,'4':7.5},
    },quote_config_json:{gst_pct:18},
  },
  sizeProfiles:[{
    id:'size160',organization_id:'org',family_id:'sup',size_key:'160x240_bg50_50',name:'160mm x 240mm x (50mm +50mm bg)',
    width_mm:160,height_mm:240,bottom_gusset_each_mm:50,pricing_bucket:3,production_profile_key:'sup_integrated',
    gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',is_active:true,is_quoteable:false,sort_order:11,
  }],
  constructions:[
    {id:'c3',organization_id:'org',family_id:'sup',construction_key:'matte_metpet_pe75',construction_family_key:'matte_metpet',name:'Matt Finish With Metpet / PE75',finish_type:'matte',barrier_type:'silver',sealant_code:'MAT_PE_75',layer_count:3,is_active:true,is_quoteable:false,sort_order:1},
    {id:'c4',organization_id:'org',family_id:'sup',construction_key:'matte_al_foil_pe75',construction_family_key:'matte_al_foil',name:'Matt Finish With Aluminium Foil / PE75',finish_type:'matte',barrier_type:'high_barrier',sealant_code:'MAT_PE_75',layer_count:4,is_active:true,is_quoteable:false,sort_order:2},
  ],
  constructionLayers:[
    {id:'l31',construction_id:'c3',layer_position:1,role_key:'print_layer',cost_master_item_id:'bopp',is_print_layer:true,is_sealant_layer:false},
    {id:'l32',construction_id:'c3',layer_position:2,role_key:'middle_layer_1',cost_master_item_id:'met',is_print_layer:false,is_sealant_layer:false},
    {id:'l33',construction_id:'c3',layer_position:3,role_key:'sealant_layer',cost_master_item_id:'pe75',is_print_layer:false,is_sealant_layer:true},
    {id:'l41',construction_id:'c4',layer_position:1,role_key:'print_layer',cost_master_item_id:'bopp',is_print_layer:true,is_sealant_layer:false},
    {id:'l42',construction_id:'c4',layer_position:2,role_key:'middle_layer_1',cost_master_item_id:'pet',is_print_layer:false,is_sealant_layer:false},
    {id:'l43',construction_id:'c4',layer_position:3,role_key:'middle_layer_2',cost_master_item_id:'foil',is_print_layer:false,is_sealant_layer:false},
    {id:'l44',construction_id:'c4',layer_position:4,role_key:'sealant_layer',cost_master_item_id:'pe75',is_print_layer:false,is_sealant_layer:true},
  ],
  masters:[
    master('bopp','MAT_BOPP_MATT_18','18 Matt BOPP','material','per_kg',190,18,0.93),
    master('met','MAT_METPET_12','12 MetPET','material','per_kg',165,12,1.4),
    master('pet','MAT_PET_12','12 PET','material','per_kg',150,12,1.4),
    master('foil','MAT_AL_FOIL_9','9 Aluminium Foil','material','per_kg',540,9,2.7),
    master('pe75','MAT_PE_75','PE 75','material','per_kg',185,75,0.925),
    master('adh','MAT_ADHESIVE','Adhesive','material','per_kg',350,null,null,1.5,{gsm_per_bond:1.5}),
    master('print4','PROC_PRINT_CMYKW','CMYKW Print','process','per_frame',46),
    master('print3','PROC_PRINT_CMYK','CMYK Print','process','per_frame',38),
    master('lam','PROC_LAMINATION','Lamination','process','per_running_metre',5),
    master('slit','PROC_SLITTING','Slitting','process','per_running_metre',2),
    master('pouch','PROC_POUCHING','Pouching','process','per_running_metre',8),
  ],
  bands,
};

test('S52-PKG-V5: bucket resolver uses bucket plus run length',()=>{
  const band=resolveCommercialBandV5(bands as any,3,800);
  assert.ok(band);
  assert.equal(band?.run_length_max_m,1000);
  assert.equal(band?.wastage_pct,10);
  assert.equal(band?.margin_per_frame,25);
});

test('S52-PKG-V5: integrated 160x240 geometry resolves seven units per frame and 800m at 5k',()=>{
  const result=calculateSupFormulaV5(base,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_route.components[0]?.units_per_frame,7);
  assert.ok(Math.abs(result.commercial_rules.run_length_m-800)<1e-8);
  assert.equal(result.commercial_rules.bucket_no,3);
  assert.equal(result.commercial_rules.band_max_m,1000);
  assert.equal(result.commercial_rules.wastage_pct,10);
  assert.equal(result.commercial_rules.margin_per_frame,25);
  assert.equal(result.construction?.layer_count,3);
  assert.match(result.construction?.structure_label ?? '',/Matt BOPP/);
  assert.match(result.construction?.structure_label ?? '',/MetPET/);
  assert.match(result.construction?.structure_label ?? '',/PE 75/);
});

test('S52-PKG-V5: 4-layer construction is priced from four dynamic layer records',()=>{
  const three=calculateSupFormulaV5(base,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000});
  const four=calculateSupFormulaV5(base,{size_profile_id:'size160',construction_id:'c4',print:'CMYKW',quantity:5000});
  assert.equal(four.ok,true,four.validation_errors.join(' '));
  assert.equal(four.construction?.layer_count,4);
  assert.match(four.construction?.structure_label ?? '',/Aluminium Foil/);
  assert.ok(four.selling_price.unit_price>three.selling_price.unit_price,'4-layer high barrier should cost more than 3-layer MetPET with these test rates');
});

test('S52-PKG-V5: missing layer rate fails closed',()=>{
  const context={...base,masters:base.masters.map((item)=>item.id==='met'?{...item,current_rate:null}:item)};
  const result=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,false);
  assert.match(result.validation_errors.join(' '),/needs a rate/i);
});

test('S52-PKG-V5: alternative quantities are independently recalculated',()=>{
  const result=calculateSupFormulaV5(base,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.deepEqual(result.alternative_quantities.map((item)=>item.quantity),[5000,10000,15000,20000]);
  const q5=result.alternative_quantities.find((item)=>item.quantity===5000)!;
  const q20=result.alternative_quantities.find((item)=>item.quantity===20000)!;
  assert.equal(q5.wastage_pct,10);
  assert.ok(q20.run_length_m>q5.run_length_m);
  assert.notEqual(q20.unit_price,q5.unit_price);
});

test('S52-PKG-V5: 260x340 uses separate gusset and inherits the main commercial band',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],id:'large',size_key:'260x340_bg60_60',name:'260 x 340',width_mm:260,height_mm:340,bottom_gusset_each_mm:60,
    pricing_bucket:5,gusset_production_mode:'separate',production_profile_key:'sup_split_gusset_large',bottom_registration_mode:'not_applicable',
  }]};
  const result=calculateSupFormulaV5(context,{size_profile_id:'large',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_route.components.length,2);
  const body=result.production_route.components.find((item)=>item.key==='main_body')!;
  const gusset=result.production_route.components.find((item)=>item.key==='bottom_gusset')!;
  assert.equal(body.web_width_mm,700);
  assert.equal(body.lanes_across,1);
  assert.equal(body.repeats_along,4);
  assert.equal(body.units_per_frame,4);
  assert.ok(Math.abs(body.run_length_m-1300)<1e-8);
  assert.equal(gusset.web_width_mm,123);
  assert.equal(gusset.lanes_across,6);
  assert.equal(gusset.repeats_along,4);
  assert.equal(gusset.units_per_frame,24);
  assert.equal(gusset.apply_pouching,false);
  assert.equal(gusset.apply_margin,false);
  assert.equal(gusset.commercial_band_source,'parent');
  assert.equal(result.commercial_rules.band_max_m,2000);
  assert.equal(result.commercial_rules.wastage_pct,8);
  assert.equal(result.commercial_rules.margin_per_frame,20);
});

test('S52-PKG-V5: 110x170 solid bottom selects split 20-up body route',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],id:'small',size_key:'110x170_bg30_30',name:'110 x 170',width_mm:110,height_mm:170,bottom_gusset_each_mm:30,
    pricing_bucket:2,gusset_production_mode:'conditional',production_profile_key:'sup_110x170_conditional',bottom_registration_mode:'optional',
  }]};
  const result=calculateSupFormulaV5(context,{size_profile_id:'small',construction_id:'c3',print:'CMYKW',quantity:5000,bottom_print_mode:'solid_unregistered'});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  const body=result.production_route.components.find((item)=>item.key==='main_body')!;
  const gusset=result.production_route.components.find((item)=>item.key==='bottom_gusset')!;
  assert.equal(body.web_width_mm,360);
  assert.equal(body.lanes_across,2);
  assert.equal(body.repeats_along,10);
  assert.equal(body.units_per_frame,20);
  assert.equal(gusset.web_width_mm,63);
  assert.equal(gusset.lanes_across,11);
  assert.equal(gusset.repeats_along,10);
  assert.equal(gusset.units_per_frame,110);
});

test('S52-PKG-V5: 110x170 registered artwork selects integrated 10-up route',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],id:'small',size_key:'110x170_bg30_30',name:'110 x 170',width_mm:110,height_mm:170,bottom_gusset_each_mm:30,
    pricing_bucket:2,gusset_production_mode:'conditional',production_profile_key:'sup_110x170_conditional',bottom_registration_mode:'optional',
  }]};
  const result=calculateSupFormulaV5(context,{size_profile_id:'small',construction_id:'c3',print:'CMYKW',quantity:5000,bottom_print_mode:'registered_artwork'});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_route.components.length,1);
  const body=result.production_route.components[0];
  assert.equal(body.web_width_mm,420);
  assert.equal(body.lanes_across,1);
  assert.equal(body.repeats_along,10);
  assert.equal(body.units_per_frame,10);
});

test('S52-PKG-V5: conditional size fails closed until bottom-print choice is supplied',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],id:'small',size_key:'110x170_bg30_30',name:'110 x 170',width_mm:110,height_mm:170,bottom_gusset_each_mm:30,
    pricing_bucket:2,gusset_production_mode:'conditional',production_profile_key:'sup_110x170_conditional',bottom_registration_mode:'optional',
  }]};
  const result=calculateSupFormulaV5(context,{size_profile_id:'small',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,false);
  assert.match(result.validation_errors.join(' '),/bottom-print selection/i);
});
