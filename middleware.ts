import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const workspaceRedirects: Record<string, string> = {
  // Legacy workspace URL aliases — these old paths redirect to the current CRM routes
  '/workspace/dashboard': '/dashboard',
  '/workspace/leads': '/leads',
  '/workspace/capture': '/contact-exchange/scan',
  '/workspace/quotes': '/quotes',
  '/workspace/orders': '/orders',
  '/workspace/my-card': '/contact-exchange/vcard',
  // NOTE: /workspace itself is now the internal engineering workspace (not a redirect)
};

type RateLimitBucket = { count: number; resetAt: number };

const SETU_GURU_RESEARCH_PATH = '/api/setu-guru/research';
const PASSWORD_RESET_PENDING_COOKIE = 'setuflow-password-reset-pending';
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RESEARCH_LIMIT = 10;
const researchBuckets = new Map<string, RateLimitBucket>();

function getResearchLimit() {
  const configured = Number(process.env.SETU_GURU_RESEARCH_RATE_LIMIT ?? DEFAULT_RESEARCH_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_RESEARCH_LIMIT;
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || realIp || vercelIp || 'unknown-client';
}

function checkResearchRateLimit(request: NextRequest) {
  const now = Date.now();
  const limit = getResearchLimit();
  const key = getClientKey(request);
  const existing = researchBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    researchBuckets.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, limit, remaining: Math.max(limit - existing.count, 0), resetAt: existing.resetAt };
}

function rateLimitHeaders(limit: number, remaining: number, resetAt: number) {
  const retryAfterSeconds = Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1);
  return {
    'Retry-After': String(retryAfterSeconds),
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}

function applyRateLimitHeaders(response: NextResponse, limit: number, remaining: number, resetAt: number) {
  Object.entries(rateLimitHeaders(limit, remaining, resetAt)).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

function createContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "connect-src 'self' https: wss:",
    "object-src 'none'",
  ].join('; ');
}

const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/client-login',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/privacy',
  '/terms',
]);

const PUBLIC_PREFIXES = [
  '/auth/',
  '/api/public/',
  '/api/logout',
  '/api/cron/',
  '/api/integrations/webhooks/',
  '/order-documents/preview/',
  '/v/',
  '/public/',
  // NOTE: /internal/ is intentionally NOT listed here — all /internal/* pages
  // require an authenticated Supabase session AND SETU Flow org membership.
  // The HTML files themselves enforce a second client-side auth gate.
];

function hasSupabaseMiddlewareEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
}

function isPublicPath(pathname: string) {
  return PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedApiPath(pathname: string) {
  return pathname.startsWith('/api/') && !isPublicPath(pathname);
}

function loginRedirect(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/client-login';
  redirectUrl.search = '';
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  redirectUrl.searchParams.set('next', nextPath);
  return redirectUrl;
}

function resetPasswordRedirect(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/reset-password';
  redirectUrl.search = '';
  redirectUrl.searchParams.set('next', '/login');
  return redirectUrl;
}

function createNonce() {
  return crypto.randomUUID().replace(/-/g, '');
}

function createRequestHeaders(request: NextRequest, nonce: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  return requestHeaders;
}

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set('Content-Security-Policy', createContentSecurityPolicy(nonce));
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();
  const requestHeaders = createRequestHeaders(request, nonce);

  if (pathname === '/development' || pathname.startsWith('/development/')) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)), nonce);
  }

  if (pathname === '/trail') {
    return applySecurityHeaders(NextResponse.redirect(new URL('/trial', request.url)), nonce);
  }

  const workspaceDestination = workspaceRedirects[pathname];
  if (workspaceDestination) {
    return applySecurityHeaders(NextResponse.redirect(new URL(workspaceDestination, request.url)), nonce);
  }

  if (!hasSupabaseMiddlewareEnv()) {
    return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createMiddlewareClient(request, response);
  const { data, error } = await supabase.auth.getUser();
  const isPendingPasswordReset = request.cookies.get(PASSWORD_RESET_PENDING_COOKIE)?.value === '1';

  if (isPendingPasswordReset && data.user && pathname !== '/reset-password' && !pathname.startsWith('/auth/') && pathname !== '/api/auth/reset-password/complete') {
    return applySecurityHeaders(NextResponse.redirect(resetPasswordRedirect(request)), nonce);
  }

  if (isPublicPath(pathname)) {
    return applySecurityHeaders(response, nonce);
  }

  if (error || !data.user) {
    if (isProtectedApiPath(pathname)) {
      return applySecurityHeaders(NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 }), nonce);
    }
    return applySecurityHeaders(NextResponse.redirect(loginRedirect(request)), nonce);
  }

  if (pathname === SETU_GURU_RESEARCH_PATH) {
    const quota = checkResearchRateLimit(request);
    if (!quota.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            ok: false,
            error: 'Setu Guru live research rate limit exceeded.',
            message: 'Please wait for the rate-limit window to reset before asking another live research question.',
          },
          { status: 429, headers: rateLimitHeaders(quota.limit, quota.remaining, quota.resetAt) },
        ),
        nonce,
      );
    }
    applyRateLimitHeaders(response, quota.limit, quota.remaining, quota.resetAt);
  }

  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|og-image.png|logos/|marketing/).*)',
  ],
};
