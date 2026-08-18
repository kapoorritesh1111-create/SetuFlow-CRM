import { ADMIN_ONBOARDING_EMAIL } from '@/features/client-onboarding/shared';
import { getMailtrapFromAddress, sendMailtrapEmail } from '@/lib/email/mailtrap';

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
  return getMailtrapFromAddress();
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

export async function sendTransactionalEmail(email: TransactionalEmail): Promise<OnboardingNotificationResult> {
  const result = await sendMailtrapEmail({
    from: email.from,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    fromName: 'SETU Flow',
    category: 'client_onboarding',
  });

  if (result.ok) return { status: 'email_sent', error: null };
  if (result.error.includes('MAILTRAP_API_KEY') || result.error.includes('MAILTRAP_SANDBOX_ID')) {
    return { status: 'email_env_missing', error: result.error };
  }
  return { status: 'email_failed', error: result.error };
}

export async function sendClientOnboardingAdminNotification(input: OnboardingNotificationInput): Promise<OnboardingNotificationResult> {
  return sendTransactionalEmail({
    from: getSetuNotificationFromAddress(),
    to: input.adminEmail,
    ...buildAdminNotificationMessage(input),
  });
}

export async function sendFirstAdminInviteEmail(input: FirstAdminInviteEmailInput): Promise<OnboardingNotificationResult> {
  return sendTransactionalEmail({
    from: getSetuNotificationFromAddress(),
    to: input.toEmail,
    ...buildFirstAdminInviteMessage(input),
  });
}
