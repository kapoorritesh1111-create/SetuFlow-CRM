import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const file = fs.readFileSync('src/app/(app)/leads/inbound/interakt-live-audit/page.tsx', 'utf8');
test('Stark Interakt live audit requires owner or admin and reads only', () => {
 assert.match(file, /requireWorkspace\(\)/);
 assert.match(file, /\['owner', 'admin'\]/);
 assert.match(file, /fetchInteraktContacts/);
 assert.match(file, /\.gte\('created_at', since\)/);
 assert.match(file, /\.range\(offset, offset \+ 999\)/);
 assert.doesNotMatch(file, /\.update\(|\.insert\(|\.upsert\(|\.delete\(|sendInterakt/);
});
