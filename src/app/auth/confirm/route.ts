import { createHash } from 'crypto';
import { type EmailOtpType, type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const PASSWORD_RESET_PENDING_COOKIE = 'setuflow-password-reset-pending';
const USED_ACCESS_DIGESTS_KEY = 'setuflow_used_access_digests';
const MAX_STORED_ACCESS_DIGESTS = 20;

type AccessUsageResult =
  | { ok: true; message: null }
  | { ok: false; message: string };

function safeNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith('/')) return '/dashboard';
  if (nextParam.startsWith('//')) return '/dashboard';
  return nextParam;
}

function isCredentialSetupFlow(nextPath: string) {
  return nextPath === '/reset-password' || nextPath.startsWith('/reset-password?');
}

function accessDigest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function errorRedirect(request: NextRequest, message: string) {
  const redirectTo = new URL('/login', request.url);
  redirectTo.searchParams.set('error', message);
  return NextResponse.redirect(redirectTo);
}

async function markAccessLinkUsed(user: User, digest: string): Promise<AccessUsageResult> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return { ok: false, message: 'Account access verification is unavailable. Please contact support.' };
  }

  const { data, error } = await admin.auth.admin.getUserById(user.id);
  if (error || !data.user) {
    return { ok: false, message: error?.message ?? 'Unable to verify the account access link.' };
  }

  const appMetadata = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const usedDigests = normalizeStringArray(appMetadata[USED_ACCESS_DIGESTS_KEY]);

  if (usedDigests.includes(digest)) {
    return { ok: false, message: 'This account access link has already been used. Please request a new one.' };
  }

  const nextDigests = [digest, ...usedDigests].slice(0, MAX_STORED_ACCESS_DIGESTS);
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...appMetadata,
      [USED_ACCESS_DIGESTS_KEY]: nextDigests,
    },
  });

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  return { ok: true, message: null };
}

function withPasswordResetCookie(response: NextResponse, nextPath: string) {
  if (isCredentialSetupFlow(nextPath)) {
    response.cookies.set(PASSWORD_RESET_PENDING_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 15 * 60,
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const code = requestUrl.searchParams.get('code');
  const nextPath = safeNextPath(requestUrl.searchParams.get('next'));
  const redirectTo = new URL(nextPath, request.url);
  const credentialSetupFlow = isCredentialSetupFlow(nextPath);

  const supabase = await createClient();

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (credentialSetupFlow && data.user) {
        const usage = await markAccessLinkUsed(data.user, accessDigest(`${type}:${token_hash}`));
        if (!usage.ok) {
          await supabase.auth.signOut();
          return errorRedirect(request, usage.message);
        }
      }
      return withPasswordResetCookie(NextResponse.redirect(redirectTo), nextPath);
    }
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (credentialSetupFlow && data.user) {
        const usage = await markAccessLinkUsed(data.user, accessDigest(`code:${code}`));
        if (!usage.ok) {
          await supabase.auth.signOut();
          return errorRedirect(request, usage.message);
        }
      }
      return withPasswordResetCookie(NextResponse.redirect(redirectTo), nextPath);
    }
  }

  return errorRedirect(request, 'The account access link is invalid or expired.');
}
