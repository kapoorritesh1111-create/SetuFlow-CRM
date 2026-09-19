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
const salesSuggestions=read('public/pricing-v5-sales-suggestions.js');
const salesLive=read('public/pricing-v5-sales-live-quote.js');
const familyRoute=read('src/app/api/public/pricing-v5-family-review/route.ts');
const familyRuntime=read('public/pricing-v5-review-runtime.js');
const familyQuote=read('public/pricing-v5-sales-family-quote.js');
const ownerState=read('public/pricing-v5-owner-review-state.js');
const dbReviewSync=read('public/pricing-v5-db-review-sync.js');
const ownerNav=read('public/pricing-v5-owner-navigation-recovery.js');

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
  const ladder=/1000,\s*2000,\s*3000,\s*5000,\s*10000,\s*20000,\s*30000,\s*50000/;
  must(previewRoute,ladder,'preview API matrix ladder');
  must(matrix,ladder,'matrix pagination ladder');
  mustNot(base,/rows\.slice\(0,8\)/,'base Premium shell must not own or truncate the live matrix');
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
  must(matrix,/valid constructions • Page/,'Matrix page summary');
  must(matrix,/N\/A — Not Producible/,'Matrix row review preserves intentional N/A');
  must(matrixTruth,/priceState==='not_producible'/,'Price detail does not turn intentional N/A into a clarification');
  must(previewRoute,/availability: safe\.ok \? 'priced' : intentionallyUnavailable \? 'not_producible' : incompatibleConstruction \? 'not_compatible' : 'needs_clarification'/,'Matrix API classifies unavailable quantities and known construction incompatibility');
  must(previewRoute,/filter\(\(row\) => row\.prices\.some\(\(price\) => price\.availability !== 'not_compatible'\)\)/,'Size-first matrix omits incompatible construction rows');
  must(premium,/dataset\.bandPage/,'Global pager guard preserves Waste pagination');
  must(premium,/dataset\.mp/,'Global pager guard preserves Matrix pagination');
});


test('Pricing v5 owner Sales Quote shows up to three engine-backed higher producible quantities',()=>{
  must(salesSuggestions,/alternative_quantities/,'Sales suggestion controller reads engine alternative quantities');
  must(salesSuggestions,/x\.quantity>currentQty/,'Sales suggestion controller only shows higher quantities');
  must(salesSuggestions,/\.slice\(0,3\)/,'Sales suggestion controller is capped at three options');
  must(salesSuggestions,/N\/A quantities are excluded automatically/,'Sales suggestion copy explains blocked quantities are excluded');
  mustNot(base,/id="better10"|id="better20"/,'hardcoded two-card sales suggestions must not return');
});


test('Pricing v5 matrix invalidates stale price detail when controls change',()=>{
  must(matrix,/pv5:matrix-selection-changed/,'Matrix emits selection invalidation event');
  must(matrixTruth,/detailGeneration/,'Price detail tracks request generation');
  must(matrixTruth,/generation!==detailGeneration/,'Stale price-detail responses are ignored');
});

