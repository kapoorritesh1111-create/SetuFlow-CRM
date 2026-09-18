import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupFormulaV5 } from '../../src/lib/packaging-pricing-v5/sup-formula-engine';
import { toSalesQuotePricingResultV5 } from '../../src/lib/packaging-pricing-v5/engine-registry';
import { resolveCommercialBandV5 } from '../../src/lib/packaging-pricing-v5/commercial-band-resolver';
import { allowedPeMicronsForSupSizeV5 } from '../../src/lib/packaging-pricing-v5/construction-compatibility';
import type { PricingContextV5 } from '../../src/lib/packaging-pricing-v5/types';

const master = (id:string,code:string,name:string,type:'material'|'process',basis:any,rate:number|null,micron:number|null=null,density:number|null=null,gsm:number|null=null,metadata:any={}) => ({
  id,code,name,item_type:type,rate_basis:basis,current_rate:rate,rate_uom:basis==='per_kg'?'kg':basis==='per_frame'?'frame':'running_m',currency:'INR',micron,gsm,density,metadata,
});

const bands:any[] = [
  {pricing_bucket:1,run_length_max_m:500,wastage_pct:20,margin_per_frame:70,sort_order:1},
  {pricing_bucket:1,run_length_max_m:1000,wastage_pct:10,margin_per_frame:60,sort_order:2},
  {pricing_bucket:1,run_length_max_m:2000,wastage_pct:8,margin_per_frame:50,sort_order:3},
  {pricing_bucket:1,run_length_max_m:3000,wastage_pct:7,margin_per_frame:40,sort_order:4},
  {pricing_bucket:1,run_length_max_m:5000,wastage_pct:6,margin_per_frame:30,sort_order:5},
  {pricing_bucket:1,run_length_max_m:10000,wastage_pct:5,margin_per_frame:25,sort_order:6},
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
  {pricing_bucket:4,run_length_max_m:250,wastage_pct:25,margin_per_frame:35,sort_order:1},
  {pricing_bucket:4,run_length_max_m:500,wastage_pct:20,margin_per_frame:35,sort_order:2},
  {pricing_bucket:4,run_length_max_m:1000,wastage_pct:10,margin_per_frame:25,sort_order:3},
  {pricing_bucket:4,run_length_max_m:2000,wastage_pct:8,margin_per_frame:20,sort_order:4},
  {pricing_bucket:4,run_length_max_m:3000,wastage_pct:7,margin_per_frame:17,sort_order:5},
  {pricing_bucket:4,run_length_max_m:5000,wastage_pct:6,margin_per_frame:15,sort_order:6},
  {pricing_bucket:4,run_length_max_m:10000,wastage_pct:5,margin_per_frame:13,sort_order:7},
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

test('S52-PKG-V5: 160x230 workbook 3-layer example reconciles exactly at 5,000 pcs',()=>{
  const context:PricingContextV5={
    ...base,
    sizeProfiles:[{
      ...base.sizeProfiles[0],id:'wb160',size_key:'160x230_bg50_50',name:'160 x 230',width_mm:160,height_mm:230,bottom_gusset_each_mm:50,
      pricing_bucket:3,production_profile_key:'sup_integrated',gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',
    }],
    charges:[{id:'zip',code:'EXTRA_ZIPPER',name:'Zipper',category:'extra',basis:'per_running_metre',application_stage:'before_wastage_margin',current_rate:1.3,currency:'INR',metadata:{}}],
  };
  const result=calculateSupFormulaV5(context,{size_profile_id:'wb160',construction_id:'c3',print:'CMYKW',quantity:5000,selected_charge_codes:['EXTRA_ZIPPER']});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_route.components[0]?.units_per_frame,7);
  assert.ok(Math.abs(result.commercial_rules.run_length_m-800)<1e-8);
  assert.equal(result.commercial_rules.wastage_pct,10);
  assert.equal(result.commercial_rules.margin_per_frame,25);
  assert.ok(Math.abs(result.selling_price.unit_price-15.83605329)<1e-8);
  assert.ok(Math.abs(result.selling_price.product_total-79180.27)<0.01);
});

