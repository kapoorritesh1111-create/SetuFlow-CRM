import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

import {
  TRADE_SHOW_TRIAL_MODE,
  getPremiumCapabilityForPathname,
  isPreviewOnlyTrialCapability,
  normalizeTradeShowTrialCapabilityState,
} from '@/lib/trial/trade-show-trial-capabilities';

type TrialCapabilityRow = {
  organization_id: string | null;
  trial_mode: string | null;
  active_capabilities: string[] | null;
  preview_capabilities: string[] | null;
  allow_exports: boolean | null;
  allow_premium: boolean | null;
};

type MiddlewareCookieUpdate = {
  name: string;
  value: string;
  options: CookieOptions;
};

function readMetadataOrganizationId(user: User) {
  const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
  const appMetadata = user.app_metadata as Record<string, unknown> | undefined;
  const userMetadataOrg = String(userMetadata?.active_organization_id ?? '').trim();
  const appMetadataOrg = String(appMetadata?.active_organization_id ?? '').trim();
  return userMetadataOrg || appMetadataOrg || null;
}

function readActiveOrganizationCookie(request: NextRequest, user: User) {
  const raw = request.cookies.get('setuflow_active_organization_id')?.value?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as { userId?: unknown; organizationId?: unknown; orgId?: unknown };
    const cookieUserId = String(parsed.userId ?? '').trim();
    const organizationId = String(parsed.organizationId ?? parsed.orgId ?? '').trim();
    if (!organizationId) return null;
    if (cookieUserId && cookieUserId !== user.id) return null;
    return organizationId;
  } catch {
    return raw;
  }
}

function isTrialPreviewReadRoute(request: NextRequest) {
  if (request.method !== 'GET') return false;
  const pathname = request.nextUrl.pathname;
  if (/^\/api\/quotes\/[^/]+\/pdf$/.test(pathname)) return true;
  if (pathname === '/api/products/spreadsheet') return true;
  if (/^\/api\/products\/[^/]+$/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  if (isTrialPreviewReadRoute(request)) return NextResponse.next();

  const capability = getPremiumCapabilityForPathname(request.nextUrl.pathname);
  if (!capability) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: MiddlewareCookieUpdate[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return response;

  const organizationId = readActiveOrganizationCookie(request, auth.user) ?? readMetadataOrganizationId(auth.user);
  if (!organizationId) return response;

  const { data } = await supabase
    .from('organization_trial_capabilities')
    .select('organization_id, trial_mode, active_capabilities, preview_capabilities, allow_exports, allow_premium')
    .eq('organization_id', organizationId)
    .eq('trial_mode', TRADE_SHOW_TRIAL_MODE)
    .maybeSingle();

  const state = normalizeTradeShowTrialCapabilityState(organizationId, data as TrialCapabilityRow | null);

  if (!isPreviewOnlyTrialCapability(state, capability)) return response;

  return NextResponse.json(
    {
      error: 'upgrade_required',
      module: capability,
      title: 'Preview-only trial space',
      message: 'Catalog mapping available after upgrade.',
    },
    { status: 403 },
  );
}

export const config = {
  matcher: [
    '/api/quotes/:path*',
    '/api/orders/:path*',
    '/api/products/:path*',
    '/api/catalog/:path*',
    '/api/leads/coverage-resolver/:path*',
  ],
};
