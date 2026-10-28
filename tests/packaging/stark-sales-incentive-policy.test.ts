import test from 'node:test';
import assert from 'node:assert/strict';
import {previewSalesIncentive,STARK_INCENTIVES_DISABLED} from '../../src/lib/packaging-pricing-v5/stark-sales-incentive-policy';
test('Stark incentives stay disabled and never credit sales by default',()=>{
  assert.equal(STARK_INCENTIVES_DISABLED.enabled,false);
  assert.deepEqual(previewSalesIncentive(undefined,{published_total:10000,realized_total:10000,verified_margin:3000}),{
    status:'disabled',credit:0,reason:'Sales incentives are not active.',
  });
});
test('Future policy previews cannot generate a live payout',()=>{
  const preview=previewSalesIncentive({enabled:true,currency:'INR',period:'calendar_month',published_price_floor_pct:90,maximum_credit_pct_of_margin:5,tiers:[{minimum_realized_price_pct:98,credit_pct_of_margin:3}]},{published_total:10000,realized_total:10000,verified_margin:3000});
  assert.deepEqual(preview,{status:'illustrative',credit:90,reason:'Preview only; not payable or posted.'});
});
