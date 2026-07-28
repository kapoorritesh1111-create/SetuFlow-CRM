import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const home = read('src/components/marketing/home-growth-execution-page.tsx');
const pages = read('src/components/marketing/trade-execution-os-pages.tsx');
const platformTour = read('src/components/marketing/trade-execution-platform-tour-page.tsx');
const platformRoute = read('src/app/platform/page.tsx');
const solutionsRoute = read('src/app/solutions/page.tsx');
const compareRoute = read('src/app/compare/page.tsx');
const guruRoute = read('src/app/setu-guru-ai/page.tsx');
const layout = read('src/app/layout.tsx');

test('homepage presents the five layers as one connected Trade Execution OS', () => {
  assert.match(home, /Five connected layers\. One platform that runs trade\./);
  assert.match(home, /From market discovery to dispatch/);
  assert.match(home, /One connected system from opportunity to dispatch/);
  for (const layer of ['Growth Intelligence', 'Trade CRM', 'Commercial Operations', 'Trade Execution', 'Intelligence & Control']) {
    assert.match(home, new RegExp(layer));
  }
});

test('supporting routes use dedicated Trade Execution OS pages', () => {
  assert.match(platformRoute, /TradeExecutionPlatformTourPage/);
  assert.match(solutionsRoute, /TradeExecutionSolutionsPage/);
  assert.match(compareRoute, /TradeExecutionComparePage/);
  assert.match(guruRoute, /TradeExecutionGuruPage/);
});

test('platform page is a screenshot-led product tour rather than a second homepage', () => {
  assert.match(platformTour, /Product tour/);
  assert.match(platformTour, /See how Setu Flow moves work from opportunity to dispatch\./);
  assert.match(platformTour, /Platform tour navigation/);
  assert.match(platformTour, /Start the Tour/);
  assert.match(platformTour, /Build the pipeline before you manage it\./);
  assert.match(platformTour, /Turn every buyer and supplier into a working relationship\./);
  assert.match(platformTour, /Control pricing, terms and approvals/);
  assert.match(platformTour, /The workflow continues after the quote is accepted\./);
  assert.match(platformTour, /Know what is happening, why it matters and what should happen next\./);
  for (const asset of [
    '/marketing/growth-center.png',
    '/marketing/follow-up-queue.png',
    '/marketing/quote-workflow.png',
    '/marketing/ss-documents.jpg',
    '/marketing/ss-orders.jpg',
  ]) assert.match(platformTour, new RegExp(asset.replaceAll('/', '\\/').replace('.', '\\.')));
  assert.doesNotMatch(platformTour, /Built for every trade business/);
});

test('home remains the category and industry story', () => {
  assert.match(home, /The Trade/);
  assert.match(home, /Built for every trade business/);
  assert.match(home, /A CRM tracks the deal/);
  assert.doesNotMatch(home, /Platform tour navigation/);
});

test('solutions page keeps international trade primary and adds industry execution depth', () => {
  assert.match(pages, /One Trade Execution OS\./);
  assert.match(pages, /Configured for your industry\./);
  for (const industry of ['Exporters', 'Importers & Sourcing', 'Apparel', 'Packaging', 'Manufacturing', 'Distribution']) {
    assert.match(pages, new RegExp(industry.replace('&', '&')));
  }
});

test('Setu Guru is positioned as the intelligence layer with human control', () => {
  assert.match(pages, /The intelligence layer of the Trade Execution OS/);
  assert.match(pages, /Setu Guru recommends\. Your team decides\./);
  assert.match(pages, /\/setu-guru\/guru-avatar-256\.png/);
});

test('compare page distinguishes CRM tracking from trade execution', () => {
  assert.match(pages, /A CRM tracks the deal\./);
  assert.match(pages, /Setu Flow executes the trade\./);
  assert.match(pages, /Replace the gaps between sales and operations\./);
});

test('global metadata retains CRM search terms while leading with Trade Execution OS', () => {
  assert.match(layout, /AI-Powered Trade Execution OS/);
  assert.match(layout, /Trade Execution OS and Import Export CRM/);
  assert.match(layout, /import export CRM/);
});
