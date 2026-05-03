#!/usr/bin/env node
const required = [
  ['OPENAI_API_KEY', 'Required for automatic business-card OCR from camera/file uploads.'],
  ['NEXT_PUBLIC_SUPABASE_URL', 'Required for Supabase client/auth.'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Required for Supabase client/auth.'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Required for server-side contact scan lead save actions.'],
];

const recommended = [
  ['OPENAI_CONTACT_SCAN_MODEL', 'Recommended explicit model; defaults to gpt-4.1-mini.'],
  ['NEXT_PUBLIC_APP_URL', 'Recommended for stable public card / vCard links.'],
  ['NEXT_PUBLIC_FEATURE_MOBILE_APP_V1', 'Recommended explicit mobile rollout flag.'],
];

function has(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim());
}

let failed = false;
console.log('SETU Flow mobile scan production readiness');
for (const [name, reason] of required) {
  const ok = has(name);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} - ${reason}`);
  if (!ok) failed = true;
}
for (const [name, reason] of recommended) {
  const ok = has(name);
  console.log(`${ok ? 'PASS' : 'WARN'} ${name} - ${reason}`);
}

if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'openai') {
  console.log('WARN AI_PROVIDER is not openai. Contact-scan OCR now uses OPENAI_API_KEY directly, but global AI routes may use another provider.');
}

if (failed) {
  console.error('\nMobile card scan is not production-ready. Add the missing required variables in Vercel Production and redeploy.');
  process.exit(1);
}
console.log('\nMobile card scan production env looks ready. Test /api/mobile/scan-readiness after deploy.');
