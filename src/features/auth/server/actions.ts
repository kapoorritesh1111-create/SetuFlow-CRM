"use server";

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginSchema, requestPasswordResetSchema } from '@/lib/validation/auth';
import { checkRateLimit } from '@/lib/rate-limit/simple';
import { env } from '@/lib/env';
import { safeAppUrl } from '@/lib/security/url';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type ProfileLoginCandidate = {
  email: string | null;
  username: string | null;
};

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function pickProfileEmail(username: string, rows: ProfileLoginCandidate[]): string | null {
  const normalizedUsername = normalizeUsername(username);
  const exactCaseInsensitive = rows.find((row) => row.username?.trim().toLowerCase() === normalizedUsername);
  const firstWithEmail = rows.find((row) => typeof row.email === 'string' && row.email.trim().length > 0);
  return exactCaseInsensitive?.email?.trim() || firstWithEmail?.email?.trim() || null;
}

async function lookupProfileCandidates(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const admin = createAdminSupabaseClient();

  if (admin) {
    const { data, error } = await admin
      .from('profiles')
      .select('email, username')
      .ilike('username', normalizedUsername)
      .limit(10);

    return { data: (data ?? []) as ProfileLoginCandidate[], error };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('email, username')
    .ilike('username', normalizedUsername)
    .limit(10);

  return { data: (data ?? []) as ProfileLoginCandidate[], error };
}

function resolveNextPath(raw: string | null) {
  const fallback = '/dashboard';
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  return value;
}

export async function loginWithUsername(
  _: { error?: string } | undefined,
  formData: FormData,
) {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = resolveNextPath(String(formData.get('next') ?? ''));
  const loginParsed = loginSchema.safeParse({ username, password });

  if (!loginParsed.success) {
    return { error: loginParsed.error.issues[0]?.message ?? 'Username and password are required.' };
  }

  const rateLimit = await checkRateLimit(`login:${username.toLowerCase()}`, 8, 60_000);
  if (!rateLimit.allowed) {
    return { error: 'Too many sign-in attempts. Please wait a minute and try again.' };
  }

  const lookupResult = await lookupProfileCandidates(username);

  if (lookupResult.error) {
    return { error: lookupResult.error.message };
  }

  const matchedEmail = pickProfileEmail(username, lookupResult.data ?? []);

  if (!matchedEmail) {
    return {
      error:
        'No profile was found for that username. Check that the profiles table contains the username, the email is filled in, and the row is linked to the Supabase auth user.',
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email: matchedEmail, password });
  if (error) return { error: error.message };

  redirect(next);
}

export async function requestPasswordReset(email: string) {
  const parsed = requestPasswordResetSchema.safeParse({ email: email.trim() });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A valid email is required.' };
  }

  const supabase = await createServerSupabaseClient();
  const requestOrigin = safeAppUrl(headers().get('origin'));
  const baseUrl = requestOrigin || safeAppUrl(env.appUrl);
  const redirectTo = new URL('/auth/confirm', baseUrl);
  redirectTo.searchParams.set('next', '/reset-password');

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: redirectTo.toString(),
  });

  if (error) return { error: error.message };
  return { success: 'Password reset email sent.' };
}
