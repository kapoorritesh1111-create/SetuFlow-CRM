import { getConfiguredContactOcrProviderState } from '@/lib/contact-exchange/contact-ocr-provider';

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
  const hasSupabaseUrl = maskPresent(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnon = maskPresent(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasSupabaseService = maskPresent(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const mobileFlag = process.env.NEXT_PUBLIC_FEATURE_MOBILE_APP_V1 ?? process.env.FEATURE_MOBILE_APP_V1;
  const mobileEnabled = mobileFlag === undefined ? true : truthy(mobileFlag);
  const providerState = getConfiguredContactOcrProviderState();
  const providerOk = providerState.activeProvider !== 'none';
  const wantsGoogle = providerState.requestedProvider === 'google-vision';
  const wantsOpenAiVision = providerState.requestedProvider === 'openai-vision';

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
      id: 'contact-scan-provider',
      label: 'Active card scanner',
      ok: providerOk,
      detail: providerOk
        ? `Active provider: ${providerState.activeProvider}. Requested: ${providerState.requestedProvider}. Fallback: ${providerState.fallbackProvider}.`
        : 'No OCR provider is configured. Set CONTACT_SCAN_PROVIDER plus GOOGLE_CLOUD_VISION_API_KEY or OPENAI_API_KEY, then redeploy.',
    },

    {
      id: 'openai-vision-reader',
      label: 'OpenAI Vision card reader',
      ok: !wantsOpenAiVision || providerState.openAiConfigured,
      detail: providerState.openAiConfigured
        ? `OPENAI_API_KEY is present. Direct image card reader model: ${providerState.openAiModel}.`
        : wantsOpenAiVision
          ? 'CONTACT_SCAN_PROVIDER is openai-vision, but OPENAI_API_KEY is missing or empty.'
          : 'OpenAI Vision is available as fallback when configured.',
    },
    {
      id: 'google-vision-ocr',
      label: 'Google Vision photo OCR',
      ok: !wantsGoogle || providerState.googleConfigured,
      detail: providerState.googleConfigured
        ? 'GOOGLE_CLOUD_VISION_API_KEY is present. Photo scans can use Google Vision TEXT_DETECTION.'
        : wantsGoogle
          ? 'CONTACT_SCAN_PROVIDER is google-vision, but GOOGLE_CLOUD_VISION_API_KEY is missing or empty.'
          : 'Google Vision is not the requested primary provider for this deployment.',
    },
    {
      id: 'openai-field-mapper',
      label: 'OpenAI field mapping / fallback',
      ok: providerState.fallbackProvider !== 'openai' || providerState.openAiConfigured,
      detail: providerState.openAiConfigured
        ? `OPENAI_API_KEY is present. Contact field model: ${providerState.openAiModel}.`
        : providerState.fallbackProvider === 'openai'
          ? 'CONTACT_SCAN_FALLBACK_PROVIDER is openai, but OPENAI_API_KEY is missing.'
          : 'OpenAI fallback is disabled for this deployment.',
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
      requestedProvider: providerState.requestedProvider,
      activeProvider: providerState.activeProvider,
      fallbackProvider: providerState.fallbackProvider,
      model: providerState.activeProvider.includes('google-vision') ? providerState.googleModel : providerState.activeProvider === 'openai-vision' ? `${providerState.openAiModel} vision-direct` : providerState.openAiModel,
      openAiModel: providerState.openAiModel,
    },
    checks,
  });
}