test('S52-PKG-V5: 160x230 workbook 3-layer foil example reconciles exactly at 5,000 pcs',()=>{
  const foilConstruction={id:'cfoil3',organization_id:'org',family_id:'sup',construction_key:'glossy_al_foil_pe75',construction_family_key:'glossy_al_foil',name:'Glossy Finish With Aluminium Foil / PE75',finish_type:'glossy',barrier_type:'high_barrier',sealant_code:'MAT_PE_75',layer_count:3,is_active:true,is_quoteable:false,sort_order:3};
  const context:PricingContextV5={
    ...base,
    sizeProfiles:[{
      ...base.sizeProfiles[0],id:'wb160-foil3',size_key:'160x230_bg50_50',name:'160 x 230',width_mm:160,height_mm:230,bottom_gusset_each_mm:50,
      pricing_bucket:3,production_profile_key:'sup_integrated',gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',
    }],
    constructions:[...base.constructions,foilConstruction],
    constructionLayers:[...base.constructionLayers,
      {id:'lf31',construction_id:'cfoil3',layer_position:1,role_key:'print_layer',cost_master_item_id:'pet',is_print_layer:true,is_sealant_layer:false},
      {id:'lf32',construction_id:'cfoil3',layer_position:2,role_key:'middle_layer_1',cost_master_item_id:'foil',is_print_layer:false,is_sealant_layer:false},
      {id:'lf33',construction_id:'cfoil3',layer_position:3,role_key:'sealant_layer',cost_master_item_id:'pe75',is_print_layer:false,is_sealant_layer:true},
    ],
    masters:base.masters.map((item)=>{
      if(item.id==='pet') return {...item,current_rate:165};
      if(item.id==='foil') return {...item,current_rate:550,gsm:24.2,density:null};
      return item;
    }),
    charges:[{id:'zip',code:'EXTRA_ZIPPER',name:'Zipper',category:'extra',basis:'per_running_metre',application_stage:'before_wastage_margin',current_rate:1.3,currency:'INR',metadata:{}}],
  };
  const result=calculateSupFormulaV5(context,{size_profile_id:'wb160-foil3',construction_id:'cfoil3',print:'CMYKW',quantity:5000,selected_charge_codes:['EXTRA_ZIPPER']});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_route.components[0]?.units_per_frame,7);
  assert.ok(Math.abs(result.selling_price.unit_price-17.27390007)<1e-8);
  assert.ok(Math.abs(result.selling_price.product_total-86369.50)<0.01);
});

test('S52-PKG-V5: 160x230 workbook 4-layer foil example reconciles exactly at 5,000 pcs',()=>{
  const context:PricingContextV5={
    ...base,
    sizeProfiles:[{
      ...base.sizeProfiles[0],id:'wb160-4',size_key:'160x230_bg50_50',name:'160 x 230',width_mm:160,height_mm:230,bottom_gusset_each_mm:50,
      pricing_bucket:3,production_profile_key:'sup_integrated',gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',
    }],
    masters:base.masters.map((item)=>{
      if(item.id==='pet') return {...item,current_rate:165};
      if(item.id==='foil') return {...item,current_rate:550,gsm:24.2,density:null};
      return item;
    }),
    charges:[{id:'zip',code:'EXTRA_ZIPPER',name:'Zipper',category:'extra',basis:'per_running_metre',application_stage:'before_wastage_margin',current_rate:1.3,currency:'INR',metadata:{}}],
  };
  const result=calculateSupFormulaV5(context,{size_profile_id:'wb160-4',construction_id:'c4',print:'CMYKW',quantity:5000,selected_charge_codes:['EXTRA_ZIPPER']});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_route.components[0]?.units_per_frame,7);
  assert.ok(Math.abs(result.selling_price.unit_price-18.11137689)<1e-8);
  assert.ok(Math.abs(result.selling_price.product_total-90556.88)<0.01);
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
  assert.deepEqual(result.alternative_quantities.map((item)=>item.quantity),[5000,10000,20000,30000,50000]);
  const q5=result.alternative_quantities.find((item)=>item.quantity===5000)!;
  const q20=result.alternative_quantities.find((item)=>item.quantity===20000)!;
  assert.equal(q5.wastage_pct,10);
  assert.ok(q20.run_length_m>q5.run_length_m);
  assert.notEqual(q20.unit_price,q5.unit_price);
});

test('S52-PKG-V5: reference MOQ ladder returns five higher options from 2,000',()=>{
  const result=calculateSupFormulaV5(base,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:2000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.deepEqual(result.alternative_quantities.map((item)=>item.quantity),[2000,3000,5000,10000,20000,30000]);
});

test('S52-PKG-V5: empty allowed list falls back to the reference MOQ ladder',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{...base.sizeProfiles[0],metadata:{allowed_quantities:[],blocked_quantities:[1000]}}]};
  const result=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:2000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.deepEqual(result.alternative_quantities.map((item)=>item.quantity),[2000,3000,5000,10000,20000,30000]);
  const blocked=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:1000});
  assert.equal(blocked.ok,false);
});

