import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

import {
  TRADE_SHOW_TRIAL_MODE,
  getPremiumCapabilityForPathname,
  isPreviewOnlyTrialCapability,
  normalizeTradeShowTrialCapabilityState,
  type TradeShowTrialCapabilityState,
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

function getTrialLockedRedirect(request: NextRequest, capability: TradeShowTrialPreviewCapability) {
  const url = request.nextUrl.clone();
  url.pathname = '/trade-events';
  url.searchParams.set('mode', TRADE_SHOW_TRIAL_MODE);
  url.searchParams.set('locked', capability);
  return url;
}

function shouldRouteLeadQuickCaptureToTrial(request: NextRequest, state: TradeShowTrialCapabilityState | null) {
  if (!state?.isTradeShowTrial) return false;
  if (request.nextUrl.pathname !== '/leads') return false;
  const quickLead = request.nextUrl.searchParams.get('quickLead') === '1';
  const sourceType = request.nextUrl.searchParams.get('sourceType') === 'trade_event';
  const eventId = Boolean(request.nextUrl.searchParams.get('eventId'));
  const tradeMode = request.nextUrl.searchParams.get('mode') === 'buyers' || request.nextUrl.searchParams.get('mode') === 'suppliers';
  return quickLead || sourceType || eventId || tradeMode;
}

function getTrialCaptureRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  const eventId = request.nextUrl.searchParams.get('eventId');
  const sourceLabel = request.nextUrl.searchParams.get('sourceLabel');
  const scan = request.nextUrl.searchParams.get('scan');
  const note = request.nextUrl.searchParams.get('note');
  const mode = request.nextUrl.searchParams.get('mode');

  url.pathname = '/trade-events/capture';
  url.search = '';
  url.searchParams.set('mode', TRADE_SHOW_TRIAL_MODE);
  if (eventId) url.searchParams.set('eventId', eventId);
  if (sourceLabel) url.searchParams.set('sourceLabel', sourceLabel);
  if (scan === 'card') url.searchParams.set('source', 'scan');
  else if (note === 'dictate') url.searchParams.set('source', 'dictate');
  else url.searchParams.set('source', 'type');
  if (mode === 'suppliers') url.searchParams.set('leadType', 'supplier');
  else url.searchParams.set('leadType', 'buyer');
  return url;
}

export async function middleware(request: NextRequest) {
  const capability = getPremiumCapabilityForPathname(request.nextUrl.pathname);
  const needsTrialCheck = Boolean(capability) || request.nextUrl.pathname === '/leads';
  if (!needsTrialCheck) return NextResponse.next();

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

  if (shouldRouteLeadQuickCaptureToTrial(request, state)) {
    return NextResponse.redirect(getTrialCaptureRedirect(request));
  }

  if (!capability || !isPreviewOnlyTrialCapability(state, capability)) return response;

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
    '/api/products/:path*',
    '/api/catalog/:path*',
    '/api/leads/coverage-resolver/:path*',
  ],
};
