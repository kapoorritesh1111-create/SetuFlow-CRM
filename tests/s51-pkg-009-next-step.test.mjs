import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('src/features/admin/components/admin-stage-drawers.module.css', 'utf8');
const stageSection = fs.readFileSync('src/features/leads/components/LeadStageSection.tsx', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260812181000_s51_pkg_009_next_step_suggestions.sql', 'utf8');

test('next-step drawer footer is kept visible', () => {
  assert.match(css, /#add-next-step-drawer aside/);
  assert.match(css, /\[id\^='next-step-'\] aside/);
  assert.match(css, /position:\s*sticky/);
});

test('in-person meeting next step shows suggested follow-up message', () => {
  assert.match(stageSection, /Suggested follow-up message/);
  assert.match(stageSection, /isInPersonMeetingStep/);
  assert.match(stageSection, /confirming our in-person meeting/);
});

test('database trigger shifts occupied sort order and seeds meeting suggestion', () => {
  assert.match(migration, /sort_order = sort_order \+ 100000/);
  assert.match(migration, /suggested_message/);
  assert.match(migration, /before insert or update/);
});
