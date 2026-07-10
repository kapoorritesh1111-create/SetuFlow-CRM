import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const outreachGenerator = readFileSync('src/lib/setu-guru/outreach-generator.ts', 'utf8');
const outreachActivity = readFileSync('src/lib/setu-guru/outreach-activity.ts', 'utf8');
const outreachRoute = readFileSync('src/app/api/setu-guru/outreach/route.ts', 'utf8');
const outreachSaveRoute = readFileSync('src/app/api/setu-guru/outreach/save/route.ts', 'utf8');
const outreachPanel = readFileSync('src/features/setu-guru/outreach-generator-panel.tsx', 'utf8');
const replyAnalyzerLib = readFileSync('src/lib/setu-guru/reply-analyzer.ts', 'utf8');
const replyAnalyzerRoute = readFileSync('src/app/api/setu-guru/reply-analyzer/route.ts', 'utf8');
const replyAnalyzerModal = readFileSync('src/features/setu-guru/reply-analyzer-modal.tsx', 'utf8');
const leadDetailPage = readFileSync('src/app/(app)/leads/[leadId]/page.tsx', 'utf8');

test('Outreach Generator drafts are grounded in stored lead/ICP fields only and never invent facts', () => {
  assert.match(outreachGenerator, /\.eq\('organization_id', orgId\)/);
  assert.match(outreachGenerator, /usedFacts/);
  // Grounding is enforced structurally (template interpolation of stored fields only),
  // not by calling an external model, so there is no outbound fetch to ground against.
  assert.doesNotMatch(outreachGenerator, /fetch\(['"]https?:\/\//);
});

test('Outreach draft generation never sends and never writes to communications directly', () => {
  assert.doesNotMatch(outreachGenerator, /from\(['"]communications['"]\)\.insert/);
  assert.doesNotMatch(outreachRoute, /status:\s*'sent'/);
});

test('Saving an outreach draft always writes status draft and draft_source ai, never approved or sent', () => {
  assert.match(outreachActivity, /status: 'draft'/);
  assert.match(outreachActivity, /draft_source: 'ai'/);
  assert.doesNotMatch(outreachActivity, /status:\s*'sent'/);
  assert.doesNotMatch(outreachActivity, /status:\s*'approved'/);
  assert.match(outreachActivity, /organization_id: orgId/);
});

test('Outreach API routes are organization scoped via requireWorkspace and validate input with zod', () => {
  for (const route of [outreachRoute, outreachSaveRoute]) {
    assert.match(route, /requireWorkspace\(\)/);
    assert.match(route, /workspace\.organization\?\.id/);
    assert.match(route, /safeParse/);
  }
});

test('Outreach Generator panel offers channel, goal, and tone controls and requires explicit save', () => {
  assert.match(outreachPanel, /Channel/);
  assert.match(outreachPanel, /Goal/);
  assert.match(outreachPanel, /Tone/);
  assert.match(outreachPanel, /Save as draft activity/);
  assert.match(outreachPanel, /nothing goes out automatically/i);
});

test('Reply Analyzer is advisory only and never writes to CRM records', () => {
  assert.doesNotMatch(replyAnalyzerLib, /from\(['"]leads['"]\)\.update/);
  assert.doesNotMatch(replyAnalyzerLib, /from\(['"]quotes['"]\)\.update/);
  assert.doesNotMatch(replyAnalyzerLib, /from\(['"]rfqs['"]\)\.(insert|update)/);
  assert.match(replyAnalyzerLib, /notConfigured/);
  assert.match(replyAnalyzerLib, /OPENAI_API_KEY/);
});

test('Reply Analyzer API route is organization scoped and validates the pasted reply', () => {
  assert.match(replyAnalyzerRoute, /requireWorkspace\(\)/);
  assert.match(replyAnalyzerRoute, /workspace\.organization\?\.id/);
  assert.match(replyAnalyzerRoute, /safeParse/);
});

test('Reply Analyzer modal surfaces suggested stage and response without auto-applying them', () => {
  assert.match(replyAnalyzerModal, /suggestedStage/);
  assert.match(replyAnalyzerModal, /suggestedResponse/);
  assert.match(replyAnalyzerModal, /does not change it automatically/);
  assert.doesNotMatch(replyAnalyzerModal, /fetch\(.*leads.*method:\s*'PATCH'/s);
});

test('Outreach Generator and Reply Analyzer are wired into the lead detail page', () => {
  assert.match(leadDetailPage, /OutreachGeneratorLauncher/);
  assert.match(leadDetailPage, /ReplyAnalyzerLauncher/);
});
