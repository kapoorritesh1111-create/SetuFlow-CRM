import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const shell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');
const widget = readFileSync('src/features/setu-guru/setu-guru-widget.tsx', 'utf8');

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
  ].forEach((path) => assert.equal(existsSync(path), true, `${path} should exist`));
});
