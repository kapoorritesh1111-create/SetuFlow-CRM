import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function runModeAssertion(script) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim());
}

test('S41 supplier and buyer modes derive exact lead journeys', () => {
  const result = runModeAssertion(`
    import { parseWorkspaceMode, workspaceModeToLeadJourney } from './src/features/workspace/mode.ts';
    console.log(JSON.stringify({
      supplierPlural: workspaceModeToLeadJourney(parseWorkspaceMode('suppliers')),
      supplierSingular: workspaceModeToLeadJourney(parseWorkspaceMode('supplier')),
      supplierTrimmed: workspaceModeToLeadJourney(parseWorkspaceMode(' Suppliers ')),
      buyerPlural: workspaceModeToLeadJourney(parseWorkspaceMode('buyers')),
      buyerSingular: workspaceModeToLeadJourney(parseWorkspaceMode('buyer')),
      all: workspaceModeToLeadJourney(parseWorkspaceMode(undefined)),
    }));
  `);

  assert.deepEqual(result, {
    supplierPlural: 'supplier',
    supplierSingular: 'supplier',
    supplierTrimmed: 'supplier',
    buyerPlural: 'buyer',
    buyerSingular: 'buyer',
    all: '',
  });
});

test('S41 supplier mode does not accept buyer lead type', () => {
  const result = runModeAssertion(`
    import { parseWorkspaceMode, leadTypeMatchesMode } from './src/features/workspace/mode.ts';
    console.log(JSON.stringify({
      supplierAllowsSupplier: leadTypeMatchesMode('supplier', parseWorkspaceMode('suppliers')),
      supplierRejectsBuyer: leadTypeMatchesMode('buyer', parseWorkspaceMode('suppliers')),
      buyerAllowsBuyer: leadTypeMatchesMode('buyer', parseWorkspaceMode('buyers')),
      buyerRejectsSupplier: leadTypeMatchesMode('supplier', parseWorkspaceMode('buyers')),
      allAllowsBuyer: leadTypeMatchesMode('buyer', parseWorkspaceMode('all')),
      allAllowsSupplier: leadTypeMatchesMode('supplier', parseWorkspaceMode('all')),
    }));
  `);

  assert.deepEqual(result, {
    supplierAllowsSupplier: true,
    supplierRejectsBuyer: false,
    buyerAllowsBuyer: true,
    buyerRejectsSupplier: false,
    allAllowsBuyer: true,
    allAllowsSupplier: true,
  });
});
