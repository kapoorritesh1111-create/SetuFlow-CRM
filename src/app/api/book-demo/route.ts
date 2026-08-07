import { NextResponse, type NextRequest } from 'next/server';
import { getMailtrapFromAddress, sendMailtrapEmail } from '@/lib/email/mailtrap';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'admin@setugroups.com';
const HELP_EMAIL = 'help@setugroups.com';

function clean(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
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

  const result = await sendMailtrapEmail({
    from: getMailtrapFromAddress(),
    fromName: 'SETU Flow',
    to: ADMIN_EMAIL,
    replyTo: email || HELP_EMAIL,
    subject,
    text,
    html,
    category: 'demo_request',
  });

  if (!result.ok) {
    return NextResponse.json({ error: `Request saved in the browser but Mailtrap delivery is unavailable: ${result.error}` }, { status: 503 });
  }

  return NextResponse.json({ message: 'Demo request sent to admin@setugroups.com. We will follow up from help@setugroups.com.' });
}
