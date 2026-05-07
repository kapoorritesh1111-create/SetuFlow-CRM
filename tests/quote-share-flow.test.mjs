import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const whatsApp = readFileSync('src/features/quotes/server/whatsapp-delivery.ts', 'utf8');
const shareRoute = readFileSync('src/app/api/quotes/[quoteId]/share/route.ts', 'utf8');
const quotesHelp = readFileSync('docs/help/quotes.md', 'utf8');

test('whatsapp quote share uses production domain instead of vercel preview URLs', () => {
  assert.match(whatsApp, /PRODUCTION_SHARE_ORIGIN = 'https:\/\/www\.setuflowcrm\.com'/);
  assert.match(whatsApp, /!clean\.includes\('vercel\.app'\)/);
  assert.match(whatsApp, /View quote:/);
});

test('whatsapp message uses professional buyer-facing wording', () => {
  assert.match(whatsApp, /Please find quote/);
  assert.match(whatsApp, /SETU Groups LLC/);
  assert.match(whatsApp, /Please reply here if you would like any revisions or have questions/);
  assert.doesNotMatch(whatsApp, /Sharing quote .* from SETU Flow/);
});

test('quote share route renders html and does not expose placeholder json', () => {
  assert.match(shareRoute, /Content-Type': 'text\/html; charset=utf-8'/);
  assert.match(shareRoute, /Buyer-ready quote summary/);
  assert.match(shareRoute, /Open quote PDF/);
  assert.doesNotMatch(shareRoute, /NextResponse\.json/);
  assert.doesNotMatch(shareRoute, /Share endpoint placeholder/);
});

test('quote share route renders organization logo when available', () => {
  assert.match(shareRoute, /logo_url/);
  assert.match(shareRoute, /function renderLogo/);
  assert.match(shareRoute, /<img class="logo-img"/);
  assert.match(shareRoute, /logo-fallback/);
});

test('quotes help protects production-domain buyer share flow', () => {
  assert.match(quotesHelp, /production-domain quote share links/);
  assert.match(quotesHelp, /raw JSON/);
  assert.match(quotesHelp, /Do not expose Vercel preview URLs/);
  assert.match(quotesHelp, /organization logo/);
});
