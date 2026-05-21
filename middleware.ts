import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const workspaceRedirects: Record<string, string> = {
  '/workspace': '/dashboard',
  '/workspace/dashboard': '/dashboard',
  '/workspace/leads': '/leads',
  '/workspace/capture': '/contact-exchange/scan',
  '/workspace/quotes': '/quotes',
  '/workspace/orders': '/orders',
  '/workspace/my-card': '/contact-exchange/vcard',
};

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
  '/internal/',
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

  const workspaceDestination = workspaceRedirects[pathname];
  if (workspaceDestination) {
    return applySecurityHeaders(NextResponse.redirect(new URL(workspaceDestination, request.url)), nonce);
  }

  if (isPublicPath(pathname) || !hasSupabaseMiddlewareEnv()) {
    return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createMiddlewareClient(request, response);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    if (isProtectedApiPath(pathname)) {
      return applySecurityHeaders(NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 }), nonce);
    }
    return applySecurityHeaders(NextResponse.redirect(loginRedirect(request)), nonce);
  }

  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|og-image.png|logos/|marketing/).*)',
  ],
};