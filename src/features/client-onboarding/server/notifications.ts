import { ADMIN_ONBOARDING_EMAIL } from '@/features/client-onboarding/shared';

export type OnboardingNotificationResult = {
  status: 'email_sent' | 'email_failed' | 'email_env_missing';
  error: string | null;
};

export type OnboardingNotificationInput = {
  adminEmail: string;
  companyName: string;
  primaryAdminEmail: string;
  workspaceDomain: string;
  setupUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function getOnboardingAdminEmail() {
  return process.env.SETU_ONBOARDING_ADMIN_EMAIL ?? ADMIN_ONBOARDING_EMAIL;
}

export function getSetuFlowBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SETU_APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, '');
  return 'https://www.setuflowcrm.com';
}

export function buildOnboardingSetupUrl(requestId: string, existingUrl?: string | null) {
  if (existingUrl) return existingUrl;
  return `${getSetuFlowBaseUrl()}/admin/client-onboarding?request=${encodeURIComponent(requestId)}`;
}

export async function sendClientOnboardingAdminNotification(input: OnboardingNotificationInput): Promise<OnboardingNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      status: 'email_env_missing',
      error: 'RESEND_API_KEY and SETU_NOTIFICATION_FROM_EMAIL are required for outbound email notifications.',
    };
  }

  const companyName = escapeHtml(input.companyName);
  const primaryAdminEmail = escapeHtml(input.primaryAdminEmail);
  const workspaceDomain = escapeHtml(input.workspaceDomain);
  const setupUrl = escapeHtml(input.setupUrl);

  const subject = `New Setu Flow onboarding request: ${input.companyName}`;
  const text = [
    'A client submitted the Setu Flow onboarding form.',
    `Company: ${input.companyName}`,
    `First admin email: ${input.primaryAdminEmail}`,
    `Reserved workspace: ${input.workspaceDomain}`,
    `Start setup: ${input.setupUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>New Setu Flow onboarding request</h2>
      <p>A client submitted the Setu Flow onboarding form.</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>First admin email:</strong> ${primaryAdminEmail}</p>
      <p><strong>Reserved workspace:</strong> ${workspaceDomain}</p>
      <p><a href="${setupUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">Start org setup</a></p>
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
    return {
      status: 'email_failed',
      error: error instanceof Error ? error.message : 'Unknown email notification error.',
    };
  }
}
