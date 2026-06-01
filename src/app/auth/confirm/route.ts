import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PASSWORD_RESET_PENDING_COOKIE = 'setuflow-password-reset-pending';

function safeNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith('/')) return '/dashboard';
  if (nextParam.startsWith('//')) return '/dashboard';
  return nextParam;
}

function withPasswordResetCookie(response: NextResponse, nextPath: string) {
  if (nextPath.startsWith('/reset-password')) {
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

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return withPasswordResetCookie(NextResponse.redirect(redirectTo), nextPath);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return withPasswordResetCookie(NextResponse.redirect(redirectTo), nextPath);
    }
  }

  const errorRedirect = new URL('/login', request.url);
  errorRedirect.searchParams.set('error', 'The sign-in or recovery link is invalid or has expired.');
  return NextResponse.redirect(errorRedirect);
}
