import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  const { avatarUrl } = await request.json().catch(() => ({ avatarUrl: '' }));
  const value = String(avatarUrl ?? '').trim();
  if (!value || !value.startsWith('data:image/')) return NextResponse.json({ error: 'Upload a valid image file.' }, { status: 400 });
  if (value.length > 1_800_000) return NextResponse.json({ error: 'Image is too large. Please use a smaller profile photo.' }, { status: 413 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const { error } = await (supabase.from('profiles') as any).update({ avatar_url: value, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message || 'Could not save profile photo.' }, { status: 500 });
  return NextResponse.json({ avatarUrl: value });
}
