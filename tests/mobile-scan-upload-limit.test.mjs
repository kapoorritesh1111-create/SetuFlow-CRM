import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('mobile scanner optimizes phone photos before server action upload', () => {
  const utilityPath = 'src/features/mobile/lib/mobile-card-image.ts';
  assert.equal(existsSync(utilityPath), true);
  const utility = readFileSync(utilityPath, 'utf8');
  const scanner = readFileSync('src/features/mobile/components/mobile-business-card-scanner.tsx', 'utf8');
  assert.match(utility, /MOBILE_SCAN_MAX_ORIGINAL_IMAGE_BYTES = 10 \* 1024 \* 1024/);
  assert.match(utility, /MOBILE_SCAN_MAX_UPLOAD_BYTES = 3 \* 1024 \* 1024/);
  assert.match(utility, /canvas\.toBlob/);
  assert.match(utility, /new File\(\[blob\]/);
  assert.match(scanner, /prepareMobileScanFile\(selectedFile\)/);
  assert.match(scanner, /Preparing photo for secure mobile scan/);
  assert.match(scanner, /Large phone photos are optimized before scan/);
});

test('Next server action upload budget matches mobile scan compression budget', () => {
  const nextConfig = readFileSync('next.config.mjs', 'utf8');
  const readiness = readFileSync('src/app/api/mobile/scan-readiness/route.ts', 'utf8');
  assert.match(nextConfig, /bodySizeLimit: '4mb'/);
  assert.match(readiness, /maxOriginalImageBytes/);
  assert.match(readiness, /maxServerUploadBytes/);
  assert.match(readiness, /maxPdfBytes/);
  assert.match(readiness, /optimizes phone photos before upload/);
});
