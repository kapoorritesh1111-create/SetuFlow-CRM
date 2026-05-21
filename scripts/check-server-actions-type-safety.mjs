import { readFileSync, existsSync } from 'node:fs';

const files = [
  'src/features/leads/server/actions.ts',
  'src/features/leads/server/actions/legacy-actions.ts',
  'src/features/quotes/server/actions.ts',
  'src/features/orders/server/actions.ts',
];

const unsafePattern = [' as', 'any'].join(' ');
const violations = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.includes(unsafePattern)) {
      violations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error('SF-18-008 server action type-safety check failed. Remove unsafe inline casts from selected server action files:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('SF-18-008 server action type-safety check passed.');
