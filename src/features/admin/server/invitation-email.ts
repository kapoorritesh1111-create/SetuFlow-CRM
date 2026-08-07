import { env } from '@/lib/env';
import { getMailtrapFromAddress, getMailtrapProviderSummary, sendMailtrapEmail } from '@/lib/email/mailtrap';

export type InvitationEmailResult = { ok: true; provider: string } | { ok: false; provider: string; error: string };

type InvitationEmailInput = {
  to: string;
  fullName?: string | null;
  organizationName: string;
  acceptUrl: string;
  roleName?: string | null;
  expiresAt?: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
}

function buildPayload(input: InvitationEmailInput) {
  const displayName = input.fullName?.trim() || input.to;
  const subject = `You're invited to ${input.organizationName} on SETU Flow`;
  const expiresText = input.expiresAt ? new Date(input.expiresAt).toLocaleString() : 'the configured expiry time';
  const text = [
    `Hi ${displayName},`,
    '',
    `You've been invited to join ${input.organizationName} on SETU Flow${input.roleName ? ` as ${input.roleName}` : ''}.`,
    `Accept the invitation here: ${input.acceptUrl}`,
    `This link expires on ${expiresText}.`,
    '',
    'If you were not expecting this invitation, you can ignore this email.',
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>Join ${escapeHtml(input.organizationName)} on SETU Flow</h2><p>Hi ${escapeHtml(displayName)},</p><p>You have been invited to join <strong>${escapeHtml(input.organizationName)}</strong>${input.roleName ? ` as <strong>${escapeHtml(input.roleName)}</strong>` : ''}.</p><p><a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:bold">Accept invitation</a></p><p>Or copy this link:<br><span style="word-break:break-all;color:#334155">${escapeHtml(input.acceptUrl)}</span></p><p style="color:#64748b">This link expires on ${escapeHtml(expiresText)}.</p></div>`;
  return { subject, text, html };
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<InvitationEmailResult> {
  const payload = buildPayload(input);
  return sendMailtrapEmail({
    to: input.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    from: getMailtrapFromAddress(),
    fromName: 'SETU Flow',
    category: 'organization_invitation',
  });
}

export function getInvitationEmailEnvironmentSummary() {
  return {
    ...getMailtrapProviderSummary(),
    appUrl: env.appUrl,
    hasResend: false,
  };
}
