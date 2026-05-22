import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';
import {
  DEFAULT_SETU_FLOW_LOGO,
  buildWorkspaceDomain,
  checked,
  normalizeEmail,
  normalizeList,
  normalizeText,
  slugifyCompanyName,
} from '@/features/client-onboarding/shared';
import {
  buildOnboardingSetupUrl,
  getOnboardingAdminEmail,
  sendClientOnboardingAdminNotification,
} from '@/features/client-onboarding/server/notifications';

export const dynamic = 'force-dynamic';

type ClientOnboardingRequestRow = {
  id: string;
  company_name: string;
  company_slug: string;
  workspace_domain: string;
  logo_url: string | null;
  website: string | null;
  primary_admin_name: string | null;
  primary_admin_email: string;
  primary_phone: string | null;
  headquarters_country: string | null;
  requested_markets: string[];
  requested_countries: string[];
  requested_pipelines: string[];
  requested_pipeline_stages: string[];
  requested_next_steps: string[];
  pricing_rules_notes: string | null;
  product_category_notes: string | null;
  additional_notes: string | null;
  wants_trade_events: boolean;
  notification_email: string;
  status: string;
  admin_setup_url: string | null;
  notification_status: string | null;
  notification_error: string | null;
  notification_sent_at: string | null;
  updated_at: string | null;
};

type ClientOnboardingRequestInsert = Omit<
  ClientOnboardingRequestRow,
  'id' | 'admin_setup_url' | 'notification_status' | 'notification_error' | 'notification_sent_at' | 'updated_at'
>;

type ClientOnboardingRequestUpdate = Partial<
  Pick<ClientOnboardingRequestRow, 'admin_setup_url' | 'notification_status' | 'notification_error' | 'notification_sent_at' | 'updated_at'>
>;

type ClientOnboardingDatabase = {
  public: {
    Tables: {
      client_onboarding_requests: {
        Row: ClientOnboardingRequestRow;
        Insert: ClientOnboardingRequestInsert;
        Update: ClientOnboardingRequestUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

function createClientOnboardingAdminClient() {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  return admin as unknown as SupabaseClient<ClientOnboardingDatabase>;
}

function redirectToReceived(request: NextRequest, params: Record<string, string | null | undefined>) {
  const url = new URL('/onboarding/received', request.url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url, { status: 303 });
}

function redirectToForm(request: NextRequest, params: Record<string, string | null | undefined>) {
  const url = new URL('/onboarding', request.url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('client-onboarding', request), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return redirectToForm(request, { notice: 'too-many-submissions' });
  }

  const formData = await request.formData();
  const companyName = normalizeText(formData.get('company_name'));
  const primaryAdminEmail = normalizeEmail(formData.get('primary_admin_email'));
  if (!companyName || !primaryAdminEmail) {
    return redirectToForm(request, { notice: 'missing-required' });
  }

  const workspaceDomain = buildWorkspaceDomain(companyName);
  const adminEmail = getOnboardingAdminEmail();
  const admin = createClientOnboardingAdminClient();
  if (!admin) {
    return redirectToReceived(request, { company: companyName, domain: workspaceDomain, notice: 'service-role-missing' });
  }

  const payload: ClientOnboardingRequestInsert = {
    company_name: companyName,
    company_slug: slugifyCompanyName(companyName),
    workspace_domain: workspaceDomain,
    logo_url: normalizeText(formData.get('logo_url')) ?? DEFAULT_SETU_FLOW_LOGO,
    website: normalizeText(formData.get('website')),
    primary_admin_name: normalizeText(formData.get('primary_admin_name')),
    primary_admin_email: primaryAdminEmail,
    primary_phone: normalizeText(formData.get('primary_phone')),
    headquarters_country: normalizeText(formData.get('headquarters_country')),
    requested_markets: normalizeList(formData.get('requested_markets')),
    requested_countries: normalizeList(formData.get('requested_countries')),
    requested_pipelines: normalizeList(formData.get('requested_pipelines')),
    requested_pipeline_stages: normalizeList(formData.get('requested_pipeline_stages')),
    requested_next_steps: normalizeList(formData.get('requested_next_steps')),
    pricing_rules_notes: normalizeText(formData.get('pricing_rules_notes')),
    product_category_notes: normalizeText(formData.get('product_category_notes')),
    additional_notes: normalizeText(formData.get('additional_notes')),
    wants_trade_events: checked(formData, 'wants_trade_events'),
    notification_email: adminEmail,
    status: 'submitted',
  };

  const { data, error } = await admin.from('client_onboarding_requests').insert(payload).select('id').single();
  if (error || !data?.id) {
    return redirectToReceived(request, { company: companyName, domain: workspaceDomain, notice: 'storage-pending' });
  }

  const setupUrl = buildOnboardingSetupUrl(data.id, new URL(`/admin/client-onboarding?request=${data.id}`, request.url).toString());
  const notification = await sendClientOnboardingAdminNotification({ adminEmail, companyName, primaryAdminEmail, workspaceDomain, setupUrl });

  await admin
    .from('client_onboarding_requests')
    .update({
      admin_setup_url: setupUrl,
      notification_status: notification.status,
      notification_error: notification.error,
      notification_sent_at: notification.status === 'email_sent' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  return redirectToReceived(request, {
    company: companyName,
    domain: workspaceDomain,
    notice: notification.status === 'email_sent' ? 'submitted-notified' : 'submitted-notification-pending',
  });
}
