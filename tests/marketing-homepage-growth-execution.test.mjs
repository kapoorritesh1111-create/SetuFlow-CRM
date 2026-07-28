import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const page = read('src/components/marketing/home-growth-execution-page.tsx');
const route = read('src/app/page.tsx');
const heroCss = read('src/app/marketing-hero-tuning.css');

test('homepage leads with import-export growth and execution positioning', () => {
  assert.match(page, /AI-powered Import\/Export Growth and Execution CRM/);
  assert.match(page, /Find global opportunities\./);
  assert.match(page, /Convert buyers\./);
  assert.match(page, /Execute every order\./);
  assert.match(page, /Setu Flow Growth Center/);
  assert.match(page, /AI support from market discovery to final dispatch/);
});

test('homepage hero uses the main dashboard and verified client proof', () => {
  assert.match(page, /\/marketing\/dashboard-command-center\.png/);
  assert.match(page, /Trade Command Center — pipeline value, market activity, execution readiness and Setu Guru actions/);
  assert.match(page, /Trusted by businesses growing across borders/);
  assert.match(page, /\/clients\/blue-orbit-international\.jpg/);
  assert.match(page, /\/clients\/avanti-foods\.png/);
  assert.match(page, /\/clients\/wholesome-food\.png/);
  assert.match(page, /\/clients\/ash-and-noir\.png/);
  assert.doesNotMatch(page, /\/clients\/avanti-technologies\.png/);
});

test('homepage keeps the value-loss section readable and isolated from the video hero', () => {
  assert.match(page, /Where international growth and execution break down\./);
  assert.match(page, /<section className="bg-white px-4 py-16/);
  assert.match(page, /bg-slate-50\/70/);
  assert.match(page, /text-slate-950/);
  assert.match(page, /text-slate-600/);
});

test('homepage uses the official Setu Guru avatar asset', () => {
  assert.match(heroCss, /\/setu-guru\/guru-avatar-128\.png/);
  assert.match(heroCss, /Homepage Setu Guru preview must use the real brand avatar/);
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
