import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('production scan readiness route exposes safe non-secret checks', () => {
  const path = 'src/app/api/mobile/scan-readiness/route.ts';
  assert.equal(existsSync(path), true);
  const route = readFileSync(path, 'utf8');
  assert.match(route, /export const runtime = 'nodejs'/);
  assert.match(route, /OPENAI_API_KEY/);
  assert.match(route, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /secure-context/);
  assert.match(route, /Response\.json/);
  assert.doesNotMatch(route, /process\.env\.OPENAI_API_KEY[^?\n]*[,}]/);
});

test('mobile OCR provider uses OPENAI_API_KEY directly for contact scan OCR', () => {
  const provider = readFileSync('src/lib/contact-exchange/contact-ocr-provider.ts', 'utf8');
  assert.match(provider, /process\.env\.OPENAI_API_KEY\?\.trim\(\)/);
  assert.match(provider, /OPENAI_CONTACT_SCAN_MODEL/);
  assert.match(provider, /OPENAI_API_KEY is not configured for contact scan OCR/);
  assert.doesNotMatch(provider, /getAiProviderName\(\)\.toLowerCase\(\) === 'openai'/);
});

test('production scan setup docs and env example document required variables', () => {
  assert.equal(existsSync('docs/MOBILE_SCAN_PRODUCTION.md'), true);
  assert.equal(existsSync('.env.production.example'), true);
  const docs = readFileSync('docs/MOBILE_SCAN_PRODUCTION.md', 'utf8');
  const env = readFileSync('.env.production.example', 'utf8');
  for (const name of ['OPENAI_API_KEY', 'OPENAI_CONTACT_SCAN_MODEL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_FEATURE_MOBILE_APP_V1']) {
    assert.match(docs, new RegExp(name));
    assert.match(env, new RegExp(`^${name}=`, 'm'));
  }
  assert.match(docs, /\/api\/mobile\/scan-readiness/);
  assert.match(docs, /\/leads\?quickLead=1/);
});

test('mobile scan readiness CLI fails clearly when required env vars are missing', () => {
  const result = spawnSync(process.execPath, ['scripts/check-mobile-scan-prod.mjs'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /OPENAI_API_KEY/);
  assert.match(result.stdout + result.stderr, /NEXT_PUBLIC_SUPABASE_URL/);
});
