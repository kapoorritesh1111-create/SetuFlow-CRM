import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editor = readFileSync('src/features/setu-guru/external-discovery-campaign-editor.tsx', 'utf8');
const workspace = readFileSync('src/features/setu-guru/external-discovery-workspace-guided.tsx', 'utf8');
const route = readFileSync('src/app/api/setu-guru/external-discovery/campaigns/route.ts', 'utf8');
const updateService = readFileSync('src/lib/setu-guru/external-discovery-campaign-update.ts', 'utf8');
const surfaces = readFileSync('src/components/ui/workspace-surfaces.ts', 'utf8');

test('PR65 campaign cards expose a real editor for legacy and confirmed campaigns', () => {
  assert.match(workspace, /ExternalDiscoveryCampaignEditor/);
  assert.match(workspace, /onClick=\{onEdit\}/);
  assert.match(workspace, /Edit and confirm scope/);
  assert.match(workspace, /Edit scope/);
  assert.match(workspace, /editingCampaignId/);
});

test('PR65 editor prefills the campaign and shows saved, campaign, and resolved markets', () => {
  for (const marker of ['Campaign name', 'Research direction', 'Target market or country', 'Product or service', 'Target company types', 'Saved ICP market', 'Campaign market', 'Resolved market']) {
    assert.match(editor, new RegExp(marker));
  }
  assert.match(editor, /campaign\.search_config/);
  assert.match(editor, /campaign\.icp_snapshot/);
  assert.match(editor, /method: 'PATCH'/);
});

test('PR65 campaign editing reconfirms scope without starting research or changing the ICP', () => {
  assert.match(route, /export async function PATCH/);
  assert.match(route, /updateGuidedDiscoveryCampaign/);
  assert.match(route, /researchStarted: false/);
  assert.match(updateService, /scope_status: 'ready'/);
  assert.match(updateService, /research_started: false/);
  assert.match(updateService, /saved_icp_changed: false/);
  assert.doesNotMatch(updateService, /external-discovery\/jobs|runConfirmedDiscoveryJob|from\('org_icp_profiles'\)\.update/);
});

test('PR65 campaign updates stay organization scoped and cannot edit a running campaign', () => {
  assert.match(updateService, /\.eq\('org_id', orgId\)/);
  assert.match(updateService, /\.eq\('id', campaignId\)/);
  assert.match(updateService, /scope_status === 'researching'/);
  assert.match(updateService, /Wait for the current research run to finish/);
});

test('PR65 featured KPI background wins over the shared pale metric surface', () => {
  assert.match(surfaces, /\[&\.bg-brand-900\]:!bg-brand-900/);
  assert.match(surfaces, /white featured text on the pale surface/);
});
