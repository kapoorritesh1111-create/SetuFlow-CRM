import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const base=read('public/pricing-v5-review-premium.js');
const html=read('public/pricing-v5-review-premium.html');
const premium=read('public/pricing-v5-premium-interactions.js');
const finalControls=read('public/pricing-v5-final-control-fixes.js');
const sizes=read('public/pricing-v5-sizes-pagination.js');
const constructions=read('public/pricing-v5-construction-review.js');
const rates=read('public/pricing-v5-rates-review.js');
const waste=read('public/pricing-v5-waste-review.js');
const matrix=read('public/pricing-v5-matrix-pagination.js');
const matrixTruth=read('public/pricing-v5-matrix-review-truth.js');
const previewRoute=read('src/app/api/public/pricing-v5-review-preview/route.ts');
const dashboard=read('public/pricing-v5-dashboard-live-review.js');
const qa=read('public/pricing-v5-owner-readiness-qa.js');
const scenario=read('public/pricing-v5-scenario-truth.js');

function must(source,re,label){assert.match(source,re,label)}
function mustNot(source,re,label){assert.doesNotMatch(source,re,label)}

test('Pricing v5 premium critical owner buttons have explicit working handlers',()=>{
  must(dashboard,/data-dash-review/,'dashboard Review control');
  must(dashboard,/dashFullMatrix/,'dashboard View Full Matrix');

  must(sizes,/data-size-edit|sizeEdit|Edit Size/i,'size edit control');
  must(premium,/Preview All/i,'KLD Preview All routing');

  must(constructions,/pv5NewConstruction/,'New Construction draft');
  must(constructions,/data-detail="preview"/,'construction Preview');
  must(constructions,/data-detail="edit"/,'construction Edit');
  must(constructions,/data-detail="clone"/,'construction Clone');
  must(constructions,/data-detail="approve"/,'construction Approve');

  must(rates,/data-rate-review/,'Rate Review\/Change');
  must(rates,/Add Rate\|Bulk Update/,'legacy Add Rate/Bulk Update handling');
  must(rates,/b\.disabled=true/,'legacy Add Rate/Bulk Update are explicitly disabled');

  must(waste,/data-band-review/,'commercial band review');
  must(waste,/Edit Buckets/i,'Edit Buckets handler');
  must(waste,/bandPreview/,'commercial band impact preview');
  must(waste,/bandPublish/,'commercial band publish');

  must(premium,/Review Exceptions/i,'matrix exceptions handler');
  must(premium,/Export Matrix/i,'matrix export handler');
  must(premium,/Compare Previous Version/i,'matrix previous-version handler');
  must(premium,/Save & Continue to Terms/i,'sales continue routing');
  must(premium,/Download KLD/i,'sales KLD routing');
  must(premium,/Add Packaging Line\|Remove Line/i,'sales line action handling');
  must(premium,/View Cross-Family Impact/i,'cross-family impact routing');

  must(scenario,/Find Market Comparables/i,'competitor search review handler');
  must(qa,/View Source\|TradeIndia\|Export to Excel/i,'unverified competitor source/export safety');
});

test('Pricing v5 review scripts no longer use permanent polling loops',()=>{
  const scripts=[...html.matchAll(/<script src="\/([^"?]+\.js)\?v=[^"]+"><\/script>/g)].map((m)=>m[1]);
  assert.ok(scripts.length>=20,'expected Pricing v5 enhancement scripts');
  for(const script of scripts){
    const src=read('public/'+script);
    mustNot(src,/setInterval\s*\(/,script+' must be event-driven/debounced, not permanently polled');
  }
});

test('Pricing v5 premium HTML uses one fresh cache version for all loaded assets',()=>{
  const versions=[...html.matchAll(/[?&]v=([0-9-]+)/g)].map((m)=>m[1]);
  assert.ok(versions.length>=20,'expected versioned Pricing v5 assets');
  assert.equal(new Set(versions).size,1,'all Pricing v5 CSS/JS assets must share one cache version');
});

test('Pricing v5 review copy reflects 20 approved SUP sizes, not the superseded 21-size draft',()=>{
  const joined=[base,read('public/pricing-v5-owner-review-actions.js'),read('public/pricing-v5-owner-review-state.js'),read('public/pricing-v5-db-review-sync.js')].join('\n');
  mustNot(joined,/Approve All 21|21 SUP sizes|21 standard sizes|of 21 owner approved/i,'stale 21-size copy must not return');
  must(joined,/20 approved SUP sizes|20 sizes|of 20 owner approved/i,'20-size source-of-truth copy must be present');
});

test('Pricing v5 review ladder is the approved 1K to 50K set',()=>{
  const ladder='1000,2000,3000,5000,10000,20000,30000,50000';
  must(base,new RegExp(ladder),'base matrix ladder');
  must(matrix,new RegExp(ladder),'matrix pagination ladder');
});

test('Pricing v5 Sizes Constructions and Rates expose working pagination plus next-size review navigation',()=>{
  must(sizes,/const PAGE_SIZE=10/,'Sizes page size');
  must(sizes,/data-pv5-page="next"/,'Sizes Next page control');
  must(sizes,/id="pv5NextSize"/,'Next Size control');
  must(sizes,/moveToSize\(s,1\)/,'Next Size changes the reviewed size');
  must(constructions,/const PAGE_SIZE=10/,'Construction page size');
  must(constructions,/data-cp="next"/,'Construction Next page control');
  must(constructions,/Page '\+page\+' of '\+totalPages\(\)/,'Construction page summary');
  must(rates,/const PAGE=10/,'Rate page size');
  must(rates,/data-rate-page="'\+kind\+':next"/,'Rate Next page control');
  must(rates,/materials • Page/,'Material-rate page summary');
  must(rates,/process\/add-on rates • Page/,'Process/add-on page summary');
  must(premium,/dataset\.pv5Page/,'Global pager guard preserves the live Sizes pager');
});

test('Pricing v5 Waste and Matrix expose complete pagination and intentional N/A handling',()=>{
  must(waste,/const PAGE_SIZE=10/,'Waste page size');
  must(waste,/data-band-page="next"/,'Waste Next page control');
  must(waste,/run-length rules • Page/,'Waste page summary');
  must(waste,/commercial_band_reviews/,'Waste owner review state');
  must(matrix,/data-mp="next"/,'Matrix Next page control');
  must(matrix,/sizes • Page/,'Matrix page summary');
  must(matrix,/id="mpNextRow"/,'Matrix next-size row review');
  must(matrix,/N\/A — Not Producible/,'Matrix row review preserves intentional N/A');
  must(matrixTruth,/priceState==='not_producible'/,'Price detail does not turn intentional N/A into a clarification');
  must(previewRoute,/availability: safe\.ok \? 'priced' : intentionallyUnavailable \? 'not_producible' : 'needs_clarification'/,'Matrix API classifies unavailable quantities');
  must(premium,/dataset\.bandPage/,'Global pager guard preserves Waste pagination');
  must(premium,/dataset\.mp/,'Global pager guard preserves Matrix pagination');
});
