import { expect, test } from '@playwright/test';

const quantities=[1000,2000,3000,5000,10000,20000,30000,50000];
const sizes=[
  {id:'s1',size_key:'80x130_bg25_25',name:'80mm x 130mm (25mm + 25mm bg)',width_mm:80,height_mm:130,bottom_gusset_each_mm:25,pricing_bucket:1,gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',allowed_quantities:null,blocked_quantities:[1000,2000],metadata:{blocked_quantities:[1000,2000]}},
  {id:'s2',size_key:'160x240_bg50_50',name:'160mm x 240mm (50mm + 50mm bg)',width_mm:160,height_mm:240,bottom_gusset_each_mm:50,pricing_bucket:3,gusset_production_mode:'integrated',bottom_registration_mode:'not_applicable',allowed_quantities:null,blocked_quantities:null,metadata:{}},
  {id:'s3',size_key:'98x150_bg30_30',name:'98mm x 150mm (30mm + 30mm bg)',width_mm:98,height_mm:150,bottom_gusset_each_mm:30,pricing_bucket:1,gusset_production_mode:'conditional',route:'conditional',bottom_registration_mode:'optional',allowed_quantities:null,blocked_quantities:[1000,2000],metadata:{blocked_quantities:[1000,2000],trim_allowance_mm:10}},
  {id:'s4',size_key:'110x170_bg30_30',name:'110mm x 170mm (30mm + 30mm bg)',width_mm:110,height_mm:170,bottom_gusset_each_mm:30,pricing_bucket:2,gusset_production_mode:'conditional',route:'conditional',bottom_registration_mode:'optional',allowed_quantities:null,blocked_quantities:null,metadata:{},
  ...Array.from({length:16},(_,i)=>({
    id:'s'+(i+5),size_key:'uat_size_'+(i+5),name:'UAT Size '+(i+5),
    width_mm:130+i*5,height_mm:210+i*5,bottom_gusset_each_mm:40+(i%4)*5,
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
const bandSchedules:any={
  1:[[500,20,70],[1000,10,60],[2000,8,50],[3000,7,40],[5000,6,30],[10000,5,25]],
  2:[[250,25,70],[500,20,70],[1000,10,60],[2000,8,50],[3000,7,40],[5000,6,30],[10000,5,25]],
  3:[[250,25,35],[500,20,35],[1000,10,25],[2000,8,20],[3000,7,17],[5000,6,15],[10000,5,13]],
  4:[[250,25,35],[500,20,35],[1000,10,25],[2000,8,20],[3000,7,17],[5000,6,15],[10000,5,13]],
  5:[[250,25,35],[500,20,35],[1000,10,25],[2000,8,20],[3000,7,17],[5000,6,15],[10000,5,13]],
};
const bands=Object.entries(bandSchedules).flatMap(([bucket,items]:any)=>items.map((x:any,i:number)=>({
  id:'b'+bucket+'_'+(i+1),pricing_bucket:Number(bucket),run_length_max_m:x[0],wastage_pct:x[1],margin_per_frame:x[2],
  sort_order:i+1,source_worksheet:'Wastages and margins',source_row:Number(bucket)*10+i+1,
})));

function matrixRows(){
  return sizes.map((s,i)=>({
    size_profile_id:s.id,size_key:s.size_key,size_name:s.name,
    prices:quantities.map((quantity)=>{
      const blocked=(((s.metadata as any).blocked_quantities)||[]).includes(quantity);
      return {
        quantity,ok:!blocked,availability:blocked?'not_producible':'priced',
        unit_price:blocked?null:10+i+5000/quantity,product_total:blocked?null:(10+i+5000/quantity)*quantity,
        validation_errors:blocked?[`Quantity ${quantity.toLocaleString()} is not allowed for ${s.name}.`]:[],
      };
    })
  }));
}
function sizeMatrixRows(sizeId='s1'){
  const sizeIndex=Math.max(0,sizes.findIndex(x=>x.id===sizeId));
  const s=sizes[sizeIndex]||sizes[0];
  const constructionCount=sizeId==='s1'?12:sizeId==='s2'?18:14+(sizeIndex%8);
  return constructions.slice(0,constructionCount).map((construction,i)=>({
    construction_id:construction.id,
    construction_key:construction.construction_key,
    construction_name:construction.display_name||construction.name,
    layer_stack:construction.layer_stack,
    prices:quantities.map((quantity)=>{
      const blocked=(((s.metadata as any).blocked_quantities)||[]).includes(quantity);
      const unit=10+sizeIndex*2+i/10+5000/quantity;
      return {
        quantity,ok:!blocked,availability:blocked?'not_producible':'priced',
        unit_price:blocked?null:unit,product_total:blocked?null:unit*quantity,
        validation_errors:blocked?[`Quantity ${quantity.toLocaleString()} is not allowed for ${s.name}.`]:[],
      };
    }),
  }));
}
function singleResult(quantity=5000,bottomPrintMode=''){
  const unit=bottomPrintMode==='registered_artwork'?16.83605329:15.83605329;
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
        body=payload?.size_matrix?{ok:true,size_profile_id:payload.size_profile_id,rows:sizeMatrixRows(String(payload.size_profile_id||'s1'))}:payload?.matrix?{ok:true,rows:matrixRows()}:{ok:true,result:singleResult(Number(payload?.quantity||5000),String(payload?.bottom_print_mode||'')),review_details:{production_route:{route_type:'integrated',components:[{units_per_frame:7}]},commercial_rules:{bucket_no:3,run_length_m:800,wastage_pct:10,margin_per_frame:25},validation_errors:[]}};
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
      body={ok:true,materials,charges,drafts:[],commercial_bands:bands,commercial_band_reviews:[]};
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
  await expect(page.getByText(/Controlled by approved size \/ PE compatibility rules/i).first()).toBeVisible();
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
  await expect(page.locator('#salesQuoteStatus')).toContainText('Live Pricing v5 quote calculated');
  await expect(page.locator('#salesUnit')).toContainText('₹15.84');
  await expect(page.locator('#salesBreakdown')).toContainText('Material');
  await expect(page.locator('#salesQuantitySuggestions')).toContainText('10,000 pcs');
  await expect(page.locator('#salesQuantitySuggestions')).toContainText('20,000 pcs');
  await expect(page.locator('#salesQuantitySuggestions')).toContainText('30,000 pcs');
  const initialConstructionCount=await page.locator('#salesCon option').count();
  await page.locator('#salesSize').selectOption('s2');
  await expect.poll(()=>page.locator('#salesCon option').count()).not.toBe(initialConstructionCount);
  await expect(page.locator('#salesQuoteStatus')).toContainText('Live Pricing v5 quote calculated');
  await page.getByRole('button',{name:/Continue to Approval/i}).click();
  await expect(page.getByRole('heading',{name:'Impact & Approval',exact:true})).toBeVisible();
});


test('Sales Quote enforces MOQ, conditional gusset, stale-action safety and KLD routing',async({page})=>{
  await page.goto('/pricing-v5-review-premium.html');
  await page.locator('#sideNav').getByRole('button',{name:/Sales Quote/i}).click();
  await expect(page.locator('#salesQuoteStatus')).toContainText('Live Pricing v5 quote calculated');

  const defaultQtyOptions=await page.locator('#salesQty option').allTextContents();
  expect(defaultQtyOptions).not.toContain('1,000');
  expect(defaultQtyOptions).not.toContain('2,000');

  await page.locator('#salesSize').selectOption('s3');
  await expect(page.locator('#salesBottomGusset')).toBeVisible();
  await expect(page.locator('#salesQty option')).toHaveCount(6);
  const qTexts=await page.locator('#salesQty option').allTextContents();
  expect(qTexts).not.toContain('1,000');
  expect(qTexts).not.toContain('2,000');

  await page.locator('#salesBottomGusset').selectOption('solid_unregistered');
  await expect(page.locator('#salesQuoteStatus')).toContainText('Live Pricing v5 quote calculated');
  const unregistered=await page.locator('#salesUnit').textContent();

  await page.locator('#salesBottomGusset').selectOption('registered_artwork');
  await expect(page.locator('#salesQuoteStatus')).toContainText('Live Pricing v5 quote calculated');
  await expect(page.locator('#salesUnit')).not.toHaveText(unregistered||'');

  const continueButton=page.locator('#salesContinueReview');
  await page.locator('#salesPrint').selectOption('CMYK');
  await expect(continueButton).toBeDisabled();
  await expect(page.locator('#salesQuoteStatus')).toContainText('Live Pricing v5 quote calculated');
  await expect(continueButton).toBeEnabled();

  const urlBefore=page.url();
  const popupPromise=page.waitForEvent('popup');
  await page.locator('[data-sales-kld]').first().click();
  const popup=await popupPromise;
  await expect.poll(()=>popup.url()).toContain('/kld/pricing-v5/sup/98x150-bg-30-30.svg');
  expect(page.url()).toBe(urlBefore);
  await popup.close();
});

test('Sales Quote keeps workbook-backed 160x230 reconciliation checkpoint',async({page})=>{
  await page.goto('/pricing-v5-review-premium.html');
  await page.locator('#sideNav').getByRole('button',{name:/Sales Quote/i}).click();
  await expect(page.locator('#salesQuoteStatus')).toContainText('Live Pricing v5 quote calculated');
  await expect(page.locator('#salesUnit')).toContainText('₹15.84');
  await expect(page.locator('#salesBreakdown')).toContainText('Material');
  await expect(page.locator('#salesGrand')).not.toHaveText('—');
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

test('Waste and Matrix expose every commercial rule and the approved size-first construction matrix',async({page})=>{
  await page.goto('/pricing-v5-review-premium.html');

  await page.locator('#sideNav [data-page="waste"]').click();
  const waste=page.locator('#pv5WasteBands');
  await expect(waste).toContainText('Showing 1–10 of 34 run-length rules • Page 1 of 4');
  await waste.locator('[data-band-page="next"]').click();
  await expect(waste).toContainText('Showing 11–20 of 34 run-length rules • Page 2 of 4');
  await waste.locator('[data-band-page="4"]').click();
  await expect(waste).toContainText('Showing 31–34 of 34 run-length rules • Page 4 of 4');

  await page.locator('#sideNav [data-page="matrix"]').click();
  await expect(page.locator('#matrixSize')).toBeVisible();
  await expect(page.locator('#matrixPrint')).toBeVisible();
  await expect(page.locator('#matrixAddon')).toBeVisible();
  const matrix=page.locator('#liveMatrix');
  await expect(matrix).toContainText('valid constructions');
  await expect(matrix.locator('thead')).toContainText('Construction');
  await expect(matrix.locator('thead')).toContainText('1,000');
  await expect(matrix.locator('thead')).toContainText('50,000');
  await expect(matrix).toContainText('12 valid constructions');
  const initial3000=matrix.locator('[data-truth-price][data-qty="3000"]').first();
  await expect(initial3000).toBeVisible();
  const initialPrice=await initial3000.textContent();

  await page.locator('#matrixSize').selectOption('s2');
  await expect(matrix).toContainText('18 valid constructions');
  const changed3000=matrix.locator('[data-truth-price][data-qty="3000"]').first();
  await expect(changed3000).toBeVisible();
  await expect(changed3000).not.toHaveText(initialPrice||'');
  await expect(page.locator('#matrixSize')).toHaveValue('s2');

  const firstPriced=matrix.locator('[data-truth-price]').first();
  await expect(firstPriced).toBeVisible();
  await firstPriced.click();
  await expect(page.locator('#priceWhy')).toContainText('Calculated Selling Price');
  await expect(page.locator('#priceWhy')).toContainText('Material cost');
  await expect(page.locator('#priceWhy')).toContainText('Engine reconciled');
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
