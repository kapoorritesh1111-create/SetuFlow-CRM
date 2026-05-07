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
