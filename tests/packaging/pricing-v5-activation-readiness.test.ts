import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const owner=fs.readFileSync('src/features/packaging/components/pricing-v5-owner-control-center-v2.tsx','utf8');
const sales=fs.readFileSync('src/features/packaging/components/pricing-v5-sales-configurator-v2.tsx','utf8');
const manifest=fs.readFileSync('src/lib/packaging-pricing-v5/sample-klds.ts','utf8');
const adminPage=fs.readFileSync('src/app/(app)/admin/packaging-pricing-v5/page.tsx','utf8');
const salesOptions=fs.readFileSync('src/lib/packaging-pricing-v5/sales-options.ts','utf8');

const kldFiles=[
'80x130-bg-25-25','98x150-bg-30-30','110x170-bg-30-30','150x150-bg-40-40','120x210-bg-40-40','125x210-bg-40-40','130x210-bg-40-40','140x210-bg-40-40','145x210-bg-40-40','150x220-bg-50-50','160x240-bg-50-50','170x250-bg-50-50','185x270-bg-50-50','200x300-bg-55-55','210x300-bg-55-55','220x300-bg-55-55','230x310-bg-55-55','245x320-bg-55-55','260x340-bg-60-60','280x360-bg-60-60'];

test('Pricing v5 activation: all 20 Stark-reference review KLD assets exist',()=>{
  assert.equal(kldFiles.length,20);
  for(const file of kldFiles){
    const path=`public/kld/pricing-v5/sup/${file}.svg`;
    assert.ok(fs.existsSync(path),`missing ${path}`);
    const svg=fs.readFileSync(path,'utf8');
    assert.match(svg,/STARK PACKMATE SAMPLE KLD/);
    assert.match(svg,/NOT FOR PRODUCTION/);
    assert.match(svg,/7\.5 mm side trim/);
    assert.match(svg,/15 mm zipper/);
  }
  assert.equal((manifest.match(/sample_url:/g)||[]).length,20);
});

test('Pricing v5 activation: owner dashboard auto-recalculates and exposes sample/production KLD readiness separately',()=>{
  assert.match(owner,/useEffect\(\(\)=>\{setMatrix\(\[\]\)/);
  assert.match(owner,/previewPackagingPricingV5/);
  assert.match(owner,/Sample KLDs/);
  assert.match(owner,/Production KLD coverage/);
  assert.match(owner,/Samples never become selectable Sales KLDs/);
  assert.match(adminPage,/packaging_kld_files/);
  assert.match(adminPage,/klds:klds\.data/);
});

test('Pricing v5 activation: Sales shows only valid published options and sample KLDs are preview-only',()=>{
  assert.match(salesOptions,/\.filter\(\(item\)=>item\.is_active&&item\.is_quoteable\)/);
  assert.match(sales,/matchingKlds/);
  assert.match(sales,/KLDs from other sizes are hidden/);
  assert.match(sales,/Preview blank sample KLD/);
  assert.match(sales,/sample is available below but cannot be selected/);
  assert.doesNotMatch(sales,/kld_file_id:\s*sampleKld/);
});

test('Pricing v5 activation: Sales offers better approved quantity when unit price drops',()=>{
  assert.match(sales,/Better price option/);
  assert.match(sales,/alternative_quantities/);
  assert.match(sales,/Number\(r\.unit_price\)<current/);
  assert.match(sales,/Use \{Number\(best\.quantity\)\.toLocaleString\(\)\} pcs/);
});

test('Pricing v5 activation: 110x170 and split-gusset behavior remain explicit',()=>{
  assert.match(sales,/Printing on the bottom gusset\?/);
  assert.match(sales,/solid_unregistered/);
  assert.match(sales,/registered_artwork/);
  assert.match(sales,/automatically uses split-gusset production/);
});
