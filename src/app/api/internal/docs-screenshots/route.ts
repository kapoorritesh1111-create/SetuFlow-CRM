import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

function parseShareToken(token: string | null) {
  if (!token) return null;
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as { expiry?: number };
    return parsed.expiry && parsed.expiry > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

async function isInternalUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return !error && Boolean(user);
}

export async function GET(request: NextRequest) {
  try {
    const shareToken = request.nextUrl.searchParams.get('share_token');
    const allowed = parseShareToken(shareToken) || await isInternalUser();
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ screenshots: [] });

    const { data, error } = await service
      .from('docs_screenshots')
      .select('id,title,route,description,image_data,image_name,created_at,created_by')
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) {
      console.error('docs_screenshots select failed', error);
      return NextResponse.json({ screenshots: [] });
    }

    return NextResponse.json({ screenshots: data ?? [] });
  } catch (error) {
    console.error('[/api/internal/docs-screenshots GET]', error);
    return NextResponse.json({ screenshots: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { title?: string; route?: string; description?: string; image_name?: string; image_data?: string };
    if (!body.image_data || !String(body.image_data).startsWith('data:image/')) {
      return NextResponse.json({ error: 'Image data URL required' }, { status: 400 });
    }

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ error: 'Screenshot persistence unavailable' }, { status: 503 });

    const insertPayload = {
      title: String(body.title ?? 'Untitled screenshot').slice(0, 140),
      route: String(body.route ?? '/').slice(0, 220),
      description: String(body.description ?? '').slice(0, 1000),
      image_name: String(body.image_name ?? 'screenshot').slice(0, 220),
      image_data: body.image_data,
      created_by: user.id,
    };

    const { data, error } = await service
      .from('docs_screenshots')
      .insert(insertPayload)
      .select('id,title,route,description,image_data,image_name,created_at,created_by')
      .single();

    if (error) {
      console.error('docs_screenshots insert failed', error);
      return NextResponse.json({ error: 'Unable to save screenshot' }, { status: 500 });
    }

    return NextResponse.json({ screenshot: data });
  } catch (error) {
    console.error('[/api/internal/docs-screenshots POST]', error);
    return NextResponse.json({ error: 'Unable to save screenshot' }, { status: 500 });
  }
}
