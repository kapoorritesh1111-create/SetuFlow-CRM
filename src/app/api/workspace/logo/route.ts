import { NextResponse } from 'next/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

const FALLBACK_LOGO = '/logos/setu-flow-logo.svg';
const LOGO_BUCKET = 'org-logos';

function fallback() {
  return NextResponse.redirect(new URL(FALLBACK_LOGO, process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.setuflowcrm.com'));
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

  if (!workspace.user || !workspace.membership || !workspace.organization) {
    return fallback();
  }

  const supabase = await createClient();
  const { data: brandSettings } = await supabase
    .from('organization_brand_settings' as any)
    .select('workspace_logo_storage_path')
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();

  const logoPath = String(
    (brandSettings as any)?.workspace_logo_storage_path
      ?? (workspace.organization as any)?.logo_storage_path
      ?? '',
  ).trim();

  if (!isSafeStoragePath(logoPath)) {
    return fallback();
  }

  try {
    const { data, error } = await supabase.storage.from(LOGO_BUCKET).download(logoPath);
    if (error || !data) return fallback();

    const contentType = data.type || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) return fallback();

    return new NextResponse(data, {
      status: 200,
      headers: safeCacheHeaders(contentType),
    });
  } catch {
    return fallback();
  }
}
