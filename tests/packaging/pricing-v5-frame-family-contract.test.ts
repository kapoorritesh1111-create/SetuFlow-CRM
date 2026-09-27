import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const geometry=fs.readFileSync('src/lib/packaging-pricing-v5/frame-family-geometry.ts','utf8');
const core=fs.readFileSync('src/lib/packaging-pricing-v5/frame-family-cost-core.ts','utf8');

test('Pricing v5 frame families preserve Stark v4 geometry instead of rotating dimensions',()=>{
  assert.match(geometry,/center_seal_roll/);
  assert.match(geometry,/center_seal_pouch/);
  assert.match(geometry,/three_side_seal_roll/);
  assert.match(geometry,/three_side_seal_pouch/);
  assert.match(geometry,/Math\.floor\(machineWidth\s*\/\s*openLaminateWidth\)/);
  assert.match(geometry,/Math\.floor\(machineLength\s*\/\s*repeatLength\)/);
  assert.match(geometry,/\(2 \* height\) \+ 12/);
  assert.doesNotMatch(geometry,/Math\.max\([\s\S]*rotate/i);
});

test('Pricing v5 frame-family costing uses shared construction and Cost Master inputs',()=>{
  assert.match(core,/resolveConstructionV5/);
  assert.match(core,/MAT_ADHESIVE/);
  assert.match(core,/PROC_PRINT_CMYK/);
  assert.match(core,/PROC_PRINT_CMYKW/);
  assert.match(core,/PROC_LAMINATION/);
  assert.match(core,/PROC_SLITTING/);
  assert.match(core,/PROC_POUCHING/);
  assert.match(core,/layer\.master\.current_rate/);
});

test('Roll and Pouch forms do not share pouching behavior blindly',()=>{
  assert.match(geometry,/supplyForm === 'center_seal_pouch' \|\| supplyForm === 'three_side_seal_pouch'/);
  assert.match(core,/geometry\.apply_pouching/);
});

test('Center Seal and 3SS use provisional owner-selected default buckets when Sales does not choose one',()=>{
  assert.match(core,/default_commercial_bucket/);
  assert.match(core,/Using provisional owner-selected bucket/);
  assert.match(core,/commercial_bucket: resolvedBucket/);
  assert.match(core,/commercial_bucket: PricingBucketV5 \| null/);
});


test('Published frame families stop identifying themselves as review-only after activation',()=>{
  assert.match(core,/const reviewOnly=Boolean\(context\.template\.quote_config_json\?\.review_only\)/);
  assert.match(core,/review_only: reviewOnly/);
});
