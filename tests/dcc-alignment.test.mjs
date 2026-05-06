import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const removedReferencePaths = [
  'public/internal-dcc',
  'public/reference-html',
  'public/setuflow-architecture.html'
];

test('reference HTML handoff artifacts are paused and removed from active package', () => {
  for (const path of removedReferencePaths) {
    assert.equal(existsSync(path), false, `${path} should not be present in the active package`);
  }

  const publicHtml = readdirSync('public', { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => entry.toLowerCase().endsWith('.html'));

  assert.deepEqual(publicHtml, [], 'public/ should not ship static reference HTML files');
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
