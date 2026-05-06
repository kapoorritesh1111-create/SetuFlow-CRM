import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 4_000_000;
const REMOTE_AVATAR_HOSTS = new Set(['api.dicebear.com', 'ui-avatars.com', 'images.unsplash.com', 'plus.unsplash.com']);

type AvatarPayload = { avatarUrl?: string; imageDataUrl?: string; fileName?: string };

function isAllowedRemoteAvatar(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && REMOTE_AVATAR_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:(image\/(png|jpeg|jpg|webp|gif|svg\+xml));base64,(.+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : mimeType.includes('gif') ? 'gif' : mimeType.includes('svg') ? 'svg' : 'jpg';
  const buffer = Buffer.from(match[3], 'base64');
  return { mimeType, extension, buffer };
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as AvatarPayload;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const remoteAvatarUrl = String(body.avatarUrl ?? '').trim();
  let nextAvatarUrl = '';

  if (remoteAvatarUrl) {
    if (!isAllowedRemoteAvatar(remoteAvatarUrl)) return NextResponse.json({ error: 'Use one of the recommended avatar sources or upload an image.' }, { status: 400 });
    nextAvatarUrl = remoteAvatarUrl;
  } else {
    const imageDataUrl = String(body.imageDataUrl ?? '').trim() || String((body as any).avatarUrl ?? '').trim();
    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed) return NextResponse.json({ error: 'Upload a valid image file.' }, { status: 400 });
    if (parsed.buffer.byteLength > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image is too large. Please use a smaller profile photo.' }, { status: 413 });

    const safeFileName = String(body.fileName ?? 'avatar').replace(/[^a-z0-9._-]/gi, '-').slice(0, 80);
    const storagePath = `${userId}/avatar-${Date.now()}-${safeFileName}.${parsed.extension}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(storagePath, parsed.buffer, {
      contentType: parsed.mimeType,
      cacheControl: '3600',
      upsert: true,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message || 'Could not upload avatar to storage.' }, { status: 500 });

    const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(storagePath, 60 * 60 * 24 * 365);
    nextAvatarUrl = signed?.signedUrl || supabase.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
  }

  const { error } = await (supabase.from('profiles') as any).update({ avatar_url: nextAvatarUrl, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message || 'Could not save profile photo.' }, { status: 500 });
  return NextResponse.json({ avatarUrl: nextAvatarUrl });
}
