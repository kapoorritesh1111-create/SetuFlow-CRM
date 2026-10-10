import fs from 'node:fs';
import assert from 'node:assert/strict';

// Both logs come from a full npm test invocation. Never silently treat a
// missing/empty/aborted run as successful.
const [baselinePath, candidatePath] = process.argv.slice(2);
assert.ok(baselinePath && candidatePath, 'Supply baseline and candidate TAP log paths.');
function inspect(path) {
  const log = fs.readFileSync(path, 'utf8');
  assert.match(log, /# tests\s+\d+/, `Test run incomplete: ${path}`);
  const failures = [...log.matchAll(/(?:^|\n).*?not ok \d+ - (.+?)(?:\r?\n|$)/g)].map(m => m[1].trim());
  const failCount = Number(log.match(/# fail\s+(\d+)/)?.[1] ?? -1);
  assert.equal(failures.length, failCount, `Unexpected test summary in ${path}`);
  return { failures, count: Number(log.match(/# tests\s+(\d+)/)?.[1] ?? 0) };
}
const baseline = inspect(baselinePath);
const candidate = inspect(candidatePath);
const previous = new Set(baseline.failures);
const newFailures = candidate.failures.filter(name => !previous.has(name));
console.log(`Base main: ${baseline.count} tests, ${baseline.failures.length} failures`);
console.log(`Candidate: ${candidate.count} tests, ${candidate.failures.length} failures`);
console.log('Existing unresolved baseline failures:', baseline.failures.join(' | ') || 'none');
if (newFailures.length) {
  console.error('New failures introduced by branch:', newFailures.join(' | '));
  process.exitCode = 1;
} else {
  console.log('No new test regressions relative to main. Legacy failures remain visible.');
}
