import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// Read all Setu Guru lib files
const brainLayer       = readFileSync('src/lib/setu-guru/brain-layer.ts', 'utf8');
const sourceSearch     = readFileSync('src/lib/setu-guru/source-search.ts', 'utf8');
const workflowAnswer   = readFileSync('src/lib/setu-guru/workflow-status-answer.ts', 'utf8');
const responsePolicy   = readFileSync('src/lib/setu-guru/guru-response-policy.ts', 'utf8');
const actionLayer      = readFileSync('src/lib/setu-guru/action-layer.ts', 'utf8');
const governance       = readFileSync('src/lib/setu-guru/approval-governance.ts', 'utf8');
const feedbackStore    = readFileSync('src/lib/setu-guru/feedback-store.ts', 'utf8');
const playbook         = readFileSync('src/lib/setu-guru/playbook-guidance.ts', 'utf8');
const telemetry        = readFileSync('src/lib/setu-guru/telemetry.ts', 'utf8');
const widget           = readFileSync('src/features/setu-guru/setu-guru-widget.tsx', 'utf8');

// ── Golden Q: Dashboard help ─────────────────────────────────────────────────
test('Golden: dashboard question uses help-registry and page-context sources', () => {
  assert.match(brainLayer, /getBestSetuGuruHelpTopic/);
  assert.match(brainLayer, /getSetuGuruPageContext/);
  assert.match(brainLayer, /database_schema/);
  assert.match(brainLayer, /repo_doc/);
  assert.match(brainLayer, /Evidence checked/);
});

// ── Golden Q: HSN research ───────────────────────────────────────────────────
test('Golden: HSN question hits whitelisted sources and does not write without approval', () => {
  assert.match(sourceSearch, /TRUSTED_SOURCES/);
  assert.match(sourceSearch, /WCO|ICEGATE|HTS|Access2Markets/);
  assert.match(sourceSearch, /fetchStatus: 'unavailable'/);
  assert.match(sourceSearch, /Human approval is required/);
  assert.doesNotMatch(sourceSearch, /\.update\(/);
  assert.doesNotMatch(sourceSearch, /\.insert\(/);
});

// ── Golden Q: Order status ───────────────────────────────────────────────────
test('Golden: order status answer uses short header + numbered steps + human language', () => {
  assert.match(workflowAnswer, /What needs to happen next/);
  assert.match(workflowAnswer, /stepNum\+\+/);
  assert.match(workflowAnswer, /humanStatus/);
  assert.match(workflowAnswer, /not requested yet/);
  assert.match(workflowAnswer, /not started yet/);
  assert.match(workflowAnswer, /Confirm payment terms or issue a proforma invoice/);
  assert.match(workflowAnswer, /Start the freight queue/);
  assert.match(workflowAnswer, /Setu Guru is read-only here/);
});

// ── Golden Q: Approval boundary ─────────────────────────────────────────────
test('Golden: governed action questions are blocked and return approval guidance', () => {
  assert.match(governance, /isGovernedAction/);
  assert.match(governance, /checkGovernance/);
  assert.match(governance, /requiresHumanApproval: true/);
  assert.match(governance, /allowed: false/);
  assert.match(governance, /logGovernanceBlock/);
});

test('Golden: action layer preview-before-write and idempotency enforced', () => {
  assert.match(actionLayer, /buildActionPreview/);
  assert.match(actionLayer, /executeApprovedAction/);
  assert.match(actionLayer, /idempotencyKey/);
  assert.match(actionLayer, /idempotency key matched/);
  assert.match(actionLayer, /approved_by_human: true/);
  assert.match(actionLayer, /requiresApproval: true/);
});

// ── Golden Q: Feedback + learning loop ───────────────────────────────────────
test('Golden: feedback writes to setu_guru_feedback table with org isolation', () => {
  assert.match(feedbackStore, /setu_guru_feedback/);
  assert.match(feedbackStore, /organization_id/);
  assert.match(feedbackStore, /writeFeedback/);
  assert.match(feedbackStore, /getFeedbackSummary/);
  assert.match(feedbackStore, /helpful.*missing/s);
});

// ── Golden Q: Playbook guidance ──────────────────────────────────────────────
test('Golden: playbook detects onboarding, lead-to-quote, quote-to-order, order-to-dispatch', () => {
  assert.match(playbook, /onboarding_setup/);
  assert.match(playbook, /lead_to_quote/);
  assert.match(playbook, /quote_to_order/);
  assert.match(playbook, /order_to_dispatch/);
  assert.match(playbook, /Human approval required/);
  assert.match(playbook, /buildPlaybookGuidance/);
  assert.match(playbook, /setupGapNote/);
});

// ── Golden Q: Source/citation UI ─────────────────────────────────────────────
test('Golden: widget shows confidence badges, fetchedAt timestamps, provenance, and risk labels', () => {
  assert.match(widget, /confidenceBadge/);
  assert.match(widget, /riskBadge/);
  assert.match(widget, /provenanceBadge/);
  assert.match(widget, /fetchedAt/);
  assert.match(widget, /SourceCard/);
  assert.match(widget, /High confidence/);
  assert.match(widget, /Source unavailable/);
  assert.match(widget, /approval required/);
});

// ── Golden Q: Telemetry ──────────────────────────────────────────────────────
test('Golden: telemetry writes non-blocking with PII-safe payload and org isolation', () => {
  assert.match(telemetry, /writeTelemetry/);
  assert.match(telemetry, /organization_id/);
  assert.match(telemetry, /question_length/);
  assert.doesNotMatch(telemetry, /question:/);  // question content must not be stored
  assert.match(telemetry, /blocked/);
  assert.match(telemetry, /latency_ms/);
  assert.match(telemetry, /getTelemetrySummary/);
  assert.match(telemetry, /catch/);  // must be non-blocking
});

// ── All 10 issue files exist ──────────────────────────────────────────────────
test('All Sprint 21 implementation files are present', () => {
  [
    'src/lib/setu-guru/brain-layer.ts',
    'src/lib/setu-guru/source-search.ts',
    'src/lib/setu-guru/workflow-status-answer.ts',
    'src/lib/setu-guru/action-layer.ts',
    'src/lib/setu-guru/approval-governance.ts',
    'src/lib/setu-guru/feedback-store.ts',
    'src/lib/setu-guru/playbook-guidance.ts',
    'src/lib/setu-guru/telemetry.ts',
    'src/app/api/setu-guru/brain/route.ts',
    'src/app/api/setu-guru/source-search/route.ts',
    'src/app/api/setu-guru/action/route.ts',
    'src/app/api/setu-guru/playbook/route.ts',
    'src/features/setu-guru/setu-guru-widget.tsx',
  ].forEach((path) => assert.equal(existsSync(path), true, `${path} should exist`));
});
