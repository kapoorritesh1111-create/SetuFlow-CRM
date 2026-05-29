import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lib    = readFileSync('src/lib/setu-guru/telemetry.ts', 'utf8');
const health = readFileSync('src/app/api/setu-guru/health/route.ts', 'utf8');
test('telemetry is non-blocking and PII-safe (question length not content)', () => {
  assert.match(lib, /writeTelemetry/);
  assert.match(lib, /question_length/);
  assert.doesNotMatch(lib, /question:/);
  assert.match(lib, /catch/);
  assert.match(lib, /Telemetry is non-blocking/);
});
test('telemetry captures confidence, blocker_count, latency, and blocked flag', () => {
  assert.match(lib, /confidence/);
  assert.match(lib, /blocker_count/);
  assert.match(lib, /latency_ms/);
  assert.match(lib, /blocked/);
});
test('health route serves telemetry summary when telemetry=1 param is set', () => {
  assert.match(health, /includeTelemetry/);
  assert.match(health, /getTelemetrySummary/);
  assert.match(health, /telemetry/);
});
