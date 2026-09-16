import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('public/pricing-v5-dashboard-live-review.js','utf8');

test('Pricing v5 dashboard Review uses resilient delegated click handling',()=>{
  assert.match(src,/closest\?\.\('\[data-dash-review\]'\)/);
  assert.match(src,/rowById\(review\.dataset\.dashReview\)/);
  assert.match(src,/openReview\(row\)/);
});

test('Pricing v5 dashboard review can recover its modal host',()=>{
  assert.match(src,/function ensureModal\(\)/);
  assert.match(src,/document\.body\.appendChild\(modal\)/);
  assert.match(src,/modal\.classList\.add\('open'\)/);
  assert.match(src,/modal\.style\.display='flex'/);
});
