import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const page = read('src/components/marketing/home-growth-execution-page.tsx');
const route = read('src/app/page.tsx');

const industryAssets = [
  'exporters.svg',
  'importers-sourcing.svg',
  'apparel.svg',
  'packaging.svg',
  'manufacturing.svg',
  'distribution.svg',
];

test('homepage leads with Trade Execution OS positioning', () => {
  assert.match(page, /AI-powered Trade Execution OS/);
  assert.match(page, /The Trade/);
  assert.match(page, /Execution/);
  assert.match(page, /Find opportunities\. Win buyers\. Execute every order\./);
  assert.match(page, /market discovery, buyer and supplier relationships, quotations, approvals, documents, orders and dispatch/);
});

test('homepage hero uses the Trade Execution Command Center and verified client proof', () => {
  assert.match(page, /\/marketing\/dashboard-command-center\.png/);
  assert.match(page, /Setu Flow Trade Execution Command Center/);
  assert.match(page, /Trusted by businesses growing across borders/);
  assert.match(page, /\/clients\/blue-orbit-international\.jpg/);
  assert.match(page, /\/clients\/avanti-foods\.png/);
  assert.match(page, /\/clients\/wholesome-food\.png/);
  assert.match(page, /\/clients\/ash-and-noir\.png/);
  assert.doesNotMatch(page, /\/clients\/avanti-technologies\.png/);
});

test('homepage presents the full trade execution journey and operating layers', () => {
  for (const label of ['Discover', 'Capture', 'Convert', 'Quote', 'Approve', 'Execute', 'Dispatch', 'Grow']) assert.match(page, new RegExp(label));
  for (const layer of ['Growth Intelligence', 'Trade CRM', 'Commercial Operations', 'Trade Execution', 'Intelligence & Control']) assert.match(page, new RegExp(layer));
  assert.match(page, /Your CRM ends at the deal/);
  assert.match(page, /Setu Flow runs the trade/);
});

test('homepage ships one local branded visual for every industry', () => {
  for (const asset of industryAssets) {
    assert.match(page, new RegExp(`/marketing/industries/${asset.replace('.', '\\.')}`));
    assert.equal(fs.existsSync(`public/marketing/industries/${asset}`), true, `${asset} must exist`);
  }
  for (const industry of ['Exporters', 'Importers & Sourcing', 'Apparel', 'Packaging', 'Manufacturing', 'Distribution']) assert.match(page, new RegExp(industry.replace('&', '&')));
});

test('homepage uses official Setu Guru branding and preserves the CRM comparison', () => {
  assert.match(page, /\/setu-guru\/guru-avatar-256\.png/);
  assert.match(page, /AI intelligence across every stage of trade/);
  assert.match(page, /A CRM tracks the deal/);
  assert.match(page, /Setu Flow executes the trade/);
  assert.match(page, /Setu Flow — Trade Execution OS/);
});

test('root route renders the marketing homepage', () => {
  assert.match(route, /HomeGrowthExecutionPage/);
});
