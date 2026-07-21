import { env } from '@/lib/env';

type HeaderReader = {
  get(name: string): string | null;
};

function firstHeaderValue(value?: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

function normalizeOrigin(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isTrustedAppOrigin(origin: string) {
  const url = new URL(origin);

  if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return true;
  }

  return (
    url.protocol === 'https:' &&
    (url.hostname === 'setuflowcrm.com' || url.hostname.endsWith('.setuflowcrm.com'))
  );
}

export function safeAppUrl(origin?: string | null) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (normalizedOrigin && isTrustedAppOrigin(normalizedOrigin)) return normalizedOrigin;
  return normalizeOrigin(env.appUrl) ?? 'http://localhost:3000';
}

export function requestOriginFromHeaders(requestHeaders: HeaderReader) {
  const directOrigin = normalizeOrigin(requestHeaders.get('origin'));
  if (directOrigin && isTrustedAppOrigin(directOrigin)) return directOrigin;

  const forwardedHost = firstHeaderValue(requestHeaders.get('x-forwarded-host'));
  const host = forwardedHost || firstHeaderValue(requestHeaders.get('host'));
  const forwardedProto = firstHeaderValue(requestHeaders.get('x-forwarded-proto'));
  const protocol = forwardedProto || (host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https');

  return safeAppUrl(host ? `${protocol}://${host}` : null);
}

export function buildAuthConfirmRedirect(nextPath: string, requestHeaders: HeaderReader) {
  const redirectTo = new URL('/auth/confirm', requestOriginFromHeaders(requestHeaders));
  redirectTo.searchParams.set('next', nextPath);
  return redirectTo.toString();
}
