import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const removedReferencePaths = [
  'public/internal-dcc',
  'public/reference-html',
  'public/setuflow-architecture.html'
];

// Static HTML pages the product intentionally ships (docs hub, roadmap, demo
// checklist, marketing pages, trade-show trial funnel, etc.) — these are live
// served pages, not legacy handoff artifacts. This list existing and being
// checked means: adding a new top-level HTML page is a deliberate action that
// updates this test, not something that can silently accumulate unnoticed.
// This replaced a blanket "zero HTML files in public/" assertion that had
// gone stale (it was failing against 16 legitimate, currently-served pages —
// none of them the specific handoff artifacts this test is actually guarding
// against) and was undermining trust in the whole `npm run verify` gate.
const knownStaticHtmlPages = [
  'internal/catalog-price-list-qa.html',
  'internal/catalog-workflow-repair-map.html',
  'internal/design-system/style-guide.html',
  'internal/lead-capture-intro-behavior.html',
  'internal/products-price-list-workflow.html',
  'internal/setuflow-demo-checklist.html',
  'internal/setuflow-docs.html',
  'internal/setuflow-roadmap.html',
  'internal/trade-show-trial-preview-policy.html',
  'marketing/setuflow-bg-video.html',
  'marketing/setuflow-showcase.html',
  'prototypes/trade-show-mobile-preview.html',
  'prototypes/trade-show-trial.html',
  'setuflow-client-docs.html',
  'setuflow-trade-show-trial.html',
  'vendor/investor_demo_v5.html'
];

test('reference HTML handoff artifacts are paused and removed from active package', () => {
  for (const path of removedReferencePaths) {
    assert.equal(existsSync(path), false, `${path} should not be present in the active package`);
  }

  const publicHtml = readdirSync('public', { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => entry.toLowerCase().endsWith('.html'))
    .sort();

  const unexpected = publicHtml.filter((entry) => !knownStaticHtmlPages.includes(entry));
  assert.deepEqual(
    unexpected,
    [],
    'New HTML file(s) appeared under public/ that are not in the known-pages allowlist in this test. ' +
    'If this is an intentional new static page, add it to knownStaticHtmlPages above. If it is a ' +
    'forgotten reference/handoff artifact, remove it instead.'
  );
});

test('active docs record cleanup status without depending on deleted HTML handoff pages', () => {
  const docs = [
    readFileSync('README.md', 'utf8'),
    readFileSync('docs/DOCUMENT_INDEX.md', 'utf8'),
    readFileSync('docs/CURRENT_RELEASE_STATUS.md', 'utf8'),
    readFileSync('docs/RELEASE_READINESS.md', 'utf8')
  ].join('\n');

  assert.match(docs, /Reference HTML|reference HTML|static reference HTML/);
  assert.match(docs, /paused|removed/i);
  assert.doesNotMatch(docs, new RegExp('public/internal-dcc[^\n]*(current|active|ready)', 'i'));
  assert.doesNotMatch(docs, new RegExp('public/reference-html[^\n]*(current|active|ready)', 'i'));
  assert.doesNotMatch(docs, new RegExp('setuflow-architecture\.html[^\n]*(current|active|ready)', 'i'));
});
