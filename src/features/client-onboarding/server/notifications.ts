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

type EmailAddress = {
  email: string;
  name?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseEmailAddress(value: string): EmailAddress {
  const match = value.match(/^(.+?)\s*<([^>]+)>$/);
  if (!match) return { email: value.trim() };
  const name = match[1]?.replace(/^['"]|['"]$/g, '').trim();
  return { email: match[2].trim(), ...(name ? { name } : {}) };
}

function parseRecipientList(value: string): EmailAddress[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parseEmailAddress);
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

function buildMessage(input: OnboardingNotificationInput) {
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

  return { subject, text, html };
}

async function sendWithMailtrap(input: OnboardingNotificationInput, fromValue: string): Promise<OnboardingNotificationResult> {
  const apiKey = process.env.MAILTRAP_API_KEY;
  const useSandbox = process.env.MAILTRAP_USE_SANDBOX === 'true';
  const sandboxId = process.env.MAILTRAP_SANDBOX_ID;

  if (!apiKey) {
    return { status: 'email_env_missing', error: 'MAILTRAP_API_KEY is required for Mailtrap onboarding notifications.' };
  }

  if (useSandbox && !sandboxId) {
    return { status: 'email_env_missing', error: 'MAILTRAP_SANDBOX_ID is required when MAILTRAP_USE_SANDBOX is true.' };
  }

  const endpoint = useSandbox
    ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(sandboxId ?? '')}`
    : 'https://send.api.mailtrap.io/api/send';
  const message = buildMessage(input);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: parseEmailAddress(fromValue),
        to: parseRecipientList(input.adminEmail),
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Mailtrap rejected the notification.');
      return { status: 'email_failed', error: errorText.slice(0, 500) };
    }

    return { status: 'email_sent', error: null };
  } catch (error) {
    return {
      status: 'email_failed',
      error: error instanceof Error ? error.message : 'Unknown Mailtrap notification error.',
    };
  }
}

async function sendWithResend(input: OnboardingNotificationInput, fromValue: string): Promise<OnboardingNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { status: 'email_env_missing', error: 'RESEND_API_KEY is required for Resend onboarding notifications.' };
  }

  const message = buildMessage(input);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromValue, to: [input.adminEmail], subject: message.subject, text: message.text, html: message.html }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Resend rejected the notification.');
      return { status: 'email_failed', error: errorText.slice(0, 500) };
    }

    return { status: 'email_sent', error: null };
  } catch (error) {
    return {
      status: 'email_failed',
      error: error instanceof Error ? error.message : 'Unknown Resend notification error.',
    };
  }
}

export async function sendClientOnboardingAdminNotification(input: OnboardingNotificationInput): Promise<OnboardingNotificationResult> {
  const provider = (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : 'resend')).toLowerCase();
  const from = process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.MAILTRAP_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;

  if (!from) {
    return {
      status: 'email_env_missing',
      error: 'SETU_NOTIFICATION_FROM_EMAIL is required for outbound onboarding notifications.',
    };
  }

  if (provider === 'mailtrap') return sendWithMailtrap(input, from);
  if (provider === 'resend') return sendWithResend(input, from);

  return {
    status: 'email_env_missing',
    error: `Unsupported SETU_EMAIL_PROVIDER "${provider}". Use "mailtrap" or "resend".`,
  };
}
