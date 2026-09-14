import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const PASSWORD_RESET_PENDING_COOKIE = 'setuflow-password-reset-pending';

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const token = authorization.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminSupabaseClient() as any;

  if (!admin) {
    return NextResponse.json(
      { ok: false, error: 'Password changed, but first-login completion could not be recorded.' },
      { status: 500 },
    );
  }

  // The reset-password client explicitly sends the recovery session access token.
  // Prefer that identity over any stale browser cookie that may belong to a
  // different account on the same device/browser.
  const bearerToken = getBearerToken(request);
  let user = null;

  if (bearerToken) {
    const bearerUserResult = await admin.auth.getUser(bearerToken);
    user = bearerUserResult.data.user;
  }

  if (!user) {
    const cookieUserResult = await supabase.auth.getUser();
    user = cookieUserResult.data.user;
  }

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  // Supabase merges app_metadata on update rather than removing omitted keys.
  // Explicitly null the forced-change fields so a completed reset cannot loop.
  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      force_password_change: null,
      force_password_change_org_id: null,
      temporary_password_issued_at: null,
    },
  });

  if (metadataError) {
    return NextResponse.json(
      { ok: false, error: 'Password changed, but first-login completion could not be recorded.' },
      { status: 500 },
    );
  }

  const refreshedUserResult = await admin.auth.admin.getUserById(user.id);
  const refreshedMetadata = refreshedUserResult.data.user?.app_metadata ?? {};
  if (refreshedMetadata.force_password_change === true) {
    return NextResponse.json(
      { ok: false, error: 'Password changed, but first-login completion could not be verified.' },
      { status: 500 },
    );
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
