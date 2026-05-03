export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

function truthy(value: string | undefined) {
  if (!value) return false;
  return !['0', 'false', 'off', 'no'].includes(value.toLowerCase());
}

function maskPresent(value: string | undefined) {
  return Boolean(value && value.trim());
}

function getOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto = forwardedProto || url.protocol.replace(':', '');
  return { url, proto, secure: proto === 'https' || url.hostname === 'localhost' || url.hostname === '127.0.0.1' };
}

export async function GET(request: Request) {
  const { url, proto, secure } = getOrigin(request);
  const hasOpenAiKey = maskPresent(process.env.OPENAI_API_KEY);
  const hasSupabaseUrl = maskPresent(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnon = maskPresent(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasSupabaseService = maskPresent(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const mobileFlag = process.env.NEXT_PUBLIC_FEATURE_MOBILE_APP_V1 ?? process.env.FEATURE_MOBILE_APP_V1;
  const mobileEnabled = mobileFlag === undefined ? true : truthy(mobileFlag);
  const model = process.env.OPENAI_CONTACT_SCAN_MODEL || 'gpt-4.1-mini';

  const checks: ReadinessCheck[] = [
    {
      id: 'secure-context',
      label: 'Camera secure context',
      ok: secure,
      detail: secure
        ? `Camera capture can run from ${proto}://${url.host}.`
        : 'Camera capture requires HTTPS in production. Localhost is allowed for development.',
    },
    {
      id: 'openai-ocr',
      label: 'Business-card OCR provider',
      ok: hasOpenAiKey,
      detail: hasOpenAiKey
        ? `OPENAI_API_KEY is present. Contact scan model: ${model}.`
        : 'OPENAI_API_KEY is missing. Image/PDF uploads will accept files but cannot auto-read text without assist text.',
    },
    {
      id: 'mobile-flag',
      label: 'Mobile app flag',
      ok: mobileEnabled,
      detail: mobileEnabled
        ? 'Mobile app v1 is enabled or defaults on for this build.'
        : 'NEXT_PUBLIC_FEATURE_MOBILE_APP_V1 / FEATURE_MOBILE_APP_V1 disables the mobile shell.',
    },
    {
      id: 'supabase-client',
      label: 'Supabase browser configuration',
      ok: hasSupabaseUrl && hasSupabaseAnon,
      detail: hasSupabaseUrl && hasSupabaseAnon
        ? 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are present.'
        : 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Lead save/login may fail.',
    },
    {
      id: 'supabase-server',
      label: 'Supabase server save path',
      ok: hasSupabaseService,
      detail: hasSupabaseService
        ? 'SUPABASE_SERVICE_ROLE_KEY is present for server-side lead save actions.'
        : 'SUPABASE_SERVICE_ROLE_KEY is missing. Server save actions may fail depending on deployment auth mode.',
    },
    {
      id: 'upload-limits',
      label: 'Upload limit',
      ok: true,
      detail: 'Mobile scanner accepts image/* up to 10 MB, optimizes phone photos before upload, and accepts PDFs up to 3 MB. Server upload stays under Vercel function payload limits.',
    },
  ];

  return Response.json({
    ok: checks.every((check) => check.ok),
    route: '/api/mobile/scan-readiness',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    scanner: {
      acceptedTypes: ['image/*', 'application/pdf'],
      maxOriginalImageBytes: 10 * 1024 * 1024,
      maxServerUploadBytes: 3 * 1024 * 1024,
      maxPdfBytes: 3 * 1024 * 1024,
      capture: 'environment',
      model,
    },
    checks,
  });
}
