import fs from 'node:fs';

const current = fs.readFileSync('public/pricing-v5-review.html', 'utf8');
const locked = fs.readFileSync('public/pricing-v5-review.visual-lock.html', 'utf8');

function visualSurface(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

if (visualSurface(current) !== visualSurface(locked)) {
  console.error('Pricing v5 review UI lock failed: visual HTML/CSS changed.');
  console.error('Do not redesign, remove, reorder, or replace the restored Akshay review UI.');
  console.error('Functionality fixes must be made inside existing script behavior or backend APIs only.');
  process.exit(1);
}

console.log('Pricing v5 review UI lock passed. Visual baseline is unchanged.');
