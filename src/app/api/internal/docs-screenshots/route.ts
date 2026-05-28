import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SETU_FLOW_ORG_ID = '3327b9a7-aadb-44b0-9793-30c4045d3c92';
const BUCKET = 'docs-workspace';

function createServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'workspace-snapshot';
}

async function getCurrentInternalUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: membership, error: membershipErr } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .maybeSingle();

  if (membershipErr || !membership) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const profileRecord = profile as { full_name?: string | null } | null;

  return {
    ok: true as const,
    user: {
      id: user.id,
      name: profileRecord?.full_name || user.email || 'SETU Flow Member',
    },
  };
}

export async function GET() {
  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from('docs_workspace_screenshots')
      .select('id, title, route, area, description, image_url, storage_path, created_at, created_by_name, is_published')
      .eq('organization_id', SETU_FLOW_ORG_ID)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[/api/internal/docs-screenshots][GET]', error.message);
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error('[/api/internal/docs-screenshots][GET]', error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getCurrentInternalUser();
    if (!auth.ok) return auth.response;

    const formData = await request.formData();
    const file = formData.get('file');
    const title = String(formData.get('title') || '').trim();
    const route = String(formData.get('route') || '').trim();
    const area = String(formData.get('area') || '').trim();
    const description = String(formData.get('description') || '').trim();

    if (!(file instanceof File) || !title) {
      return NextResponse.json({ error: 'Title and file are required.' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${Date.now()}-${slugify(title)}.${extension}`;
    const storagePath = `live-ui/${fileName}`;

    const admin = createServiceClient();

    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: '8MB',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    }).catch(() => null);

    const upload = await admin.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/png',
      upsert: false,
    });

    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;

    const insert = await admin
      .from('docs_workspace_screenshots')
      .insert({
        title,
        route: route || null,
        area: area || null,
        description: description || null,
        organization_id: SETU_FLOW_ORG_ID,
        image_url: publicUrl,
        storage_path: storagePath,
        created_by: auth.user.id,
        created_by_name: auth.user.name,
        is_published: true,
      })
      .select('id, title, route, area, description, image_url, storage_path, created_at, created_by_name, is_published')
      .single();

    if (insert.error) {
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ item: insert.data }, { status: 201 });
  } catch (error) {
    console.error('[/api/internal/docs-screenshots][POST]', error);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
