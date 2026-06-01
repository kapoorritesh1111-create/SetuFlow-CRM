import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PASSWORD_RESET_PENDING_COOKIE = 'setuflow-password-reset-pending';

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PASSWORD_RESET_PENDING_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
