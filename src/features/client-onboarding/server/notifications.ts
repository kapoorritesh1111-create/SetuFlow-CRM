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

export type FirstAdminInviteEmailInput = {
  toEmail: string;
  companyName: string;
  workspaceDomain: string;
  acceptUrl: string;
  roleName?: string | null;
  expiresAt?: string | null;
};

type EmailAddress = {
  email: string;
  name?: string;
};

export type TransactionalEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
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
  const name = match[1]?.replace(/^[ '\"]|[ '\"]$/g, '').trim();
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

export function getSetuNotificationFromAddress() {
  return process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.MAILTRAP_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;
}

function buildAdminNotificationMessage(input: OnboardingNotificationInput) {
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

function buildFirstAdminInviteMessage(input: FirstAdminInviteEmailInput) {
  const companyName = escapeHtml(input.companyName);
  const workspaceDomain = escapeHtml(input.workspaceDomain);
  const acceptUrl = escapeHtml(input.acceptUrl);
  const roleName = escapeHtml(input.roleName || 'owner');
  const expiresAt = input.expiresAt ? escapeHtml(new Date(input.expiresAt).toLocaleString()) : '14 days';

  const subject = `Set up your ${input.companyName} Setu Flow workspace`;
  const text = [
    `You have been invited as ${input.roleName || 'owner'} for ${input.companyName} on Setu Flow.`,
    `Workspace: ${input.workspaceDomain}`,
    `Create your account and accept invite: ${input.acceptUrl}`,
    `This invitation expires: ${input.expiresAt || 'in 14 days'}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>Your Setu Flow workspace is ready</h2>
      <p>You have been invited as <strong>${roleName}</strong> for <strong>${companyName}</strong>.</p>
      <p><strong>Workspace:</strong> ${workspaceDomain}</p>
      <p>Create your account, set your password, and enter your workspace using the secure invitation link below.</p>
      <p><a href="${acceptUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">Create account and accept invite</a></p>
      <p style="font-size:13px;color:#64748b">This invitation expires: ${expiresAt}</p>
    </div>`;

  return { subject, text, html };
}

async function sendWithMailtrap(email: TransactionalEmail): Promise<OnboardingNotificationResult> {
  const apiKey = process.env.MAILTRAP_API_KEY;
  const useSandbox = String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true';
  const sandboxId = process.env.MAILTRAP_SANDBOX_ID;

  if (!apiKey) {
    return { status: 'email_env_missing', error: 'MAILTRAP_API_KEY is required for Mailtrap notifications.' };
  }

  if (useSandbox && !sandboxId) {
    return { status: 'email_env_missing', error: 'MAILTRAP_SANDBOX_ID is required when MAILTRAP_USE_SANDBOX is true.' };
  }

  const endpoint = useSandbox
    ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(sandboxId ?? '')}`
    : 'https://send.api.mailtrap.io/api/send';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: parseEmailAddress(email.from),
        to: parseRecipientList(email.to),
        subject: email.subject,
        text: email.text,
        html: email.html,
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

async function sendWithResend(email: TransactionalEmail): Promise<OnboardingNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { status: 'email_env_missing', error: 'RESEND_API_KEY is required for Resend notifications.' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: email.from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
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

export async function sendTransactionalEmail(email: TransactionalEmail): Promise<OnboardingNotificationResult> {
  const provider = (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : 'resend')).toLowerCase();

  if (provider === 'mailtrap') return sendWithMailtrap(email);
  if (provider === 'resend') return sendWithResend(email);

  return {
    status: 'email_env_missing',
    error: `Unsupported SETU_EMAIL_PROVIDER "${provider}". Use "mailtrap" or "resend".`,
  };
}

export async function sendClientOnboardingAdminNotification(input: OnboardingNotificationInput): Promise<OnboardingNotificationResult> {
  const from = getSetuNotificationFromAddress();

  if (!from) {
    return {
      status: 'email_env_missing',
      error: 'SETU_NOTIFICATION_FROM_EMAIL is required for outbound onboarding notifications.',
    };
  }

  return sendTransactionalEmail({ from, to: input.adminEmail, ...buildAdminNotificationMessage(input) });
}

export async function sendFirstAdminInviteEmail(input: FirstAdminInviteEmailInput): Promise<OnboardingNotificationResult> {
  const from = getSetuNotificationFromAddress();

  if (!from) {
    return {
      status: 'email_env_missing',
      error: 'SETU_NOTIFICATION_FROM_EMAIL is required for outbound first-admin invitations.',
    };
  }

  return sendTransactionalEmail({ from, to: input.toEmail, ...buildFirstAdminInviteMessage(input) });
}
