import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('PASS28: mobile quick scan requires live OCR and never accepts generic image filename as company', () => {
  const drawer = read('src/features/leads/components/lead-drawer.tsx');
  const route = read('src/app/api/mobile/contact-scan/route.ts');
  const parser = read('src/lib/contact-exchange/contact-parser.ts');

  assert.match(drawer, /formData\.set\([\"']require_ocr[\"'], [\"']true[\"']\)/, 'camera/image scans must request live OCR');
  assert.match(drawer, /genericOnlyCompany/, 'drawer must reject Image\/Photo\/Scan as fake company names');
  assert.match(route, /extraction\.boundary !== 'server_image_ocr_live'/, 'API must reject image scans that did not complete live OCR');
  assert.match(parser, /isGenericScanFilename/, 'parser must avoid using generic camera filenames as company fallback');
  assert.doesNotMatch(parser, /fallbackCompany = company \|\| \(fileHint && !looksLikePersonName/, 'generic file hints must not become company names');
});

test('PASS28: vCard sharing uses public card query contract so downloaded contacts keep the real user name', () => {
  const shell = read('src/components/layout/app-shell.tsx');
  const mobileLeads = read('src/features/mobile/lib/app-mobile-leads.ts');
  const publicCard = read('src/lib/contact-exchange/public-card.ts');

  assert.match(shell, /params\.set\('name'/, 'mobile shell share URL must send name=');
  assert.match(shell, /params\.set\('org'/, 'mobile shell share URL must send org=');
  assert.match(shell, /params\.set\('role'/, 'mobile shell share URL must send role=');
  assert.match(mobileLeads, /params\.set\('name'/, 'mobile leads summary share URL must send name=');
  assert.match(publicCard, /get\('name'\) \|\| get\('fullName'\)/, 'public parser should stay backwards compatible with old fullName URLs');
});

test('PASS28: canonical lead quote route includes a mobile-safe quote surface and hides desktop workspace on phones', () => {
  const quotePage = read('src/app/(app)/leads/[leadId]/quote/page.tsx');

  assert.match(quotePage, /function MobileSafeLeadQuoteSurface/, 'quote route must include a mobile-safe quote surface');
  assert.match(quotePage, /md:hidden/, 'mobile quote surface must be visible on phone viewports');
  assert.match(quotePage, /hidden md:block/, 'desktop quote workspace must be hidden on phone viewports');
  assert.match(quotePage, /Full advanced controls remain available on desktop/, 'mobile copy should set clear handoff expectations');
});

test('PASS28: customer-facing quote language no longer says repo surface', () => {
  const quoteWorkspace = read('src/features/quotes/components/quote-workspace.tsx');
  assert.doesNotMatch(quoteWorkspace, /repo surface/i, 'customer-facing quote copy should not mention repo surface');
});
