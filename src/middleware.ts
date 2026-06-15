import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

import {
  TRADE_SHOW_TRIAL_MODE,
  getPremiumCapabilityForPathname,
  isPreviewOnlyTrialCapability,
  normalizeTradeShowTrialCapabilityState,
  type TradeShowTrialPreviewCapability,
} from '@/lib/trial/trade-show-trial-capabilities';

type TrialCapabilityRow = {
  organization_id: string | null;
  trial_mode: string | null;
  active_capabilities: string[] | null;
  preview_capabilities: string[] | null;
  allow_exports: boolean | null;
  allow_premium: boolean | null;
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

function getTrialLockedRedirect(request: NextRequest, capability: TradeShowTrialPreviewCapability) {
  const url = request.nextUrl.clone();
  url.pathname = '/trade-events';
  url.searchParams.set('mode', TRADE_SHOW_TRIAL_MODE);
  url.searchParams.set('locked', capability);
  return url;
}

export async function middleware(request: NextRequest) {
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
      setAll(cookiesToSet) {
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
    .maybeSingle<TrialCapabilityRow>();

  const state = normalizeTradeShowTrialCapabilityState(organizationId, data);
  if (!isPreviewOnlyTrialCapability(state, capability)) return response;

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: 'available_after_upgrade',
        module: capability,
        message: 'This Trade Show Trial workspace can preview this module after upgrade, but cannot use the live premium endpoint.',
      },
      { status: 403 },
    );
  }

  return NextResponse.redirect(getTrialLockedRedirect(request, capability));
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/leads/:path*',
    '/quotes/:path*',
    '/orders/:path*',
    '/api/quotes/:path*',
    '/api/orders/:path*',
  ],
};
