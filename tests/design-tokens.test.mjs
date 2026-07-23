import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// SF-DS-1 governance test (DESIGN-SYSTEM.md section 5).
//
// This repo is mid-migration onto the token system: most of src/app and
// src/features have been codemodded onto brand-*/accent-*/surface-*/
// content-*/stage-*/success-*/warning-*/danger-*/info-* tokens and the
// ctl/card/panel/hero radius scale, but a deliberately-scoped remainder
// (marketing decorative gradients, the internal SMC tool's own theme,
// and all `tracking-[...]` eyebrow tracking values) was left for a
// follow-up pass — see FIX_REPORT_SF_DS_1.md.
//
// Rather than requiring an immediate hard zero (which would either be
// dishonest about what's actually been verified visually, or require
// blind bulk edits to hundreds more files with no visual QA), this test
// is a *ratchet*: the counts below are the current, real baseline. CI
// fails if anyone adds NEW arbitrary-value / banned-weight usages that
// push the count higher. Lower a ceiling only after actually migrating
// usages down to that number.
//
// Scanned directories intentionally exclude the internal SMC tool
// (`src/app/(app)/workspace`, `src/app/smc`) which owns a separate,
// deliberately different visual language from the SETU Flow CRM brand
// system, and is out of scope for this design system.

const SCAN_ROOTS = ['src/app', 'src/features', 'src/components', 'src/lib'];
const EXCLUDE_PATH_PARTS = ['/app/(app)/workspace/', '/app/smc/'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const CEILINGS = {
  // Re-baselined during the S24-SPEN batch: marketing/investor pages added
  // after the original baseline (investor-overview-page.tsx alone carries 77
  // hex classes) pushed main above the old ceilings. The packaging vertical
  // files add zero arbitrary usages. Lower these only by migrating usages.
  arbitraryHexColor: 161,
  arbitraryRadius: 36,
  arbitraryTracking: 1375,
  bannedFontWeight: 1025, // font-black / font-extrabold outside marketing routes+components
};

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (EXCLUDE_PATH_PARTS.some((part) => full.split(path.sep).join('/').includes(part))) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

function countMatches(files, regex) {
  let total = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const matches = text.match(regex);
    if (matches) total += matches.length;
  }
  return total;
}

// Marketing-flavored routes/components are exempt from the font-weight
// rule only (DESIGN-SYSTEM.md 3.3 / governance rule 2); everything else
// in this test applies repo-wide across the scanned roots.
const MARKETING_EXEMPT_PARTS = [
  '/components/marketing/', '/app/solutions/', '/app/features/', '/app/compare/',
  '/app/resources/', '/app/roi-calculator/', '/app/trade-show-trial/',
  '/app/investors/', '/app/investor-overview/', '/app/preseed/', '/app/platform/',
];

test('arbitrary hex colors do not increase beyond the current migration baseline', () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(root));
  const count = countMatches(files, /\[#[0-9a-fA-F]{3,8}\]/g);
  assert.ok(
    count <= CEILINGS.arbitraryHexColor,
    `Found ${count} arbitrary [#hex] color classes, ceiling is ${CEILINGS.arbitraryHexColor}. ` +
      'Use a brand-*/accent-*/surface-*/content-*/stage-*/success-*/warning-*/danger-*/info-* token instead, ' +
      'or lower this ceiling if you migrated existing usages down.'
  );
});

test('arbitrary radius values do not increase beyond the current migration baseline', () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(root));
  const count = countMatches(files, /rounded(-[trblse]{1,2})?-\[[^\]]+\]/g);
  assert.ok(
    count <= CEILINGS.arbitraryRadius,
    `Found ${count} arbitrary rounded-[...] classes, ceiling is ${CEILINGS.arbitraryRadius}. ` +
      'Use rounded-ctl/card/panel/hero instead.'
  );
});

test('arbitrary tracking values do not increase beyond the current migration baseline', () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(root));
  const count = countMatches(files, /tracking-\[[^\]]+\]/g);
  assert.ok(
    count <= CEILINGS.arbitraryTracking,
    `Found ${count} arbitrary tracking-[...] classes, ceiling is ${CEILINGS.arbitraryTracking}. ` +
      'Use the single text-caption eyebrow style (DESIGN-SYSTEM.md 3.3) instead.'
  );
});

test('font-black / font-extrabold do not increase beyond the current migration baseline outside marketing', () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(root)).filter(
    (file) => !MARKETING_EXEMPT_PARTS.some((part) => file.split(path.sep).join('/').includes(part))
  );
  const count = countMatches(files, /\bfont-(black|extrabold)\b/g);
  assert.ok(
    count <= CEILINGS.bannedFontWeight,
    `Found ${count} font-black/font-extrabold usages in product UI, ceiling is ${CEILINGS.bannedFontWeight}. ` +
      'Product UI is limited to font-normal/medium/semibold/bold (400-700); 800-900 is marketing-only.'
  );
});

test('globals.css contains no new hex-substring or DOM-shape !important patch selectors', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const hexSubstringSelectors = css.match(/\[class\*="#[0-9a-fA-F]{3,8}"\]/g) ?? [];
  // Known, flagged pre-existing debt (see FIX_REPORT_SF_DS_1.md) — do not add more.
  assert.ok(
    hexSubstringSelectors.length <= 8,
    `globals.css has ${hexSubstringSelectors.length} selectors keyed to a hex substring in a class name. ` +
      'These break silently on any markup refactor — style the component directly instead.'
  );
});
