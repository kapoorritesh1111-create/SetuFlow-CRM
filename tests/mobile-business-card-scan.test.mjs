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

test('canonical leads retains mobile surface and working quick lead entry while desktop remains preserved', () => {
  const leads = readFileSync('src/app/(app)/leads/page.tsx', 'utf8');
  const mobile = readFileSync('src/features/leads/components/leads-mobile-surface.tsx', 'utf8');
  const drawer = readFileSync('src/features/leads/components/drawer/lead-drawer-implementation.tsx', 'utf8');
  assert.match(leads, /LeadsMobileSurface/);
  assert.match(leads, /LeadsWorkspace/);
  assert.match(leads, /hidden space-y-4 md:block/);
  assert.match(mobile, /RoleAwareLeadList/);
  assert.match(drawer, /extractContactScan/);
});

test('quick add lead camera scan writes OCR results into visible drawer fields', () => {
  const drawer = readFileSync('src/features/leads/components/drawer/lead-drawer-implementation.tsx', 'utf8');
  assert.match(drawer, /extractContactScan/);
  assert.match(drawer, /applyQuickScanExtraction/);
  assert.match(drawer, /prepareMobileScanFile/);
  assert.match(drawer, /hasQuickScanSignal/);
  assert.match(drawer, /tryQuickScanBrowserTextDetection/);
  assert.match(drawer, /setCompanyName\(\(current\) => draft\.companyName \|\| current\)/);
  assert.match(drawer, /setContactName\(\(current\) => draft\.contactName \|\| current\)/);
  assert.match(drawer, /setJobTitle\(\(current\) => draft\.jobTitle \|\| current\)/);
  assert.match(drawer, /setEmail\(\(current\) => draft\.email \|\| current\)/);
  assert.match(drawer, /setPhone\(\(current\) => \{/);
  assert.match(drawer, /setWebsite\(\(current\) => draft\.website \|\| current\)/);
  assert.match(drawer, /quickScanStatus\.message/);
  assert.match(drawer, /Card details added\. Please review before saving\./);
  assert.match(drawer, /scrollIntoView/);
  assert.doesNotMatch(drawer, /ql-hidden-upload/);
  assert.doesNotMatch(drawer, /Dispatch to the ContactScanTrigger/);
});

test('mobile Share vCard uses desktop-grade share system actions', () => {
  const sheet = readFileSync('src/features/mobile/components/mobile-vcard-share-sheet.tsx', 'utf8');
  const shell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');
  const nav = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');
  assert.match(sheet, /qrImageUrl/);
  assert.match(sheet, /navigator\.share/);
  assert.match(sheet, /Copy link/);
  assert.match(sheet, /Save contact/);
  assert.match(shell, /downloadVcfHref/);
  assert.match(nav, /MobileVCardShareSheet/);
  assert.match(nav, /onShareVCard/);
});


test('quick add lead uses explicit mobile contact-scan API and visible status path', () => {
  const drawer = readFileSync('src/features/leads/components/drawer/lead-drawer-implementation.tsx', 'utf8');
  const route = readFileSync('src/app/api/mobile/contact-scan/route.ts', 'utf8');
  assert.match(drawer, /fetch\([\"']\/api\/mobile\/contact-scan[\"']/);
  assert.match(drawer, /Reading card…/);
  assert.match(drawer, /Card details added\. Please review before saving/);
  assert.match(route, /extractContactSource/);
  assert.match(route, /server_image_ocr|sourceMode/);
});

test('mobile vCard uses saved card phone settings and does not duplicate lead-page signed-in card', () => {
  const appShell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');
  const layout = readFileSync('src/app/(app)/layout.tsx', 'utf8');
  const vcardRoute = readFileSync('src/app/api/contact-exchange/vcard/route.ts', 'utf8');
  const roleList = readFileSync('src/features/mobile/components/role-aware-lead-list.tsx', 'utf8');
  assert.match(layout, /getMyCardSettingsForUser/);
  assert.match(appShell, /primaryPhone: cardSettings\?\.primaryPhone/);
  assert.match(appShell, /params\.set\('phone', cardSettings\.primaryPhone\)/);
  assert.match(vcardRoute, /primaryPhone: settings\?\.primary_phone/);
  assert.doesNotMatch(roleList, /<SignedInCard signedIn=\{signedIn\}/);
});

test('canonical orders mounts entitled mobile workspace in route layout without duplicating page', () => {
  const page = readFileSync('src/app/(app)/orders/page.tsx', 'utf8');
  const layout = readFileSync('src/app/(app)/orders/layout.tsx', 'utf8');
  const mobile = readFileSync('src/features/orders/components/mobile-orders-workspace.tsx', 'utf8');
  assert.match(page, /return null/);
  assert.match(layout, /requireOrganizationModule\(workspace\.organization\.id, 'orders_compliance'\)/);
  assert.match(layout, /<MobileOrdersWorkspace/);
  assert.match(layout, /md:hidden/);
  assert.match(layout, /hidden md:block/);
  assert.match(mobile, /Order command center/);
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


test('OCR raw text fallback can still prefill business-card fields when structured OCR is sparse', () => {
  const extraction = readFileSync('src/lib/contact-exchange/contact-extraction.ts', 'utf8');
  assert.match(extraction, /rawTextParsed/);
  assert.match(extraction, /parseContactText\(providerResult\.draft\.rawText/);
  assert.match(extraction, /providerResult\.draft\.contactName \|\| rawTextParsed\?\.draft\.contactName/);
  assert.match(extraction, /providerResult\.draft\.companyName \|\| rawTextParsed\?\.draft\.companyName/);
  assert.match(extraction, /providerResult\.draft\.jobTitle \|\| rawTextParsed\?\.draft\.jobTitle/);
});
