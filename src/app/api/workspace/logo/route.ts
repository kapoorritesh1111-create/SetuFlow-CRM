import { NextResponse } from 'next/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const FALLBACK_LOGO = '/logos/setu-flow-logo.svg';

function isAllowedLogoUrl(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  if (raw.startsWith('/')) return true;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET() {
  const workspace = await getWorkspaceAccess();
  const logoUrl = String((workspace.organization as any)?.logo_url ?? '').trim();

  if (!workspace.user || !workspace.membership || !workspace.organization || !isAllowedLogoUrl(logoUrl)) {
    return NextResponse.redirect(new URL(FALLBACK_LOGO, process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.setuflowcrm.com'));
  }

  if (logoUrl.startsWith('/')) {
    return NextResponse.redirect(new URL(logoUrl, process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.setuflowcrm.com'));
  }

  try {
    const upstream = await fetch(logoUrl, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(new URL(FALLBACK_LOGO, process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.setuflowcrm.com'));
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.redirect(new URL(FALLBACK_LOGO, process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.setuflowcrm.com'));
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.redirect(new URL(FALLBACK_LOGO, process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.setuflowcrm.com'));
  }
}
