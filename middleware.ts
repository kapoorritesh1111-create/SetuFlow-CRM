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

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https: wss:",
  "object-src 'none'",
].join('; ');

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/development' || pathname.startsWith('/development/')) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)));
  }

  const workspaceDestination = workspaceRedirects[pathname];
  if (workspaceDestination) {
    return applySecurityHeaders(NextResponse.redirect(new URL(workspaceDestination, request.url)));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png).*)',
  ],
};
