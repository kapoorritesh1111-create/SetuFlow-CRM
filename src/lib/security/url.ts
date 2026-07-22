import { env } from '@/lib/env';

function normalizeOrigin(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const allowedOrigins = new Set(
  [normalizeOrigin(env.appUrl), 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean) as string[]
);

export function safeAppUrl(origin?: string | null) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) return normalizedOrigin;
  return normalizeOrigin(env.appUrl) ?? 'http://localhost:3000';
}
