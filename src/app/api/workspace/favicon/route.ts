import { NextResponse } from 'next/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

const FALLBACK_ICON = '/favicon.ico';
const LOGO_BUCKET = 'org-logos';

function fallback() {
  return NextResponse.redirect(new URL(FALLBACK_ICON, process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.setuflowcrm.com'));
}

function safeCacheHeaders(contentType: string) {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    'X-Content-Type-Options': 'nosniff',
  };
}

function isSafeStoragePath(value?: string | null) {
  const path = String(value ?? '').trim();
  return Boolean(path) && !path.includes('..') && !/^https?:\/\//i.test(path) && !path.startsWith('/');
}

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.membership || !workspace.organization) return fallback();

  const supabase = await createClient();
  const { data: brandSettings } = await (supabase as any)
    .from('organization_brand_settings')
    .select('favicon_storage_path, app_icon_storage_path, workspace_logo_storage_path')
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();

  const iconPath = String(
    (brandSettings as any)?.favicon_storage_path
      ?? (brandSettings as any)?.app_icon_storage_path
      ?? (brandSettings as any)?.workspace_logo_storage_path
      ?? (workspace.organization as any)?.logo_storage_path
      ?? '',
  ).trim();

  if (!isSafeStoragePath(iconPath)) return fallback();

  try {
    const { data, error } = await supabase.storage.from(LOGO_BUCKET).download(iconPath);
    if (error || !data) return fallback();
    const contentType = data.type || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) return fallback();
    return new NextResponse(data, { status: 200, headers: safeCacheHeaders(contentType) });
  } catch {
    return fallback();
  }
}
