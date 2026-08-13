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

  const cookieUserResult = await supabase.auth.getUser();
  let user = cookieUserResult.data.user;

  if (!user) {
    const bearerToken = getBearerToken(request);
    if (bearerToken) {
      const bearerUserResult = await admin.auth.getUser(bearerToken);
      user = bearerUserResult.data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  const nextAppMetadata = { ...(user.app_metadata ?? {}) } as Record<string, unknown>;
  delete nextAppMetadata.force_password_change;
  delete nextAppMetadata.force_password_change_org_id;
  delete nextAppMetadata.temporary_password_issued_at;

  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: nextAppMetadata,
  });

  if (metadataError) {
    return NextResponse.json(
      { ok: false, error: 'Password changed, but first-login completion could not be recorded.' },
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
