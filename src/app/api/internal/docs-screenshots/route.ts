import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

const BUCKET = 'docs-workspace';
const MAX_BYTES = 10 * 1024 * 1024;

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

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'screenshot';
}

export async function GET(request: NextRequest) {
  try {
    const shareToken = request.nextUrl.searchParams.get('share_token');
    const allowed = parseShareToken(shareToken) || await isInternalUser();
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ screenshots: [] });

    const { data, error } = await service
      .from('docs_workspace_screenshots')
      .select('id,title,route,area,description,image_url,storage_path,created_at,created_by,created_by_name,is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) {
      console.error('docs_workspace_screenshots select failed', error);
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

    const body = await request.json() as { title?: string; route?: string; area?: string; description?: string; image_name?: string; image_data?: string };
    if (!body.image_data || !String(body.image_data).startsWith('data:image/')) {
      return NextResponse.json({ error: 'Image data URL required' }, { status: 400 });
    }

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ error: 'Screenshot persistence unavailable' }, { status: 503 });

    // Decode the data URL and upload the actual bytes to Storage — this table
    // stores image_url/storage_path, not inline base64, so the image must be
    // a real Storage object, not a row value.
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(body.image_data);
    if (!match) return NextResponse.json({ error: 'Malformed image data URL' }, { status: 400 });
    const [, contentType, base64Payload] = match;
    const bytes = Buffer.from(base64Payload, 'base64');
    if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: 'Image exceeds 10MB limit' }, { status: 413 });

    const extension = contentType.split('/')[1]?.split('+')[0] || 'png';
    const path = `${INTERNAL_ORG_ID}/${Date.now()}-${safeName(body.image_name || 'screenshot')}.${extension}`;

    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, bytes, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });
    if (uploadError) {
      console.error('docs_workspace_screenshots storage upload failed', uploadError);
      return NextResponse.json({ error: 'Unable to upload screenshot' }, { status: 500 });
    }

    const { data: publicUrlData } = service.storage.from(BUCKET).getPublicUrl(path);

    const insertPayload = {
      title: String(body.title ?? 'Untitled screenshot').slice(0, 140),
      route: body.route ? String(body.route).slice(0, 220) : null,
      area: body.area ? String(body.area).slice(0, 120) : null,
      description: String(body.description ?? '').slice(0, 1000),
      image_url: publicUrlData.publicUrl,
      storage_path: path,
      created_by: user.id,
      created_by_name: user.email ?? null,
    };

    const { data, error } = await service
      .from('docs_workspace_screenshots')
      .insert(insertPayload)
      .select('id,title,route,area,description,image_url,storage_path,created_at,created_by,created_by_name,is_published')
      .single();

    if (error) {
      console.error('docs_workspace_screenshots insert failed', error);
      // Best-effort cleanup so a failed row doesn't leave an orphaned Storage object.
      await service.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: 'Unable to save screenshot' }, { status: 500 });
    }

    return NextResponse.json({ screenshot: data });
  } catch (error) {
    console.error('[/api/internal/docs-screenshots POST]', error);
    return NextResponse.json({ error: 'Unable to save screenshot' }, { status: 500 });
  }
}

