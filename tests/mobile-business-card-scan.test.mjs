import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('mobile capture has a real business card scan flow wired to extraction and save actions', () => {
  const scannerPath = 'src/features/mobile/components/mobile-business-card-scanner.tsx';
  assert.equal(existsSync(scannerPath), true);
  const scanner = readFileSync(scannerPath, 'utf8');
  assert.match(scanner, /data-mobile-card-scan-input/);
  assert.match(scanner, /capture="environment"/);
  assert.match(scanner, /extractContactScan/);
  assert.match(scanner, /createLeadFromContactScanReview/);
  assert.match(scanner, /source_mode', uploadFile \? 'camera' : 'manual'/);
  assert.match(scanner, /data-mobile-scan-field="contactName"/);
  assert.match(scanner, /data-mobile-scan-field="companyName"/);
  assert.match(scanner, /data-mobile-scan-field="email"/);
});

test('canonical leads quick capture renders scanner on mobile while desktop workspace remains preserved', () => {
  const leads = readFileSync('src/app/(app)/leads/page.tsx', 'utf8');
  assert.match(leads, /MobileBusinessCardScanner/);
  assert.match(leads, /quickLeadEnabled \? \(/);
  assert.match(leads, /RoleAwareLeadList/);
  assert.match(leads, /LeadsWorkspace/);
  assert.match(leads, /hidden space-y-4 md:block/);
});

test('mobile Share vCard uses desktop-grade share system actions', () => {
  const sheet = readFileSync('src/features/mobile/components/mobile-vcard-share-sheet.tsx', 'utf8');
  const shell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');
  const nav = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');
  assert.match(sheet, /QRCode\.toDataURL/);
  assert.match(sheet, /navigator\.share/);
  assert.match(sheet, /Copy intro/);
  assert.match(sheet, /Download \.vcf/);
  assert.match(shell, /downloadVcfHref/);
  assert.match(nav, /MobileVCardShareSheet/);
  assert.match(nav, /onShareVCard/);
});

test('contact parser extracts a realistic business card text block for mobile scan prefill', () => {
  const script = `
    import { parseContactText } from './src/lib/contact-exchange/contact-parser.ts';
    const result = parseContactText('Maya Khan\\nProcurement Manager\\nAster Retail LLC\\nmaya@asterretail.com\\n+971 55 123 4567\\nwww.asterretail.com', { filename: 'business-card.jpg', sourceMode: 'camera', fileType: 'image/jpeg' });
    console.log(JSON.stringify(result.draft));
  `;
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const draft = JSON.parse(result.stdout.trim());
  assert.equal(draft.contactName, 'Maya Khan');
  assert.equal(draft.companyName, 'Aster Retail LLC');
  assert.equal(draft.jobTitle, 'Procurement Manager');
  assert.equal(draft.email, 'maya@asterretail.com');
  assert.equal(draft.phone, '+971 55 123 4567');
  assert.equal(draft.website, 'https://asterretail.com');
});
