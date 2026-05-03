#!/usr/bin/env node
const requestedProvider = String(process.env.CONTACT_SCAN_PROVIDER || 'openai').trim().toLowerCase();
const fallbackProvider = String(process.env.CONTACT_SCAN_FALLBACK_PROVIDER || 'openai').trim().toLowerCase();
const usingGoogleVision = requestedProvider === 'google-vision';
const usingOpenAiVision = requestedProvider === 'openai-vision' || requestedProvider === 'openai';

const required = [
  ...(usingGoogleVision
    ? [['GOOGLE_CLOUD_VISION_API_KEY', 'Required because CONTACT_SCAN_PROVIDER=google-vision for phone photo OCR.']]
    : []),
  ...(usingOpenAiVision
    ? [['OPENAI_API_KEY', 'Required because CONTACT_SCAN_PROVIDER=openai-vision/openai for direct image/PDF OCR.']]
    : []),
  ...(fallbackProvider === 'openai'
    ? [['OPENAI_API_KEY', 'Required because CONTACT_SCAN_FALLBACK_PROVIDER=openai for CRM field mapping/fallback.']]
    : []),
  ['NEXT_PUBLIC_SUPABASE_URL', 'Required for Supabase client/auth.'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Required for Supabase client/auth.'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Required for server-side contact scan lead save actions.'],
];

const recommended = [
  ['CONTACT_SCAN_PROVIDER', 'Recommended explicit scanner provider. For PASS30 investor demo use openai-vision. For low-cost production comparison use google-vision.'],
  ['CONTACT_SCAN_FALLBACK_PROVIDER', 'Recommended explicit fallback provider. Use openai for field mapping.'],
  ['OPENAI_CONTACT_SCAN_MODEL', 'Recommended explicit model; defaults to gpt-4.1-mini.'],
  ['GOOGLE_CLOUD_VISION_API_KEY', 'Optional while CONTACT_SCAN_PROVIDER=openai-vision; keep it for future provider comparison.'],
  ['NEXT_PUBLIC_APP_URL', 'Recommended for stable public card / vCard links.'],
  ['NEXT_PUBLIC_FEATURE_MOBILE_APP_V1', 'Recommended explicit mobile rollout flag.'],
];

function has(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim());
}

let failed = false;
console.log('SETU Flow mobile scan production readiness');
console.log(`INFO CONTACT_SCAN_PROVIDER=${requestedProvider || 'openai'}`);
console.log(`INFO CONTACT_SCAN_FALLBACK_PROVIDER=${fallbackProvider || 'openai'}`);
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
  console.log('WARN AI_PROVIDER is not openai. Contact-scan OCR uses its own CONTACT_SCAN_PROVIDER / CONTACT_SCAN_FALLBACK_PROVIDER settings.');
}

if (failed) {
  console.error('\nMobile card scan is not production-ready. Add the missing required variables in Vercel Production and redeploy.');
  process.exit(1);
}
console.log('\nMobile card scan production env looks ready. Test /api/mobile/scan-readiness after deploy.');
