import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePackagingCharges, toSalesChargeLines } from '../../src/lib/packaging-pricing/charges';

const charge = (overrides: Record<string, unknown>) => ({
  id: 'charge',
  code: 'CHARGE',
  name: 'Charge',
  category: 'extra',
  basis: 'per_unit',
  application_stage: 'separate_quote_line',
  current_rate: 2,
  currency: 'INR',
  metadata: {},
  ...overrides,
}) as any;

const usage = {
  quantity: 100,
  frames_exact: 10,
  units_per_frame: 10,
  running_metres_per_frame: 1.5,
  total_running_metres: 15,
  percent_bases: { product_total: 1000 },
};

test('S51-PKG-049: charge bases use explicit physical/financial usage', () => {
  const charges = [
    charge({ id:'unit', code:'UNIT', name:'Per unit', basis:'per_unit', current_rate:2 }),
    charge({ id:'metre', code:'METRE', name:'Per metre', basis:'per_running_metre', current_rate:3 }),
    charge({ id:'frame', code:'FRAME', name:'Per frame', basis:'per_frame', current_rate:4 }),
    charge({ id:'flat', code:'FLAT', name:'Flat', basis:'flat', current_rate:50 }),
    charge({ id:'percent', code:'PERCENT', name:'Percent', basis:'percent', current_rate:5, metadata:{percent_base:'product_total'} }),
  ];
  const result = evaluatePackagingCharges(charges, charges.map((item:any)=>item.code), usage);
  assert.equal(result.ok, true, result.validation_errors.join(' '));
  const amount = (code:string) => result.separate_quote_line.find((item)=>item.code===code)?.amount_total;
  assert.equal(amount('UNIT'), 200);
  assert.equal(amount('METRE'), 45);
  assert.equal(amount('FRAME'), 40);
  assert.equal(amount('FLAT'), 50);
  assert.equal(amount('PERCENT'), 50);
});

test('S51-PKG-049: before-wastage charge is normalized per frame', () => {
  const result = evaluatePackagingCharges([
    charge({ code:'ZIP', name:'Zipper', basis:'per_running_metre', application_stage:'before_wastage_margin', current_rate:1.3 }),
  ], ['ZIP'], usage);
  assert.equal(result.ok, true);
  assert.ok(Math.abs(result.before_wastage_margin_per_frame - 1.95) < 1e-12);
});

test('S51-PKG-049: after-core charges stay outside the waste/margin base', () => {
  const result = evaluatePackagingCharges([
    charge({ code:'AFTER', name:'After core', basis:'flat', application_stage:'after_core_price', current_rate:75 }),
  ], ['AFTER'], usage);
  assert.equal(result.ok, true);
  assert.equal(result.before_wastage_margin_per_frame, 0);
  assert.equal(result.after_core_price_total, 75);
});

test('S51-PKG-049: pre/post separate totals are categorized', () => {
  const result = evaluatePackagingCharges([
    charge({ code:'PRE', name:'Design', category:'pre', basis:'flat', current_rate:120 }),
    charge({ code:'POST', name:'Freight', category:'post', basis:'flat', current_rate:80 }),
  ], ['PRE','POST'], usage);
  assert.equal(result.pre_production_total, 120);
  assert.equal(result.post_production_total, 80);
  assert.equal(result.separate_quote_total, 200);
});

test('S51-PKG-049: unconfirmed charge configuration fails closed', () => {
  for (const broken of [
    charge({ code:'NO_RATE', current_rate:null }),
    charge({ code:'NO_BASIS', basis:null }),
    charge({ code:'NO_STAGE', application_stage:null }),
    charge({ code:'PERCENT_NO_BASE', basis:'percent', metadata:{} }),
  ]) {
    const result = evaluatePackagingCharges([broken], [broken.code], usage);
    assert.equal(result.ok, false, broken.code);
    assert.ok(result.validation_errors.length > 0, broken.code);
  }
});

test('S51-PKG-049: per-running-metre charge fails when engine has no approved metre rule', () => {
  const result = evaluatePackagingCharges([
    charge({ code:'METRE', basis:'per_running_metre' }),
  ], ['METRE'], { ...usage, running_metres_per_frame:null, total_running_metres:null });
  assert.equal(result.ok, false);
  assert.match(result.validation_errors.join(' '), /running-metre usage rule/i);
});

test('S51-PKG-049: Sales projection omits Master ID, rate, basis and application stage', () => {
  const result = evaluatePackagingCharges([
    charge({ id:'secret-master-id', code:'PRE', name:'Design', category:'pre', basis:'flat', current_rate:120 }),
  ], ['PRE'], usage);
  const sales = toSalesChargeLines(result.separate_quote_line);
  assert.deepEqual(sales, [{ code:'PRE', name:'Design', category:'pre', amount:120 }]);
  assert.equal('rate' in sales[0], false);
  assert.equal('master_id' in sales[0], false);
  assert.equal('basis' in sales[0], false);
  assert.equal('application_stage' in sales[0], false);
});
