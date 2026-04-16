import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMyCardSettingsForUser, upsertMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { EMPTY_CARD_SETTINGS, toCardSettingsInput, type MyCardSettingsInput, type MyCardSettingsRow } from '@/lib/contact-exchange/my-card-settings-shared';

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings: MyCardSettingsRow | null = await getMyCardSettingsForUser(user.id);
  return NextResponse.json({
    settings: toCardSettingsInput(settings, EMPTY_CARD_SETTINGS),
    shareSlug: settings?.share_slug ?? null,
    isPublic: settings?.is_public ?? true,
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const input = body?.settings as MyCardSettingsInput | undefined;
  const organizationId = typeof body?.organizationId === 'string' ? body.organizationId : null;
  const fullName = typeof body?.fullName === 'string' ? body.fullName : user.email || 'SETU Flow user';
  const email = typeof body?.email === 'string' ? body.email : user.email || 'hello@setuflow.com';

  if (!input) {
    return NextResponse.json({ error: 'Missing settings payload.' }, { status: 400 });
  }

  const saved: MyCardSettingsRow = await upsertMyCardSettingsForUser({
    userId: user.id,
    organizationId,
    fullName,
    email,
    input,
  });

  return NextResponse.json({
    settings: toCardSettingsInput(saved, EMPTY_CARD_SETTINGS),
    shareSlug: saved.share_slug,
    isPublic: saved.is_public,
  });
}
