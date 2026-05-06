import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const widget = readFileSync('src/features/setu-guru/setu-guru-widget.tsx', 'utf8');
const route = readFileSync('src/app/api/setu-guru/research/route.ts', 'utf8');
const manifest = readFileSync('public/setu-guru/knowledge-manifest.json', 'utf8');

test('Setu Guru includes live research docs and manifest entries', () => {
  [
    'docs/setu-guru/SETU_GURU_DOCUMENTATION_GAP_AUDIT.md',
    'docs/setu-guru/SETU_GURU_LIVE_RESEARCH_PLAYBOOK.md',
    'docs/setu-guru/SETU_GURU_HS_CODE_ENRICHMENT.md',
    'docs/setu-guru/SETU_GURU_MARGIN_BENCHMARKING.md',
    'docs/setu-guru/SETU_GURU_COMPLIANCE_RESEARCH.md',
    'docs/setu-guru/SETU_GURU_PRODUCT_ENRICHMENT_WORKFLOW.md',
    'docs/setu-guru/SETU_GURU_GPT_CREATION_EXACT_INSTRUCTIONS.md',
  ].forEach((path) => assert.equal(existsSync(path), true, `${path} should exist`));
  assert.match(manifest, /SETU_GURU_LIVE_RESEARCH_PLAYBOOK/);
  assert.match(manifest, /SETU_GURU_GPT_CREATION_EXACT_INSTRUCTIONS/);
});

test('Setu Guru widget and API mention source-backed live research', () => {
  assert.match(widget, /live-industry-research/);
  assert.match(widget, /HSN codes/);
  assert.match(widget, /api\/setu-guru\/research/);
  assert.match(route, /web_search_preview/);
  assert.match(route, /SETU_GURU_ALLOW_WRITEBACK/);
  assert.match(route, /Do not claim master data has been changed/);
});
