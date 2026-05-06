import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(path, 'utf8');
}

test('mobile contact OCR provider supports Google Vision primary with OpenAI mapper fallback', () => {
  const provider = read('src/lib/contact-exchange/contact-ocr-provider.ts');
  assert.match(provider, /CONTACT_SCAN_PROVIDER/);
  assert.match(provider, /google-vision/);
  assert.match(provider, /GOOGLE_CLOUD_VISION_API_KEY/);
  assert.match(provider, /images:annotate\?key=/);
  assert.match(provider, /TEXT_DETECTION/);
  assert.match(provider, /callOpenAiTextMapper/);
  assert.match(provider, /google-vision\+openai/);
});

test('mobile scan readiness exposes requested and active scanner provider state', () => {
  const readiness = read('src/app/api/mobile/scan-readiness/route.ts');
  assert.match(readiness, /getConfiguredContactOcrProviderState/);
  assert.match(readiness, /requestedProvider/);
  assert.match(readiness, /activeProvider/);
  assert.match(readiness, /google-vision-ocr/);
  assert.match(readiness, /CONTACT_SCAN_PROVIDER/);
});

test('production env and docs include exact Google Vision variables', () => {
  const env = read('.env.production.example');
  const docs = read('docs/MOBILE_SCAN_PRODUCTION.md');
  for (const token of ['CONTACT_SCAN_PROVIDER=google-vision', 'CONTACT_SCAN_FALLBACK_PROVIDER=openai', 'GOOGLE_CLOUD_VISION_API_KEY']) {
    assert.match(env, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(docs, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(docs, /activeProvider.*google-vision\+openai/s);
});

test('parser protects business card logo names rendered as spaced capital letters', () => {
  const parser = read('src/lib/contact-exchange/contact-parser.ts');
  assert.match(parser, /normalizeOcrLine/);
  assert.match(parser, /spaced letters/);
  assert.match(parser, /replace\(\/\\s\+\/g, ''\)/);
});
