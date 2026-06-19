"use server";

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginOtpSchema, loginSchema, requestPasswordResetSchema } from '@/lib/validation/auth';
import { checkRateLimit } from '@/lib/rate-limit/simple';
import { env } from '@/lib/env';
import { safeAppUrl } from '@/lib/security/url';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { persistActiveOrganization } from '@/lib/workspace/auth';

type ProfileLoginCandidate = {
  email: string | null;
  username: string | null;
};

type LoginActionState = {
  error?: string;
  success?: string;
  mfa?: {
    factorId: string;
    challengeId: string;
    next: string;
  };
};

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function pickProfileEmail(username: string, rows: ProfileLoginCandidate[]): string | null {
  const normalizedUsername = normalizeUsername(username);
  const exactCaseInsensitive = rows.find((row) => row.username?.trim().toLowerCase() === normalizedUsername);
  const exactEmail = rows.find((row) => row.email?.trim().toLowerCase() === normalizedUsername);
  const firstWithEmail = rows.find((row) => typeof row.email === 'string' && row.email.trim().length > 0);
  return exactCaseInsensitive?.email?.trim() || exactEmail?.email?.trim() || firstWithEmail?.email?.trim() || null;
}

async function lookupProfileCandidates(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const admin = createAdminSupabaseClient();

  if (admin) {
    if (looksLikeEmail(normalizedUsername)) {
      const { data, error } = await admin
        .from('profiles')
        .select('email, username')
        .ilike('email', normalizedUsername)
        .limit(10);

      return { data: (data ?? []) as ProfileLoginCandidate[], error };
    }

    const { data, error } = await admin
      .from('profiles')
      .select('email, username')
      .ilike('username', normalizedUsername)
      .limit(10);

    return { data: (data ?? []) as ProfileLoginCandidate[], error };
  }

  const supabase = await createServerSupabaseClient();
  if (looksLikeEmail(normalizedUsername)) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, username')
      .ilike('email', normalizedUsername)
      .limit(10);

    return { data: (data ?? []) as ProfileLoginCandidate[], error };
  }

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

async function resolveTrialLoginTarget(email: string, requestedNext: string) {
  if (requestedNext !== '/dashboard' && requestedNext !== '/') return requestedNext;
  const admin = createAdminSupabaseClient();
  if (!admin) return requestedNext;

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  const profileId = String(profile?.id ?? '').trim();
  if (!profileId) return requestedNext;

  const { data: membership } = await admin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', profileId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const organizationId = String(membership?.organization_id ?? '').trim();
  if (!organizationId) return requestedNext;

  const { data: trial } = await (admin as any)
    .from('organization_trial_capabilities')
    .select('organization_id, trial_mode')
    .eq('organization_id', organizationId)
    .eq('trial_mode', 'trade_show_trial')
    .maybeSingle();

  if (!trial?.organization_id) return requestedNext;
  persistActiveOrganization(organizationId, profileId);
  return '/trade-events?mode=trade_show_trial';
}

async function createMfaChallenge(next: string): Promise<LoginActionState | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { error: error.message };

  const verifiedFactor = data.totp.find((factor) => factor.status === 'verified');
  if (!verifiedFactor) return null;

  const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
  if (challenge.error) return { error: challenge.error.message };

  return {
    mfa: {
      factorId: verifiedFactor.id,
      challengeId: challenge.data.id,
      next,
    },
  };
}

export async function loginWithUsername(
  _: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState | void> {
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
        'No profile was found for that username or email. Check that the profiles table contains the username or email, and the row is linked to the Supabase auth user.',
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email: matchedEmail, password });
  if (error) return { error: error.message };

  const targetNext = await resolveTrialLoginTarget(matchedEmail, next);
  const mfaState = await createMfaChallenge(targetNext);
  if (mfaState) return mfaState;

  redirect(targetNext);
}

export async function verifyLoginOtp(
  _: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState | void> {
  const next = resolveNextPath(String(formData.get('next') ?? ''));
  const parsed = loginOtpSchema.safeParse({
    factorId: String(formData.get('factorId') ?? ''),
    challengeId: String(formData.get('challengeId') ?? ''),
    code: String(formData.get('code') ?? ''),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter the 6-digit authenticator code.' };
  }

  const rateLimit = await checkRateLimit(`login-otp:${parsed.data.factorId}`, 6, 60_000);
  if (!rateLimit.allowed) {
    return { error: 'Too many 2FA attempts. Please wait a minute and try again.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: parsed.data.challengeId,
    code: parsed.data.code,
  });

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