test('Pricing v5 owner Sales Quote is fully engine-backed and interactive',()=>{
  must(salesLive,/size_matrix:true/,'Sales quote filters constructions through size matrix');
  must(salesLive,/bottom_print_mode/,'Sales quote sends conditional bottom-gusset mode');
  must(salesLive,/cost_breakdown/,'Sales quote renders engine-backed owner breakdown');
  must(salesLive,/alternative_quantities/,'Sales quote renders engine-backed quantity suggestions');
  must(salesLive,/slice\(0,3\)/,'Sales quote caps suggestions at three');
  must(salesLive,/salesSaveReview/,'Sales quote can save a review snapshot');
  must(salesLive,/salesContinueReview/,'Sales quote can continue to approval');
  must(salesLive,/invalidateQuote/,'Sales quote invalidates prior calculated result as soon as controls change');
  must(salesLive,/matrixGeneration/,'Sales quote guards compatible-construction requests against stale responses');
  must(premium,/\[data-sales-kld\],#salesSaveReview,#salesContinueReview/,'Legacy capture handler bypasses live Sales Quote actions');
  mustNot(base,/\['#salesSize','#salesCon','#salesQty','#salesPrint','#salesZip'\].*refreshSales/,'Legacy Sales quote refresh wiring must stay disabled');
});


test('Pricing v5 Batch 8 exposes HTML only for families with real v5 engines',()=>{
  for(const key of ['center_seal_roll','center_seal_pouch','three_side_seal_roll','three_side_seal_pouch']){
    must(familyRoute,new RegExp(key),'family review API includes '+key);
  }
  must(familyRoute,/V5_REVIEW_SLUGS/,'family review API checks real v5 review templates');
  must(familyRoute,/eq\('calculation_version',5\)/,'family review API requires calculation version 5');
  must(familyRoute,/eq\('calculation_engine_key','frame_formula_v5'\)/,'family review API gates on frame_formula_v5');
  must(familyRoute,/v5_engine_ready/,'family review API exposes engine readiness to HTML');
  must(familyRoute,/v5_engine_ready_count/,'family API reports how many v5 engines are actually ready');
  must(base,/engineReady=f\.v5_engine_ready===true/,'family detail gates controls on backend engine readiness');
  must(base,/No Pricing v5 HTML has been enabled for this family/,'deferred families stay non-interactive in HTML');
  must(base,/PV5DbReview\.save\('family-setup:'/,'active-family setup is persisted to DB-backed owner review state');
  must(base,/confirmed_requirements/,'active-family setup tracks requirements independently');
  mustNot(familyQuote,/\['flat_bottom','Flat Bottom Pouches'/,'Flat Bottom stays out of quote HTML until its v5 engine exists');
  mustNot(familyQuote,/\['labels','Labels'/,'Labels stays out of quote HTML until its v5 engine exists');
  mustNot(familyQuote,/\['shrink_sleeves','Shrink Sleeves'/,'Shrink Sleeves stays out of quote HTML until its v5 engine exists');
  must(familyQuote,/stark-center-seal-roll-v5-review/,'Center Seal Roll quote review is wired');
  must(familyQuote,/stark-center-seal-pouch-v5-review/,'Center Seal Pouch quote review is wired');
  must(familyQuote,/stark-3ss-roll-v5-review/,'3SS Roll quote review is wired');
  must(familyQuote,/stark-3ss-pouch-v5-review/,'3SS Pouch quote review is wired');
  must(ownerState,/preserveReadiness/,'owner state does not overwrite v5 engine readiness');
  must(dbReviewSync,/V5 Engine Ready\|V5 Engine Missing\|Deferred/,'DB review sync preserves engine readiness and deferred truth');
  must(familyQuote,/pv5:sales-page-ready/,'family quote selector renders immediately when Sales page opens');
});


test('Pricing v5 family cards use a dedicated selector button without nested action buttons', () => {
  must(base,/class="family-card /,'family cards remain the owner review containers');
  must(base,/class="family-select"/,'family cards expose a dedicated review selector');
  must(base,/data-family-select=/,'family selector is explicitly keyed to the selected family');
  assert.doesNotMatch(base, /<button class="family-card /, 'family card container must not itself be a button');
});


test('Pricing v5 family selection uses an explicit selector and collection-safe family handler', () => {
  must(base,/data-family-select=/,'family selector remains explicitly keyed');
  must(base,/onclick="window\.PV5\.family/,'family selector calls the canonical family handler directly');
  must(base,/Array\.from\(document\.querySelectorAll\('\.family-card'\)\)\.forEach/,'family handler updates all family cards with a collection-safe selector');
  must(base,/setu_pricing_v5_selected_family_v1/,'selected family persists across page re-renders');
  assert.doesNotMatch(base, /<button class="family-card /, 'family card container must not itself be a button');
});


test('Pricing v5 family selector is captured by owner navigation recovery', () => {
  must(ownerNav,/\[data-family-select\]/,'owner navigation recovery sees family selector buttons');
  must(ownerNav,/window\.PV5\?\.family\?\./,'owner navigation recovery delegates to canonical family handler');
  must(ownerNav,/stopImmediatePropagation\(\)/,'family selection is protected from later click-handler interference');
});
