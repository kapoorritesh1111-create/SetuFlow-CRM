import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile lead cards use real navigation actions for Open and Quote', () => {
  const card = readFileSync('src/features/mobile/components/lead-status-card.tsx', 'utf8');
  assert.match(card, /import Link from 'next\/link'/);
  assert.match(card, /href=\{`\/leads\/\$\{encodeURIComponent\(lead\.id\)\}`\}/);
  assert.match(card, /href=\{`\/leads\/\$\{encodeURIComponent\(lead\.id\)\}\/quote\?handoff=mobile-lead-card`\}/);
  assert.match(card, /aria-label=\{`Open \$\{lead\.company\}`\}/);
  assert.match(card, /aria-label=\{`Quote \$\{lead\.company\}`\}/);
  assert.doesNotMatch(card, /<button className="min-h-11 flex-1/);
});

test('Quick Add Lead footer is not hidden behind mobile bottom tabs and does not show disabled previous on first step', () => {
  const rightDrawer = readFileSync('src/components/RightDrawer.tsx', 'utf8');
  const footer = readFileSync('src/features/leads/components/LeadDrawerFooter.tsx', 'utf8');
  const drawer = readFileSync('src/features/leads/components/lead-drawer.tsx', 'utf8');

  assert.match(rightDrawer, /z-\[120\]/);
  assert.match(footer, /wizard && wizard\.canGoBack \?/);
  assert.doesNotMatch(footer, /disabled=\{!wizard\.canGoBack \|\| isPending\}/);
  assert.match(drawer, /wizard=\{isQuickMode && !isEditingExistingLead \? undefined : \{/);
  assert.match(footer, /isQuickMode \? '✓ Save lead'/);
});
