/**
 * Rate limiting — Supabase-backed for production correctness.
 *
 * Sprint 5 Batch 1 fix: the previous implementation used a module-level
 * Map which resets on every serverless cold start and provides zero
 * protection in production on Vercel. This version persists hit counts
 * in Supabase so limits hold across all function instances.
 *
 * Falls back to allowing the request if:
 *  - Supabase env vars are not configured (local dev)
 *  - Service role key is absent (admin client returns null)
 *  - The rate_limit_hits table does not exist yet
 *  - Any unexpected infrastructure error occurs
 *
 * This means the app never blocks legitimate requests due to a missing
 * rate-limit table — but rate limiting is real in production when
 * SUPABASE_SERVICE_ROLE_KEY is set.
 */

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { hasSupabaseEnv } from '@/lib/env';

export async function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<{ allowed: boolean }> {
  if (!hasSupabaseEnv) return { allowed: true };

  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { allowed: true };

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const { data: existing, error: fetchError } = await supabase
      .from('rate_limit_hits')
      .select('count, window_start')
      .eq('key', key)
      .maybeSingle();

    if (fetchError) {
      console.warn('[rate-limit] fetch error — failing open:', fetchError.message);
      return { allowed: true };
    }

    if (!existing) {
      await supabase.from('rate_limit_hits').upsert({
        key,
        count: 1,
        window_start: now.toISOString(),
      });
      return { allowed: true };
    }

    const recordWindowStart = new Date(existing.window_start);

    if (recordWindowStart < windowStart) {
      await supabase.from('rate_limit_hits').upsert({
        key,
        count: 1,
        window_start: now.toISOString(),
      });
      return { allowed: true };
    }

    if (existing.count >= limit) {
      return { allowed: false };
    }

    await supabase
      .from('rate_limit_hits')
      .update({ count: existing.count + 1 })
      .eq('key', key);

    return { allowed: true };
  } catch (err) {
    console.warn('[rate-limit] unexpected error — failing open:', err);
    return { allowed: true };
  }
}

export function getPublicRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

export function publicRateLimitKey(scope: string, request: Request) {
  return `${scope}:${getPublicRequestIp(request)}`;
}
