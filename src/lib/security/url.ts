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

function isTrustedApp