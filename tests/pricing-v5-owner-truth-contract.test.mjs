import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const premium=fs.readFileSync('public/pricing-v5-review-premium.js','utf8');
const constructions=fs.readFileSync('public/pricing-v5-construction-review.js','utf8');
const rates=fs.readFileSync('public/pricing-v5-rates-review.js','utf8');
const ratesRoute=fs.readFileSync('src/app/api/public/pricing-v5-review-rates/route.ts','utf8');
const dashboard=fs.readFileSync('public/pricing-v5-dashboard-live-review.js','utf8');

test('Pricing v5 fallback UI contains no invented owner evidence or sample approval claims',()=>{
  for(const pattern of [
    /Average Price Movement/i,
    /Biggest Increase/i,
    /Biggest Decrease/i,
    /Market feedback considered/i,
    /Ready for approval/i,
    /Custom Construction Drafts/i,
    /Approved Prices','38'/i,
    /Needs Review','7'/i,
    /Change Requested','3'/i,
    /₹13\.95/,
    /500 – 999/,
    /Default Margin','8%'/,
  ]) assert.doesNotMatch(premium,pattern,String(pattern));
});

test('Pricing v5 construction compatibility stays explicitly unconfirmed until owner decision',()=>{
  assert.match(constructions,/Compatibility pending owner confirmation/);
  assert.doesNotMatch(constructions,/\|\|'All Sizes'/);
  assert.match(premium,/Size Compatibility','Pending'/);
  assert.match(premium,/No construction is assumed compatible with every size/);
});

test('Pricing v5 charge review exposes and enforces complete basis and application stage',()=>{
  assert.match(ratesRoute,/basis,application_stage/);
  assert.match(ratesRoute,/configuration_complete:Boolean\(m\.basis&&m\.application_stage\)/);
  assert.match(ratesRoute,/charge_configuration_incomplete/);
  assert.match(rates,/Configuration incomplete/);
  assert.match(rates,/Publish Blocked/);
  assert.match(rates,/data-rate-complete/);
});

test('Pricing v5 full matrix has one live controller and no legacy sample price breakdown',()=>{
  assert.doesNotMatch(premium,/status=i>=6/);
  assert.doesNotMatch(premium,/price\*\.58|price\*\.204|price\*\.052/);
  assert.doesNotMatch(premium,/renderLiveMatrix\(\);/);
  assert.match(premium,/pv5:matrix-page-ready/);
  assert.match(premium,/PV5MatrixPagination/);
  assert.match(fs.readFileSync('public/pricing-v5-matrix-pagination.js','utf8'),/PV5MatrixPagination/);
  assert.match(fs.readFileSync('public/pricing-v5-matrix-pagination.js','utf8'),/pv5:matrix-page-ready/);
  assert.match(premium,/Loading the engine-backed price breakdown/);
});

test('Pricing v5 dashboard distinguishes intentional N/A from real clarification failures',()=>{
  assert.match(dashboard,/availability==='not_producible'/);
  assert.match(dashboard,/N\/A — Not Producible/);
  assert.match(dashboard,/No approval required/);
  assert.match(dashboard,/intentional N\/A/);
});