test('S52-PKG-V5: bucket 4 live-size geometry uses the authoritative PG04 commercial schedule',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],id:'pg4',size_key:'200x300_bg55_55',name:'200 x 300',width_mm:200,height_mm:300,bottom_gusset_each_mm:55,
    pricing_bucket:4,gusset_production_mode:'integrated',production_profile_key:'sup_integrated',bottom_registration_mode:'not_applicable',
  }]};
  const result=calculateSupFormulaV5(context,{size_profile_id:'pg4',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  assert.equal(result.production_route.components[0]?.units_per_frame,5);
  assert.ok(Math.abs(result.commercial_rules.run_length_m-1000)<1e-8);
  assert.equal(result.commercial_rules.bucket_no,4);
  assert.equal(result.commercial_rules.band_max_m,1000);
  assert.equal(result.commercial_rules.wastage_pct,10);
  assert.equal(result.commercial_rules.margin_per_frame,25);
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


test('S52-PKG-V5: 110x170 registered route reconciles Akshay COGS frame total',()=>{
  const context:PricingContextV5={
    ...base,
    sizeProfiles:[{
      ...base.sizeProfiles[0],id:'small-cogs',size_key:'110x170_bg30_30',name:'110 x 170',width_mm:110,height_mm:170,bottom_gusset_each_mm:30,
      pricing_bucket:2,gusset_production_mode:'conditional',production_profile_key:'sup_110x170_conditional',bottom_registration_mode:'optional',
    }],
    masters:base.masters.map((item)=>{
      if(item.id==='bopp') return {...item,current_rate:190,gsm:16.74,density:null};
      if(item.id==='met') return {...item,current_rate:165,gsm:16.8,density:null};
      if(item.id==='pe75') return {...item,current_rate:185,gsm:69.375,density:null};
      if(item.id==='adh') return {...item,current_rate:350,gsm:1.5,metadata:{gsm_per_bond:1.5}};
      return item;
    }),
    charges:[{
      id:'zipper-charge',code:'EXTRA_ZIPPER',name:'Zipper',category:'extra',basis:'per_running_metre',
      application_stage:'before_wastage_margin',current_rate:1.3,currency:'INR',metadata:{},
    }],
  };
  const result=calculateSupFormulaV5(context,{
    size_profile_id:'small-cogs',construction_id:'c3',print:'CMYKW',quantity:5000,
    bottom_print_mode:'registered_artwork',selected_charge_codes:['EXTRA_ZIPPER'],
  });
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  const body=result.production_route.components[0];
  assert.equal(body.units_per_frame,10);
  assert.equal(body.web_run_mm_per_frame,1100);
  assert.ok(Math.abs((result.cost_breakdown.totals_for_job.material_cost+result.cost_breakdown.totals_for_job.zipper_cost)/500-14.97533304)<0.00001,
    'registered 110x170 RMC per frame should reconcile to the workbook COGS total');
  assert.ok(Math.abs(result.cost_breakdown.totals_for_job.zipper_cost/500-1.43)<0.00001);
});


test('S52-PKG-V5: rejects workbook N/A quantities configured on a size',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],
    metadata:{allowed_quantities:[5000,10000],blocked_quantities:[15000]},
  }]};
  const blocked=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:15000});
  assert.equal(blocked.ok,false);
  assert.match(blocked.validation_errors.join(' '),/not allowed/i);
  const allowed=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:10000});
  assert.equal(allowed.ok,true,allowed.validation_errors.join(' '));
  assert.ok(allowed.alternative_quantities.every((item)=>[5000,10000].includes(item.quantity)));
});


test('S52-PKG-V5: owner clarification blocks 1K and 2K for N/A small-size rows',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],
    id:'n-a-small',
    name:'98 x 150',
    metadata:{blocked_quantities:[1000,2000]},
  }]};
  const q1=calculateSupFormulaV5(context,{size_profile_id:'n-a-small',construction_id:'c3',print:'CMYKW',quantity:1000});
  const q2=calculateSupFormulaV5(context,{size_profile_id:'n-a-small',construction_id:'c3',print:'CMYKW',quantity:2000});
  const q3=calculateSupFormulaV5(context,{size_profile_id:'n-a-small',construction_id:'c3',print:'CMYKW',quantity:3000});
  assert.equal(q1.ok,false);
  assert.equal(q2.ok,false);
  assert.equal(q3.ok,true,q3.validation_errors.join(' '));
  assert.ok(q3.alternative_quantities.every((item)=>![1000,2000].includes(item.quantity)));
});

