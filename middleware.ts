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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/development' || pathname.startsWith('/development/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const workspaceDestination = workspaceRedirects[pathname];
  if (workspaceDestination) {
    return NextResponse.redirect(new URL(workspaceDestination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/development/:path*', '/workspace/:path*'],
};
