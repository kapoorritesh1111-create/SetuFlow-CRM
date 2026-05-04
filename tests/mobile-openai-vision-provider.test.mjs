import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');

test('mobile OpenAI Vision baseline supports OpenAI Vision direct photo provider', () => {
  const provider = read('src/lib/contact-exchange/contact-ocr-provider.ts');
  assert.match(provider, /openai-vision/);
  assert.match(provider, /provider === 'openai-vision' && isImage/);
  assert.match(provider, /extractWithOpenAiVision\(args, buffer, 'openai-vision'\)/);
  assert.match(provider, /vision-direct/);
  assert.match(provider, /Never use the uploaded filename/);
});

test('mobile OpenAI Vision baseline readiness reports openai-vision active provider separately', () => {
  const readiness = read('src/app/api/mobile/scan-readiness/route.ts');
  assert.match(readiness, /wantsOpenAiVision/);
  assert.match(readiness, /openai-vision-reader/);
  assert.match(readiness, /Direct image card reader model/);
  assert.match(readiness, /activeProvider.*openai-vision/s);
});

test('mobile OpenAI Vision baseline production docs and env example instruct investor demo provider', () => {
  const env = read('.env.production.example');
  const docs = read('MOBILE_SCAN_PRODUCTION.md');
  const script = read('scripts/check-mobile-scan-prod.mjs');
  assert.match(env, /CONTACT_SCAN_PROVIDER=openai-vision/);
  assert.match(docs, /CONTACT_SCAN_PROVIDER=openai-vision/);
  assert.match(docs, /activeProvider.*openai-vision/s);
  assert.match(script, /usingOpenAiVision/);
});