test('S52-PKG-V5: Akshay 98x150 registered model uses 10mm trim and resolves 22 units per frame',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],id:'small98',size_key:'98x150_bg30_30',name:'98 x 150',width_mm:98,height_mm:150,bottom_gusset_each_mm:30,
    pricing_bucket:1,gusset_production_mode:'conditional',production_profile_key:'sup_98x150_conditional',bottom_registration_mode:'optional',
    metadata:{trim_allowance_mm:10},
  }]};
  const result=calculateSupFormulaV5(context,{size_profile_id:'small98',construction_id:'c3',print:'CMYKW',quantity:5000,bottom_print_mode:'registered_artwork'});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  const body=result.production_route.components[0];
  assert.equal(body.web_width_mm,370);
  assert.equal(body.lanes_across,2);
  assert.equal(body.repeats_along,11);
  assert.equal(body.units_per_frame,22);
});

test('S52-PKG-V5: Akshay 98x150 unregistered model stays a distinct split-gusset price route',()=>{
  const context:PricingContextV5={...base,sizeProfiles:[{
    ...base.sizeProfiles[0],id:'small98',size_key:'98x150_bg30_30',name:'98 x 150',width_mm:98,height_mm:150,bottom_gusset_each_mm:30,
    pricing_bucket:1,gusset_production_mode:'conditional',production_profile_key:'sup_98x150_conditional',bottom_registration_mode:'optional',
    metadata:{trim_allowance_mm:10},
  }]};
  const registered=calculateSupFormulaV5(context,{size_profile_id:'small98',construction_id:'c3',print:'CMYKW',quantity:5000,bottom_print_mode:'registered_artwork'});
  const unregistered=calculateSupFormulaV5(context,{size_profile_id:'small98',construction_id:'c3',print:'CMYKW',quantity:5000,bottom_print_mode:'solid_unregistered'});
  assert.equal(unregistered.ok,true,unregistered.validation_errors.join(' '));
  assert.equal(unregistered.production_route.components.length,2);
  assert.notEqual(unregistered.selling_price.unit_price,registered.selling_price.unit_price);
});


test('S52-PKG-V5: approved SUP size mapping restricts Sales to the source PE thickness',()=>{
  const expected:Record<string,number> = {
    '80x130_bg25_25':60,'98x150_bg30_30':60,'110x170_bg30_30':75,'150x150_bg40_40':75,
    '120x210_bg40_40':75,'125x210_bg40_40':75,'130x210_bg40_40':75,'140x210_bg40_40':75,
    '145x210_bg40_40':75,'150x220_bg50_50':75,'160x240_bg50_50':75,'170x250_bg50_50':95,
    '185x270_bg50_50':95,'200x300_bg55_55':95,'210x300_bg55_55':95,'220x300_bg55_55':95,
    '230x310_bg55_55':95,'245x320_bg55_55':95,'260x340_bg60_60':95,'280x360_bg60_60':120,
  };
  for(const [size_key,micron] of Object.entries(expected)){
    assert.deepEqual(allowedPeMicronsForSupSizeV5({size_key,metadata:{}} as any),[micron],size_key);
  }
});

