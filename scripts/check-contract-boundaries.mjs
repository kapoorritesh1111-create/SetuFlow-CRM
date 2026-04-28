import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src'];
const failures = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next'].includes(entry)) walk(full);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry) && !entry.endsWith('.orig')) yieldFile(full);
  }
}

function yieldFile(file) {
  const text = readFileSync(file, 'utf8');
  const checks = [
    {
      pattern: /QuotePricingBasis[^\n]+from ['"]@\/lib\/catalog-pricing-model['"]/,
      message: 'QuotePricingBasis must be imported from @/lib/pricing-basis-contract, not catalog-pricing-model.',
    },
    {
      pattern: /pricingBasis\??:\s*string\b/,
      message: 'pricingBasis fields must use QuotePricingBasis/PricingBasisContract, not plain string.',
    },
    {
      pattern: /\b(EX_FACTORY|FOB_PRICE|CIF_PRICE|BULK_CHIPS)\b/,
      message: 'Uppercase/stale pricing-basis constants are not allowed in source contracts.',
    },
  ];
  for (const check of checks) {
    if (check.pattern.test(text)) failures.push(`${file}: ${check.message}`);
  }
}

for (const root of ROOTS) walk(root);

const workflowTypes = readFileSync('src/features/trade-workflow/types.ts', 'utf8');
for (const required of [
  'journey: TradeJourney;',
  'pricingBasis: QuotePricingBasis | null;',
  'export type OrderTradeWorkflow = {\n  journey: TradeJourney;',
]) {
  if (!workflowTypes.includes(required)) failures.push(`src/features/trade-workflow/types.ts: missing required contract member ${JSON.stringify(required)}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Contract boundary checks passed.');
