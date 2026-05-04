import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  ADMIN_ONBOARDING_EMAIL,
  DEFAULT_SETU_FLOW_LOGO,
  buildWorkspaceDomain,
  checked,
  normalizeEmail,
  normalizeList,
  normalizeText,
  slugifyCompanyName,
} from '@/features/client-onboarding/shared';

export const dynamic = 'force-dynamic';

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

async function sendAdminNotification(input: {
  adminEmail: string;
  companyName: string;
  primaryAdminEmail: string;
  workspaceDomain: string;
  setupUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { status: 'email_env_missing', error: 'RESEND_API_KEY and SETU_NOTIFICATION_FROM_EMAIL are required for outbound email notifications.' };
  }

  const subject = `New Setu Flow onboarding request: ${input.companyName}`;
  const text = [
    `A new client submitted the Setu Flow onboarding form.`,
    `Company: ${input.companyName}`,
    `First admin email: ${input.primaryAdminEmail}`,
    `Reserved workspace: ${input.workspaceDomain}`,
    `Start setup: ${input.setupUrl}`,
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>New Setu Flow onboarding request</h2>
      <p><strong>Company:</strong> ${input.companyName}</p>
      <p><strong>First admin email:</strong> ${input.primaryAdminEmail}</p>
      <p><strong>Reserved workspace:</strong> ${input.workspaceDomain}</p>
      <p><a href="${input.setupUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">Start org setup</a></p>
    </div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [input.adminEmail], subject, text, html }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Email provider rejected the notification.');
      return { status: 'email_failed', error: errorText.slice(0, 500) };
    }
    return { status: 'email_sent', error: null };
  } catch (error) {
    return { status: 'email_failed', error: error instanceof Error ? error.message : 'Unknown email notification error.' };
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const companyName = normalizeText(formData.get('company_name'));
  const primaryAdminEmail = normalizeEmail(formData.get('primary_admin_email'));
  if (!companyName || !primaryAdminEmail) {
    return redirectToForm(request, { notice: 'missing-required' });
  }

  const workspaceDomain = buildWorkspaceDomain(companyName);
  const adminEmail = process.env.SETU_ONBOARDING_ADMIN_EMAIL ?? ADMIN_ONBOARDING_EMAIL;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return redirectToReceived(request, { company: companyName, domain: workspaceDomain, notice: 'service-role-missing' });
  }

  const payload = {
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

  const setupUrl = new URL(`/admin/client-onboarding?request=${data.id}`, request.url).toString();
  const notification = await sendAdminNotification({ adminEmail, companyName, primaryAdminEmail, workspaceDomain, setupUrl });

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
