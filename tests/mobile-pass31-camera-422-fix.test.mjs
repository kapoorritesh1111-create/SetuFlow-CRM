import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');

test('PASS31 camera photos are always transcoded to JPEG before server upload', () => {
  const imagePrep = read('src/features/mobile/lib/mobile-card-image.ts');
  assert.match(imagePrep, /file\.type !== 'image\/jpeg'/);
  assert.match(imagePrep, /new File\(\[blob\], `\$\{optimizedName\}-mobile-scan\.jpg`, \{ type: 'image\/jpeg'/);
  assert.match(imagePrep, /Photo converted to JPEG for card scan/);
});

test('PASS31 OpenAI Vision has a chat vision fallback and high detail image reading', () => {
  const provider = read('src/lib/contact-exchange/contact-ocr-provider.ts');
  assert.match(provider, /callOpenAiChatVisionApi/);
  assert.match(provider, /chat-vision-fallback/);
  assert.match(provider, /detail: 'high'/);
  assert.match(provider, /OpenAI image reading failed\. Responses:/);
});

test('PASS31 scan progress is visible in the sticky lead footer', () => {
  const footer = read('src/features/leads/components/LeadDrawerFooter.tsx');
  const drawer = read('src/features/leads/components/lead-drawer.tsx');
  assert.match(footer, /quickScanStatus\?:/);
  assert.match(footer, /Reading card/);
  assert.match(drawer, /quickScanStatus=\{\s*isQuickMode && !isEditingExistingLead\s*\?\s*quickScanStatus\s*:\s*undefined\s*\}/s);
});