test('S52-PKG-V5: quoteable size-construction combinations fail closed when PE thickness is incompatible',()=>{
  const pe95=master('pe95','MAT_PE_95','PE 95','material','per_kg',185,95,0.925);
  const c75={...base.constructions[0],is_quoteable:true};
  const c95={...base.constructions[0],id:'c95',construction_key:'matte_metpet_pe95',name:'Matt Finish With Metpet / PE95',sealant_code:'MAT_PE_95',is_quoteable:true};
  const c95Layers=base.constructionLayers.filter((item)=>item.construction_id==='c3').map((item,index)=>({
    ...item,id:'c95l'+index,construction_id:'c95',cost_master_item_id:item.cost_master_item_id==='pe75'?'pe95':item.cost_master_item_id,
  }));
  const context:PricingContextV5={
    ...base,
    sizeProfiles:[{...base.sizeProfiles[0],id:'size170',size_key:'170x250_bg50_50',name:'170 x 250',width_mm:170,height_mm:250,is_quoteable:true}],
    constructions:[c75,c95],
    constructionLayers:[...base.constructionLayers.filter((item)=>item.construction_id==='c3'),...c95Layers],
    masters:[...base.masters,pe95],
  };
  const invalid=calculateSupFormulaV5(context,{size_profile_id:'size170',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(invalid.ok,false);
  assert.match(invalid.validation_errors.join(' '),/not compatible with/i);
  assert.match(invalid.validation_errors.join(' '),/PE 95/i);
  const valid=calculateSupFormulaV5(context,{size_profile_id:'size170',construction_id:'c95',print:'CMYKW',quantity:5000});
  assert.equal(valid.ok,true,valid.validation_errors.join(' '));
});

test('S52-PKG-V5: Spot UV is manual quote-level pricing while automatic Spot UV remains blocked',()=>{
  const spot:any={id:'spot',code:'EXTRA_SPOT_UV',name:'Spot UV',category:'extra',basis:null,application_stage:null,current_rate:0,currency:'INR',metadata:{}};
  const context:PricingContextV5={
    ...base,
    sizeProfiles:[{...base.sizeProfiles[0],is_quoteable:true}],
    constructions:base.constructions.map((item)=>({...item,is_quoteable:true})),
    charges:[spot],
  };
  const baseline=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(baseline.ok,true,baseline.validation_errors.join(' '));
  const manual=calculateSupFormulaV5(context,{
    size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000,
    manual_quote_charges:[{code:'EXTRA_SPOT_UV',amount:1250,note:'manual owner-deferred price'}],
  });
  assert.equal(manual.ok,true,manual.validation_errors.join(' '));
  assert.equal(manual.selling_price.unit_price,baseline.selling_price.unit_price);
  assert.equal(manual.selling_price.product_total,baseline.selling_price.product_total);
  assert.equal(manual.selling_price.separate_charges_total,1250);
  assert.ok(Math.abs(manual.selling_price.subtotal_before_gst-baseline.selling_price.product_total-1250)<0.01);
  assert.equal(manual.cost_breakdown.totals_for_job.additional_charges_cost,0);
  assert.equal(manual.applied_charges.find((item)=>item.code==='EXTRA_SPOT_UV')?.application_stage,'separate_quote_line');
  assert.equal(manual.applied_charges.find((item)=>item.code==='EXTRA_SPOT_UV')?.amount,1250);
  assert.ok(Math.abs(manual.selling_price.gst-baseline.selling_price.gst-(1250*0.18))<0.01);
  assert.ok(Math.abs(manual.selling_price.grand_total_before_freight-baseline.selling_price.grand_total_before_freight-(1250*1.18))<0.01);
  assert.ok(Math.abs(manual.cost_breakdown.reconciliation_delta)<0.000001);
  const auto=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000,selected_charge_codes:['EXTRA_SPOT_UV']});
  assert.equal(auto.ok,false);
  assert.match(auto.validation_errors.join(' '),/automatic pricing is on hold/i);
  const missing=calculateSupFormulaV5(context,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000,manual_quote_charges:[{code:'EXTRA_SPOT_UV',amount:0}]});
  assert.equal(missing.ok,false);
  assert.match(missing.validation_errors.join(' '),/manual price must be greater than zero/i);
});


test('S52-PKG-V5: Sales payload exposes selling prices but redacts COGS, run length, wastage and margin',()=>{
  const result=calculateSupFormulaV5(base,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  const sales:any=toSalesQuotePricingResultV5(result);
  assert.equal(sales.selling_price.unit_price,result.selling_price.unit_price);
  assert.equal('cost_breakdown' in sales,false);
  assert.equal('commercial_rules' in sales,false);
  assert.equal('source_hash' in sales,false);
  assert.equal('pricing_bucket' in sales.production_route,false);
  assert.ok(sales.production_route.components.every((item:any)=>!('units_per_frame' in item)&&!('run_length_m' in item)));
  assert.ok(sales.alternative_quantities.length>0);
  assert.ok(sales.alternative_quantities.every((item:any)=>{
    const keys=Object.keys(item).sort();
    return JSON.stringify(keys)===JSON.stringify(['product_total','quantity','unit_price']);
  }));
});

test('S52-PKG-V5: Sales higher-quantity suggestions have at least three valid engine-calculated steps when available',()=>{
  const result=calculateSupFormulaV5(base,{size_profile_id:'size160',construction_id:'c3',print:'CMYKW',quantity:5000});
  assert.equal(result.ok,true,result.validation_errors.join(' '));
  const sales:any=toSalesQuotePricingResultV5(result);
  const next=sales.alternative_quantities.filter((item:any)=>Number(item.quantity)>5000).slice(0,3);
  assert.deepEqual(next.map((item:any)=>item.quantity),[10000,20000,30000]);
  assert.ok(next.every((item:any)=>Number.isFinite(item.unit_price)&&Number.isFinite(item.product_total)));
});
