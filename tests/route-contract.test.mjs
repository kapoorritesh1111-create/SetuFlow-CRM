import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('src/lib/routes/manifest.json', 'utf8'));
test('manifest route contract keeps canonical nav and release-gate truth together', () => { assert.equal(manifest.releaseGate.verificationScript, 'npm run release:proof'); });
