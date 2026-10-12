import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function runRoleAssertion(script) {
  const dir = mkdtempSync(join(tmpdir(), 'setu-mobile-role-'));
  try {
    const original = readFileSync('src/features/mobile/lib/role-aware-leads.ts', 'utf8');
    const search = readFileSync('src/lib/search/platform-search.ts', 'utf8');
    writeFileSync(join(dir, 'search.mts'), search);
    writeFileSync(join(dir, 'leads.mts'), original.replace("'@/lib/search/platform-search'", "'./search.mts'"));
    const code = script.replace("'./src/features/mobile/lib/role-aware-leads.ts'", JSON.stringify('file://' + join(dir, 'leads.mts')));
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', code], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout.trim());
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('role-aware mobile lead visibility is enforced in data layer', () => {
  const counts = runRoleAssertion(`
    import { filterLeadsForRole, mobileLeadDemoData, mobileLeadDemoUsers } from './src/features/mobile/lib/role-aware-leads.ts';
    const data = Object.fromEntries(Object.entries(mobileLeadDemoUsers).map(([key, user]) => [key, filterLeadsForRole(mobileLeadDemoData, user).map((lead) => lead.id)]));
    console.log(JSON.stringify(data));
  `);
  assert.deepEqual(counts.owner.sort(), ['L-MOB-001','L-MOB-002','L-MOB-003','L-MOB-004','L-MOB-005'].sort());
  assert.deepEqual(counts.admin.sort(), counts.owner.sort());
  assert.deepEqual(counts.manager.sort(), ['L-MOB-002','L-MOB-003'].sort());
  assert.deepEqual(counts.member, ['L-MOB-002']);
});

test('mobile lead search covers company contact owner team status and next action', () => {
  const result = runRoleAssertion(`
    import { filterLeadsForRole, mobileLeadDemoData, mobileLeadDemoUsers } from './src/features/mobile/lib/role-aware-leads.ts';
    const user = mobileLeadDemoUsers.owner;
    const checks = {
      company: filterLeadsForRole(mobileLeadDemoData, user, { query: 'Aster' }).length,
      contact: filterLeadsForRole(mobileLeadDemoData, user, { query: 'Maya' }).length,
      owner: filterLeadsForRole(mobileLeadDemoData, user, { query: 'Priya' }).length,
      team: filterLeadsForRole(mobileLeadDemoData, user, { query: 'Sourcing' }).length,
      status: filterLeadsForRole(mobileLeadDemoData, user, { query: 'Quoted' }).length,
      nextAction: filterLeadsForRole(mobileLeadDemoData, user, { query: 'Confirm MOQ' }).length
    };
    console.log(JSON.stringify(checks));
  `);
  for (const [field, count] of Object.entries(result)) assert.ok(count > 0, `${field} search should match`);
});
