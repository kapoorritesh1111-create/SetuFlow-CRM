import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const PASSWORD_RESET_PENDING_COOKIE = 'setuflow-password-reset-pending';

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (admin) {
    const nextAppMetadata = { ...(data.user.app_metadata ?? {}) } as Record<string, unknown>;
    delete nextAppMetadata.force_password_change;
    delete nextAppMetadata.force_password_change_org_id;
    delete nextAppMetadata.temporary_password_issued_at;

    const { error: metadataError } = await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: nextAppMetadata,
    });

    if (metadataError) {
      return NextResponse.json({ ok: false, error: 'Password changed, but first-login completion could not be recorded.' }, { status: 500 });
    }
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
