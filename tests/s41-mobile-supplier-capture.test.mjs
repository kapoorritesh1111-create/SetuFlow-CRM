import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('S41 supplier mobile scan carries explicit workspace mode with lead type', () => {
  const scanner = read('src/features/mobile/components/mobile-business-card-scanner.tsx');
  assert.match(scanner, /workspaceModeForLeadType/);
  assert.match(scanner, /formData\.set\('lead_type', leadType\)/);
  assert.match(scanner, /formData\.set\('workspace_mode', workspaceMode\)/);
  assert.match(scanner, /formData\.set\('mode', workspaceMode\)/);
});

test('S41 supplier contact scan review does not silently default missing lead type to buyer', () => {
  const actions = read('src/features/leads/server/contact-scan-actions.ts');
  assert.match(actions, /function parseReviewedLeadType/);
  assert.match(actions, /if \(!leadType\) return \{ error: 'Choose Buyer or Supplier before creating a reviewed contact scan lead\.' \}/);
  assert.doesNotMatch(actions, /formData\.get\('lead_type'\).*\? 'supplier' : 'buyer'/);
  assert.match(actions, /leadFormData\.set\('workspace_mode', leadType === 'supplier' \? 'suppliers' : 'buyers'\)/);
});

test('S41 trade-show offline supplier capture preserves mode through queue and sync', () => {
  const capture = read('src/features/trade-events/components/trade-show-capture.tsx');
  const sync = read('src/lib/offline/sync.ts');
  assert.match(capture, /formData\.set\('workspace_mode', expectedMode\)/);
  assert.match(capture, /formData\.set\('mode', expectedMode\)/);
  assert.match(sync, /normalizeOfflineLeadType/);
  assert.match(sync, /formData\.set\('workspace_mode', leadType === 'supplier' \? 'suppliers' : 'buyers'\)/);
  assert.doesNotMatch(sync, /lead\.lead_type \|\| 'buyer'/);
});

test('S41 contact intake review derives supplier default from mode query and sends workspace mode', () => {
  const review = read('src/components/contact-exchange/contact-intake-review.tsx');
  assert.match(review, /useSearchParams/);
  assert.match(review, /workspaceModeToLeadJourney\(parseWorkspaceMode\(searchParams\.get\('mode'\)\)\)/);
  assert.match(review, /const \[leadType, setLeadType\] = useState<'buyer' \| 'supplier'>\(initialLeadType\)/);
  assert.match(review, /formData\.set\('workspace_mode', workspaceMode\)/);
});
