import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const shell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');
const widget = readFileSync('src/features/setu-guru/setu-guru-widget.tsx', 'utf8');
const orgSearchRoute = readFileSync('src/app/api/setu-guru/org-search/route.ts', 'utf8');
const liveResearch = readFileSync('src/lib/setu-guru/live-research.ts', 'utf8');

test('Setu Guru widget is embedded in the authenticated shell', () => {
  assert.match(shell, /SetuGuruWidget/);
  assert.match(shell, /routeTitle=\{routeMeta\.title\}/);
  assert.match(widget, /setu-guru-widget-hidden/);
  assert.match(widget, /RightDrawer/);
});

test('Setu Guru docs and runtime assets are present', () => {
  [
    'public/setu-guru/setu-guru-avatar.svg',
    'public/setu-guru/navigation-map.svg',
    'public/setu-guru/pricing-hierarchy.svg',
    'public/setu-guru/roles-permissions.svg',
    'public/setu-guru/knowledge-manifest.json',
    'docs/setu-guru/SETU_GURU_GPT_BUILD_PROMPT.md',
    'docs/setu-guru/SETU_GURU_LEARNING_LOOP.md',
    'docs/setu-guru/SETU_GURU_REPO_REVIEW.md',
    'docs/setu-guru/SETUFLOW_ONBOARDING_GUIDE.md',
    'docs/setu-guru/SETUFLOW_TROUBLESHOOTING.md',
    'docs/setu-guru/SETUFLOW_WORKFLOWS.md',
    'docs/setu-guru/SETUFLOW_KNOWLEDGE_BASE.md',
    'docs/help/dashboard.md',
    'docs/help/leads.md',
    'docs/help/products.md',
    'docs/help/quotes.md',
    'docs/help/orders.md',
    'docs/help/compliance.md',
    'docs/help/trade-events.md',
    'docs/help/admin-organization.md',
    'docs/help/pricing-calculator.md',
    'docs/help/setu-guru.md',
    'src/lib/setu-guru/page-context.ts',
    'src/lib/setu-guru/help-registry.ts',
    'src/lib/setu-guru/guru-response-policy.ts',
    'src/lib/setu-guru/live-research.ts',
  ].forEach((path) => assert.equal(existsSync(path), true, `${path} should exist`));
});

test('Setu Guru help registry covers the main route help docs', () => {
  const registry = readFileSync('src/lib/setu-guru/help-registry.ts', 'utf8');
  [
    'docs/help/dashboard.md',
    'docs/help/leads.md',
    'docs/help/products.md',
    'docs/help/quotes.md',
    'docs/help/orders.md',
    'docs/help/compliance.md',
    'docs/help/trade-events.md',
    'docs/help/admin-organization.md',
    'docs/help/pricing-calculator.md',
    'docs/help/setu-guru.md',
  ].forEach((docPath) => assert.match(registry, new RegExp(docPath.replace(/[/.]/g, '\\$&'))));
  assert.match(registry, /getBestSetuGuruHelpTopic/);
  assert.match(registry, /getSetuGuruRouteTopics/);
});

test('Setu Guru widget uses the route help registry and page context collector', () => {
  assert.match(widget, /collectSetuGuruPageContext/);
  assert.match(widget, /getBestSetuGuruHelpTopic/);
  assert.match(widget, /getRouteHelpSummary/);
  assert.match(widget, /getSetuGuruRouteTopics/);
  assert.match(widget, /isSetuGuruOrgSearchQuestion/);
  assert.match(widget, /page_help/);
  assert.doesNotMatch(widget, /const TOPICS/);
});

test('Setu Guru widget renders source research rows as source cards', () => {
  assert.match(widget, /isSourceRow/);
  assert.match(widget, /setu-guru-source-row/);
  assert.match(widget, /Open source/);
  assert.match(widget, /citation/);
});

test('Setu Guru org search supports page help before live database lookup', () => {
  assert.match(orgSearchRoute, /buildPageHelpAnswer/);
  assert.match(orgSearchRoute, /mode === 'page_help'/);
  assert.match(orgSearchRoute, /getBestSetuGuruHelpTopic/);
  assert.match(orgSearchRoute, /getRouteHelpSummary/);
  assert.match(orgSearchRoute, /classifySetuGuruResponse/);
  assert.match(orgSearchRoute, /Ask “what can you do on this page\?” for route help/);
});

test('Setu Guru org search normalizes roadmap mode aliases', () => {
  assert.match(orgSearchRoute, /normalizeSetuGuruOrgSearchMode/);
  ['catalog_search', 'buyer_search', 'supplier_search', 'lead_search', 'quote_compliance', 'pricing_defaults', 'hsn_enrichment', 'document_requirements', 'margin_benchmark', 'page_help'].forEach((mode) => assert.match(orgSearchRoute, new RegExp(mode)));
  assert.match(orgSearchRoute, /MODE_ALIASES/);
});

test('Setu Guru org search routes research intent safely', () => {
  assert.match(orgSearchRoute, /buildResearchRoutingAnswer/);
  assert.match(orgSearchRoute, /isResearchRoutingMode/);
  assert.match(orgSearchRoute, /buildLiveResearchExecutionAnswer/);
  assert.match(orgSearchRoute, /asLiveResearchMode/);
});

test('Setu Guru live research returns source-backed draft guidance', () => {
  assert.match(liveResearch, /source_backed_draft/);
  assert.match(liveResearch, /requiresHumanApproval: true/);
  assert.match(liveResearch, /No CRM values were saved/);
  assert.match(liveResearch, /Human approval is required/);
  ['World Customs Organization HS Nomenclature', 'India ICEGATE customs portal', 'US Harmonized Tariff Schedule', 'EU Access2Markets', 'UK Trade Tariff', 'Trade.gov Country Commercial Guides', 'International Trade Centre Trade Map', 'World Bank Data'].forEach((source) => assert.match(liveResearch, new RegExp(source.replace(/[/.]/g, '\\$&'))));
});

test('Setu Guru live research extracts product, country, and role context', () => {
  assert.match(liveResearch, /SetuGuruResearchContext/);
  assert.match(liveResearch, /inferProduct/);
  assert.match(liveResearch, /inferCountry/);
  assert.match(liveResearch, /inferRole/);
  assert.match(liveResearch, /Detected context/);
});
