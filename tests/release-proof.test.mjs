import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
test('release scripts enforce clean proof before build', () => { assert.match(pkg.scripts.verify, /clean:verification/); });
