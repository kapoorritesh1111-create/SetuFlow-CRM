import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const page = read('src/components/marketing/home-growth-execution-page.tsx');
const route = read('src/app/page.tsx');

test('homepage leads with import-export growth and execution positioning', () => {
  assert.match(page, /AI-powered Import\/Export Growth and Execution CRM/);
  assert.match(page, /Find global opportunities\. Convert buyers\. Execute every order\./);
  assert.match(page, /Setu Flow Growth Center/);
  assert.match(page, /AI support from market discovery to final dispatch/);
});

test('homepage hero uses the main dashboard and restores client proof', () => {
  assert.match(page, /\/marketing\/dashboard-command-center\.png/);
  assert.match(page, /Trade Command Center — pipeline value, market activity, execution readiness and Setu Guru actions/);
  assert.match(page, /Trusted by businesses growing across borders/);
  assert.match(page, /\/clients\/blue-orbit-international\.jpg/);
  assert.match(page, /\/clients\/avanti-foods\.png/);
  assert.match(page, /\/clients\/wholesome-food\.png/);
  assert.match(page, /\/clients\/avanti-technologies\.png/);
  assert.match(page, /\/clients\/ash-and-noir\.png/);
});

test('homepage keeps industry specialization and comparison visible', () => {
  assert.match(page, /Built for international trade\. Configured for your industry\./);
  assert.match(page, /Apparel/);
  assert.match(page, /Packaging/);
  assert.match(page, /Distribution/);
  assert.match(page, /Where generic CRMs stop, Setu Flow keeps global trade moving/);
  assert.match(page, /View Full Comparison/);
});

test('root route renders the new marketing homepage', () => {
  assert.match(route, /HomeGrowthExecutionPage/);
});
