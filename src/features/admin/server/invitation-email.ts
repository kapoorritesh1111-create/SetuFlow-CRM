import { env } from '@/lib/env';

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

function fromEmail() {
  return process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.MAILTRAP_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? 'help@setugroups.com';
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
  return { from: fromEmail(), subject, text, html };
}

async function sendWithMailtrap(input: InvitationEmailInput): Promise<InvitationEmailResult> {
  const apiKey = process.env.MAILTRAP_API_KEY;
  if (!apiKey) return { ok: false, provider: 'mailtrap', error: 'MAILTRAP_API_KEY is not configured.' };
  const useSandbox = String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true';
  const sandboxId = process.env.MAILTRAP_SANDBOX_ID;
  if (useSandbox && !sandboxId) return { ok: false, provider: 'mailtrap', error: 'MAILTRAP_SANDBOX_ID is required when MAILTRAP_USE_SANDBOX is true.' };
  const endpoint = useSandbox ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(sandboxId ?? '')}` : 'https://send.api.mailtrap.io/api/send';
  const payload = buildPayload(input);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: { email: payload.from, name: 'SETU Flow' }, to: [{ email: input.to, name: input.fullName || undefined }], subject: payload.subject, text: payload.text, html: payload.html }),
  });
  if (!response.ok) return { ok: false, provider: 'mailtrap', error: await response.text() };
  return { ok: true, provider: 'mailtrap' };
}

async function sendWithResend(input: InvitationEmailInput): Promise<InvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, provider: 'resend', error: 'RESEND_API_KEY is not configured.' };
  const payload = buildPayload(input);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: payload.from, to: [input.to], subject: payload.subject, text: payload.text, html: payload.html }),
  });
  if (!response.ok) return { ok: false, provider: 'resend', error: await response.text() };
  return { ok: true, provider: 'resend' };
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<InvitationEmailResult> {
  const provider = (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : process.env.RESEND_API_KEY ? 'resend' : 'mailtrap')).toLowerCase();
  if (provider === 'mailtrap') return sendWithMailtrap(input);
  if (provider === 'resend') return sendWithResend(input);
  return { ok: false, provider, error: `Unsupported SETU_EMAIL_PROVIDER "${provider}". Use "mailtrap" or "resend".` };
}

export function getInvitationEmailEnvironmentSummary() {
  return {
    provider: (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : process.env.RESEND_API_KEY ? 'resend' : 'not_configured')).toLowerCase(),
    from: fromEmail(),
    appUrl: env.appUrl,
    hasMailtrap: Boolean(process.env.MAILTRAP_API_KEY),
    hasResend: Boolean(process.env.RESEND_API_KEY),
  };
}
