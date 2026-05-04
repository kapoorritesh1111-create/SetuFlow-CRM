import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'admin@setugroups.com';
const HELP_EMAIL = 'help@setugroups.com';

function clean(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function getFromAddress() {
  return process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.MAILTRAP_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? HELP_EMAIL;
}

async function sendWithResend(payload: { from: string; subject: string; text: string; html: string }) {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: payload.from, to: [ADMIN_EMAIL], reply_to: HELP_EMAIL, subject: payload.subject, text: payload.text, html: payload.html }),
  });
  if (!response.ok) return { ok: false, error: (await response.text()).slice(0, 500) };
  return { ok: true, error: null };
}

async function sendWithMailtrap(payload: { from: string; subject: string; text: string; html: string }) {
  if (!process.env.MAILTRAP_API_KEY) return { ok: false, error: 'MAILTRAP_API_KEY is not configured.' };
  const useSandbox = String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true';
  const endpoint = useSandbox
    ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(process.env.MAILTRAP_SANDBOX_ID ?? '')}`
    : 'https://send.api.mailtrap.io/api/send';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.MAILTRAP_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: { email: payload.from }, to: [{ email: ADMIN_EMAIL }], subject: payload.subject, text: payload.text, html: payload.html }),
  });
  if (!response.ok) return { ok: false, error: (await response.text()).slice(0, 500) };
  return { ok: true, error: null };
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = clean(formData.get('name'));
  const email = clean(formData.get('email'));
  const company = clean(formData.get('company'));
  const phone = clean(formData.get('phone'));
  const teamSize = clean(formData.get('teamSize'));
  const interest = clean(formData.get('interest'));
  const notes = clean(formData.get('notes'));

  if (!name || !email || !company || !teamSize || !interest) {
    return NextResponse.json({ error: 'Please complete name, email, company, team size, and primary interest.' }, { status: 400 });
  }

  const subject = `Setu Flow demo request: ${company}`;
  const text = [
    'New Setu Flow demo request',
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company}`,
    `Phone/WhatsApp: ${phone || 'Not provided'}`,
    `Team size: ${teamSize}`,
    `Primary interest: ${interest}`,
    `Notes: ${notes || 'Not provided'}`,
    `Reply from: ${HELP_EMAIL}`,
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>New Setu Flow demo request</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Company:</strong> ${escapeHtml(company)}</p><p><strong>Phone/WhatsApp:</strong> ${escapeHtml(phone || 'Not provided')}</p><p><strong>Team size:</strong> ${escapeHtml(teamSize)}</p><p><strong>Primary interest:</strong> ${escapeHtml(interest)}</p><p><strong>Notes:</strong><br>${escapeHtml(notes || 'Not provided')}</p><p style="color:#64748b">Reply from ${HELP_EMAIL}.</p></div>`;
  const payload = { from: getFromAddress(), subject, text, html };
  const provider = (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : 'resend')).toLowerCase();
  const result = provider === 'mailtrap' ? await sendWithMailtrap(payload) : await sendWithResend(payload);

  if (!result.ok) {
    return NextResponse.json({ error: `Request saved in the browser but email delivery is not configured yet: ${result.error}` }, { status: 503 });
  }

  return NextResponse.json({ message: 'Demo request sent to admin@setugroups.com. We will follow up from help@setugroups.com.' });
}
