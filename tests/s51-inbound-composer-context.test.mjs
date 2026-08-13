import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const composer = read('src/features/integrations/interakt/components/sales-message-composer.tsx');
const actions = read('src/features/integrations/interakt/sales-message-actions.ts');

test('S51-LEADS-013 clears row-scoped draft state when the selected inquiry changes', () => {
  assert.match(composer, /const \[draftRowId, setDraftRowId\] = useState\(rowId\)/);
  assert.match(composer, /const contextChanged = draftRowId !== rowId/);
  assert.match(composer, /if \(draftRowId === rowId\) return;/);
  assert.match(composer, /setDraftRowId\(rowId\)/);
  assert.match(composer, /setMessage\(initial\)/);
  assert.match(composer, /setSelectedId\(defaultSelectedId\)/);
  assert.match(composer, /setBrochureId\(''\)/);
  assert.match(composer, /setNotice\(null\)/);
  assert.match(composer, /Preparing reply for/);
});

test('S51-LEADS-013 never submits a free-text or template send under a stale customer context', () => {
  const hiddenContextFields = composer.match(/name="draftRowId" value=\{draftRowId\}/g) ?? [];
  assert.ok(hiddenContextFields.length >= 2, 'both send forms must carry their draft context id');
  assert.match(composer, /disabled=\{!canSend \|\| !message\.trim\(\) \|\| isSending \|\| contextChanged\}/);
  assert.match(composer, /disabled=\{!canSend \|\| isFollowingUp \|\| contextChanged\}/);
  assert.match(actions, /function assertDraftContext\(formData: FormData, rowId: string\)/);
  assert.match(actions, /draftRowId !== rowId/);
  assert.match(actions, /Customer changed\. The reply has been refreshed for the selected inquiry/);

  const guards = actions.match(/assertDraftContext\(formData, rowId\)/g) ?? [];
  assert.ok(guards.length >= 2, 'free-text and approved follow-up sends must both enforce the context guard');
});
