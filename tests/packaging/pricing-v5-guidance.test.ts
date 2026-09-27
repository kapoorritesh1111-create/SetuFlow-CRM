import assert from 'node:assert/strict';
import test from 'node:test';
import { rankPackagingSizeGuidance } from '../../src/lib/packaging-pricing-v5/size-guidance';
import { customerVolumeSuggestions } from '../../src/lib/packaging-pricing-v5/volume-suggestions';

test('Pricing v5 size guidance uses owner-maintained grams and applications only',()=>{
  const sizes=[
    {id:'small',name:'Small',width_mm:100,recommended_fill_grams:[100,150],application_examples:'spices, coffee'},
    {id:'medium',name:'Medium',width_mm:160,recommended_fill_grams:[250,500],application_examples:'snacks, dry fruit'},
    {id:'blank',name:'Blank',width_mm:120,recommended_fill_grams:[],application_examples:''},
  ];
  const byWeight:any[]=rankPackagingSizeGuidance(sizes,{fillGrams:120,limit:3}) as any[];
  assert.equal(byWeight[0].item.id,'small');
  assert.equal(byWeight.some((row:any)=>row.item.id==='blank'),false);
  const byApplication:any[]=rankPackagingSizeGuidance(sizes,{application:'dry fruit',limit:3}) as any[];
  assert.equal(byApplication[0].item.id,'medium');
});

test('customer volume suggestions keep only higher quantities with lower unit price',()=>{
  const rows=customerVolumeSuggestions(2000,10,[
    {quantity:3000,unit_price:10.2,product_total:30600},
    {quantity:5000,unit_price:9.5,product_total:47500},
    {quantity:10000,unit_price:9,product_total:90000},
    {quantity:20000,unit_price:8.5,product_total:170000},
    {quantity:30000,unit_price:8,product_total:240000},
  ]);
  assert.deepEqual(rows.map((row)=>row.quantity),[5000,10000,20000]);
  assert.ok(rows.every((row)=>row.unit_price<10&&row.savings_pct>0));
});
