import { NextRequest, NextResponse } from 'next/server';

function safeRedirectTarget(request: NextRequest, value: string | null, fallback = '/card') {
  if (!value) return new URL(fallback, request.nextUrl.origin);
  try {
    const target = new URL(value, request.nextUrl.origin);
    if (target.origin !== request.nextUrl.origin && !target.protocol.startsWith('http')) {
      return new URL(fallback, request.nextUrl.origin);
    }
    return target;
  } catch {
    return new URL(fallback, request.nextUrl.origin);
  }
}

function buildProviderUrl(template: string, cardUrl: string, name: string) {
  return template
    .replaceAll('{url}', encodeURIComponent(cardUrl))
    .replaceAll('{name}', encodeURIComponent(name));
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || '/card';
  const name = request.nextUrl.searchParams.get('name') || 'SETU Flow contact';
  const fallback = request.nextUrl.searchParams.get('fallback') || url;
  const absoluteCardUrl = new URL(url, request.nextUrl.origin).toString();
  const providerTemplate = process.env.APPLE_WALLET_PASS_URL_TEMPLATE?.trim();

  if (providerTemplate) {
    return NextResponse.redirect(buildProviderUrl(providerTemplate, absoluteCardUrl, name), 302);
  }

  // Production-safe fallback: never expose setup/developer copy to sales users.
  // Until Apple PassKit signing credentials/provider are configured, save the contact instead.
  const response = NextResponse.redirect(safeRedirectTarget(request, fallback, url), 302);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Setu-Wallet-Fallback', 'contact');
  return response;
}
