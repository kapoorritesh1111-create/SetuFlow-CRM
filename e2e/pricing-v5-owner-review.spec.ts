import { expect, test } from '@playwright/test';

const quantities=[1000,2000,3000,5000,10000,20000,30000,50000];
const sizes=[
  {id:'s1',size_key:'80x130_bg25_25',name:'80mm x 130mm (25mm + 25mm bg)',width_mm:80,height_mm:130,bottom_gusset_each_mm:25,pricing_bucket:1,gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',metadata:{blocked_quantities:[1000,2000]}},
  {id:'s2',size_key:'160x240_bg50_50',name:'160mm x 240mm (50mm + 50mm bg)',width_mm:160,height_mm:240,bottom_gusset_each_mm:50,pricing_bucket:3,gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',metadata:{}},
  ...Array.from({length:18},(_,i)=>({
    id:'s'+(i+3),size_key:'uat_size_'+(i+3),name:'UAT Size '+(i+3),
    width_mm:120+i*5,height_mm:200+i*5,bottom_gusset_each_mm:40+(i%4)*5,
    pricing_bucket:Math.min(5,1+Math.floor(i/4)),gusset_production_mode:'integrated',
    bottom_registration_mode:'not_applicable',metadata:{},
  })),
];
const constructions=[
  {id:'c1',construction_key:'matte_metpet_pe75',name:'Matt Finish With Metpet (Silver film) / PE75',display_name:'Matt Finish With Metpet (Silver film) / PE75',layer_stack:'18 Matt BOPP / 12 MetPET / PE 75µ',structure_label:'18 Matt BOPP / 12 MetPET / PE 75µ',layer_count:3,finish_type:'matte',barrier_type:'silver',is_quoteable:true},
  {id:'c2',construction_key:'glossy_clear_window_pe75',name:'Glossy clear window / PE75',display_name:'Glossy clear window / PE75',layer_stack:'12 Clear PET / PE 75µ',structure_label:'12 Clear PET / PE 75µ',layer_count:2,finish_type:'glossy',barrier_type:'clear',is_quoteable:true},
  ...Array.from({length:42},(_,i)=>({
    id:'c'+(i+3),construction_key:'uat_construction_'+(i+3),name:'UAT Construction '+(i+3),
    display_name:'UAT Construction '+(i+3),layer_stack:(i%2?'12 PET / 12 MetPET / PE 75µ':'18 Matt BOPP / PE 75µ'),
    structure_label:(i%2?'12 PET / 12 MetPET / PE 75µ':'18 Matt BOPP / PE 75µ'),
    layer_count:i%2?3:2,finish_type:i%3?'glossy':'matte',barrier_type:i%2?'silver':'clear',is_quoteable:true,
  })),
];
const materials=[
  {id:'m1',code:'MAT_BOPP_MATT_18',name:'18 Matt BOPP',item_type:'material',micron:18,density:0.93,gsm:16.74,current_rate:190,rate_basis:'per_kg',rate_uom:'kg'},
  ...Array.from({length:11},(_,i)=>({id:'m'+(i+2),code:'MAT_UAT_'+(i+2),name:'UAT Material '+(i+2),item_type:'material',micron:12+i,density:1,gsm:12+i,current_rate:100+i,rate_basis:'per_kg',rate_uom:'kg'})),
  {id:'p1',code:'PROC_PRINT_CMYKW',name:'CMYKW Print',item_type:'process',current_rate:46,rate_basis:'per_frame',rate_uom:'frame'},
  {id:'p2',code:'PROC_LAMINATION',name:'Lamination',item_type:'process',current_rate:5,rate_basis:'per_running_metre',rate_uom:'running_m'},
  ...Array.from({length:9},(_,i)=>({id:'p'+(i+3),code:'PROC_UAT_'+(i+3),name:'UAT Process '+(i+3),item_type:'process',current_rate:10+i,rate_basis:'per_running_metre',rate_uom:'running_m'})),
];
const charges=[
  {id:'z1',code:'EXTRA_ZIPPER',name:'Zipper',category:'extra',basis:'per_running_metre',application_stage:'before_wastage_margin',current_rate:1.3,rate_uom:'running_m',configuration_complete:true},
  {id:'uv1',code:'EXTRA_SPOT_UV',name:'Spot UV',category:'extra',basis:null,application_stage:null,current_rate:0,rate_uom:null,configuration_complete:false},
];
const bands=[
  {id:'b1',pricing_bucket:1,run_length_max_m:500,wastage_pct:20,margin_per_frame:70,sort_order:1,source_worksheet:'Wastages & Margins',source_row:1},
  {id:'b2',pricing_bucket:1,run_length_max_m:1000,wastage_pct:10,margin_per_frame:60,sort_order:2,source_worksheet:'Wastages & Margins',source_row:2},
  {id:'b3',pricing_bucket:3,run_length_max_m:1000,wastage_pct:10,margin_per_frame:25,sort_order:3,source_worksheet:'Wastages & Margins',source_row:3},
];

function matrixRows(){
  return sizes.map((s,i)=>({
    size_profile_id:s.id,size_key:s.size_key,size_name:s.name,
    prices:quantities.map((quantity)=>({quantity,ok:!(((s.metadata as any).blocked_quantities)||[]).includes(quantity),unit_price:10+i+5000/quantity,product_total:(10+i+5000/quantity)*quantity}))
  }));
}
function singleResult(quantity=5000){
  const unit=15.83605329;
  return {
    ok:true,
    selling_price:{unit_price:unit,product_total:unit*quantity,gst:unit*quantity*.18,grand_total_before_freight:unit*quantity*1.18,currency:'INR'},
    construction:{id:'c1',name:constructions[0].name,layer_count:3,structure_label:constructions[0].layer_stack},
    production_route:{route_type:'integrated',components:[{key:'main_body',units_per_frame:7,run_length_m:800}]},
    commercial_rules:{bucket_no:3,run_length_m:800,band_max_m:1000,wastage_pct:10,margin_per_frame:25},
    cost_breakdown:{
      per_unit:{material_cost:2.18,printing_cost:6.57,lamination_cost:.8,slitting_cost:.32,pouch_making_cost:1.28,zipper_cost:.21,other_process_cost:0,base_production_cost:11.36,waste_cost:1.14,margin_cost:3.34,additional_charges_cost:0,final_price:unit},
      totals_for_job:{material_cost:10900,printing_cost:32850,lamination_cost:4000,slitting_cost:1600,pouch_making_cost:6400,zipper_cost:1050,other_process_cost:0,base_production_cost:56800,waste_cost:5700,margin_cost:16680,additional_charges_cost:0,final_price:unit*quantity},
      reconciliation_delta:0
    },
    alternative_quantities:quantities.filter(q=>q>=quantity).slice(0,6).map(q=>({quantity:q,unit_price:unit,product_total:unit*q,run_length_m:800,wastage_pct:10,margin_per_frame:25})),
    validation_errors:[],warnings:[]
  };
}

test.beforeEach(async({page})=>{
  await page.route('**/api/public/pricing-v5-*',async(route)=>{
    const request=route.request();
    const url=new URL(request.url());
    const p=url.pathname;
    let body:any={ok:true};

    if(p.endsWith('/pricing-v5-review-preview')){
      if(request.method()==='GET') body={ok:true,sizes,constructions,charges,review_quantities:quantities};
      else {
        let payload:any={}; try{payload=request.postDataJSON()}catch{}
        body=payload?.matrix?{ok:true,rows:matrixRows()}:{ok:true,result:singleResult(Number(payload?.quantity||5000)),review_details:{production_route:{route_type:'integrated',components:[{units_per_frame:7}]},commercial_rules:{bucket_no:3,run_length_m:800,wastage_pct:10,margin_per_frame:25},validation_errors:[]}};
      }
    } else if(p.endsWith('/pricing-v5-family-review')){
      body={ok:true,families:{
        sup:{name:'Stand Up Pouches',state:'published_baseline',template:{name:'SUP Pricing v5',row_count:20,engine:'sup_formula_v5'}},
        flat_bottom:{name:'Flat Bottom Pouches',state:'needs_configuration',clarification:'Geometry required.'},
        center_seal_roll:{name:'Center Seal — Roll Form',state:'review_baseline',template:{name:'Center Seal Review',row_count:2,engine:'matrix'}},
        center_seal_pouch:{name:'Center Seal — Pouch Form',state:'review_baseline',template:{name:'Center Seal Review',row_count:2,engine:'matrix'}},
        three_side_seal_roll:{name:'3 Side Seal — Roll Form',state:'review_baseline',template:{name:'3SS Review',row_count:2,engine:'matrix'}},
        three_side_seal_pouch:{name:'3 Side Seal — Pouch Form',state:'review_baseline',template:{name:'3SS Review',row_count:2,engine:'matrix'}},
      }};
    } else if(p.endsWith('/pricing-v5-owner-review-state')){
      if(request.method()==='GET') body={ok:true,items:[]};
      else {
        let payload:any={}; try{payload=request.postDataJSON()}catch{}
        body={ok:true,item:{review_key:payload.review_key,decision:payload.decision,value_json:payload.value_json||{},reviewer_name:'Stark Packmate Owner',updated_at:new Date().toISOString()}};
      }
    } else if(p.endsWith('/pricing-v5-review-rates')){
      body={ok:true,materials,charges,drafts:[],commercial_bands:bands};
    } else if(p.endsWith('/pricing-v5-review-commercial-bands')){
      body={ok:true,commercial_bands:bands,bands};
    } else if(p.endsWith('/pricing-v5-review-constructions')){
      body={ok:true,constructions};
    } else if(p.endsWith('/pricing-v5-review-sizes')){
      body={ok:true,sizes};
    } else if(p.endsWith('/pricing-v5-frame-family-review')){
      body={ok:true,families:[]};
    } else if(p.endsWith('/pricing-v5-feedback')){
      body={ok:true};
    }

    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
});

test('owner can navigate every Pricing v5 premium section',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto('/pricing-v5-review-premium.html');
  await expect(page.getByRole('heading',{name:'Pricing Dashboard'})).toBeVisible();

  const sections=[
    ['Sizes & KLDs','Sizes & KLDs'],
    ['Constructions','Constructions'],
    ['Rates & Charges','Rates & Charges'],
    ['Waste & Margins','Waste & Margins'],
    ['Price Matrix','Price Matrix'],
    ['Competitor Evaluator','Competitor Evaluator'],
    ['Sales Quote','Sales Quote'],
    ['Packaging Families','All Packaging Families — Review Now'],
    ['Impact & Approval','Impact & Approval'],
  ];
  for(const [navTitle,headingTitle] of sections){
    const escaped=navTitle.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
    await page.locator('#sideNav').getByRole('button',{name:new RegExp(escaped,'i')}).click();
    await expect(page.getByRole('heading',{name:headingTitle,exact:true})).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test('critical Pricing v5 owner actions open the correct live review controls',async({page})=>{
  await page.goto('/pricing-v5-review-premium.html');
  await expect(page.getByRole('heading',{name:'Pricing Dashboard'})).toBeVisible();

  await page.getByRole('button',{name:/View Full Matrix/i}).click();
  await expect(page.getByRole('heading',{name:'Price Matrix',exact:true})).toBeVisible();

  await page.getByRole('button',{name:/Review Exceptions/i}).click();
  await expect(page.locator('#modal')).toContainText('Review Exceptions');
  await page.locator('#modal').getByRole('button',{name:/Close/i}).click();

  await page.locator('#sideNav').getByRole('button',{name:/Constructions/i}).click();
  await expect(page.getByText(/Compatibility pending owner confirmation/i).first()).toBeVisible();
  await expect(page.getByRole('button',{name:/New Construction Draft/i})).toBeVisible();
  await page.getByRole('button',{name:/New Construction Draft/i}).click();
  await expect(page.locator('#modal')).toContainText(/Construction/i);
  await page.locator('#modal').getByRole('button',{name:/Close/i}).click();

  await page.locator('#sideNav').getByRole('button',{name:/Rates & Charges/i}).click();
  await expect(page.getByRole('button',{name:/Review \/ Change/i}).first()).toBeVisible();
  await page.getByRole('button',{name:/Review \/ Change/i}).first().click();
  await expect(page.locator('#modal')).toContainText('Review / Change Rate');
  await page.locator('#modal').getByRole('button',{name:/Close/i}).click();

  await page.locator('[data-rate-page="p:next"]').click();
  const spotRow=page.getByRole('row').filter({hasText:'Spot UV'});
  await expect(spotRow).toContainText('Configuration incomplete');
  await spotRow.getByRole('button',{name:/Review \/ Configure/i}).click();
  await expect(page.locator('#modal')).toContainText('Configuration incomplete');
  await expect(page.locator('#ratePublish')).toBeDisabled();
  await page.locator('#modal').getByRole('button',{name:/Close/i}).click();

  await page.locator('#sideNav').getByRole('button',{name:/Waste & Margins/i}).click();
  await expect(page.getByRole('button',{name:/Review \/ Request Change/i}).first()).toBeVisible();
  await page.getByRole('button',{name:/Review \/ Request Change/i}).first().click();
  await expect(page.locator('#modal')).toContainText('Review / Change Commercial Band');
  await page.locator('#modal').getByRole('button',{name:/Close/i}).click();

  await page.locator('#sideNav').getByRole('button',{name:/Sales Quote/i}).click();
  await page.getByRole('button',{name:/Save & Continue to Terms/i}).click();
  await expect(page.getByRole('heading',{name:'Impact & Approval',exact:true})).toBeVisible();
});


test('all Sizes, Constructions and Rates are reachable through pagination and size review advances to the next size',async({page})=>{
  await page.goto('/pricing-v5-review-premium.html');

  await page.locator('#sideNav [data-page="sizes"]').click();
  await expect(page.locator('#pv5SizesPager')).toContainText('Showing 1–10 of 20 sizes');
  const firstPageRows=page.locator('#page table tbody tr');
  await firstPageRows.nth(9).getByRole('button',{name:/Preview/i}).click();
  await expect(page.locator('#modal')).toContainText('Size 10 of 20');
  await page.locator('#pv5NextSize').click();
  await expect(page.locator('#modal')).toContainText('Size 11 of 20');
  await expect(page.locator('#pv5SizesPager')).toContainText('Showing 11–20 of 20 sizes');
  await page.locator('#modal').getByRole('button',{name:/Close/i}).click();

  await page.locator('#sideNav [data-page="constructions"]').click();
  const constructionReview=page.locator('#pv5ConstructionReview');
  await expect(constructionReview).toContainText('Showing 1–10 of 44 constructions • Page 1 of 5');
  await constructionReview.locator('[data-cp="next"]').click();
  await expect(constructionReview).toContainText('Showing 11–20 of 44 constructions • Page 2 of 5');
  await constructionReview.locator('[data-cp="5"]').click();
  await expect(constructionReview).toContainText('Showing 41–44 of 44 constructions • Page 5 of 5');

  await page.locator('#sideNav [data-page="rates"]').click();
  await expect(page.locator('.rates-layout > .card').nth(0)).toContainText('Showing 1–10 of 12 materials • Page 1 of 2');
  await page.locator('[data-rate-page="m:next"]').click();
  await expect(page.locator('.rates-layout > .card').nth(0)).toContainText('Showing 11–12 of 12 materials • Page 2 of 2');
  await expect(page.locator('.rates-layout > .card').nth(1)).toContainText('Showing 1–10 of 13 process/add-on rates • Page 1 of 2');
  await page.locator('[data-rate-page="p:next"]').click();
  await expect(page.locator('.rates-layout > .card').nth(1)).toContainText('Showing 11–13 of 13 process/add-on rates • Page 2 of 2');
});

test('Pricing v5 review stays responsive through repeated owner navigation',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto('/pricing-v5-review-premium.html');
  const pages=['dashboard','sizes','constructions','rates','waste','matrix','competitor','sales','families','approval'];
  for(let pass=0;pass<5;pass++){
    for(const key of pages){
      await page.locator('#sideNav [data-page="'+key+'"]').click();
      await expect(page.locator('#page .page-head h2')).toBeVisible();
    }
  }
  await page.locator('#sideNav [data-page="dashboard"]').click();
  await expect(page.getByRole('heading',{name:'Pricing Dashboard'})).toBeVisible();
  expect(pageErrors).toEqual([]);
});
