import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/app/(app)/admin/packaging-pricing-v5/page.tsx', 'utf8');
const workspace = readFileSync('src/features/packaging/components/pricing-v5-premium-workspace.tsx', 'utf8');
const externalButton = readFileSync('src/features/packaging/components/pricing-v5-external-publish-button.tsx', 'utf8');
const frameWorkspace = readFileSync('src/features/packaging/components/pricing-v5-frame-owner-workspace.tsx', 'utf8');

test('Pricing V5 header publish reuses the in-form publish submitter', () => {
  assert.match(page, /<PricingV5ExternalPublishButton\s*\/>/);
  assert.doesNotMatch(page, /formAction=\{saveAndPublishPackagingCommercialBandsV5\}/);
  assert.match(workspace, /id="pricing-v5-waste-publish"[^>]*formAction=\{saveAndPublishPackagingCommercialBandsV5\}/);
  assert.match(externalButton, /form\.requestSubmit\(publishButton\)/);
  assert.match(externalButton, /disabled=\{isSubmitting\}/);
});


test('Frame-family Waste & Margins exposes the bulk form contract used by the header publish button', () => {
  assert.match(frameWorkspace, /id="pricing-v5-waste-form"/);
  assert.match(frameWorkspace, /id="pricing-v5-waste-publish"[^>]*formAction=\{saveAndPublishPackagingCommercialBandsV5\}/);
  assert.match(frameWorkspace, /formAction=\{savePackagingCommercialBandsV5\}/);
});
