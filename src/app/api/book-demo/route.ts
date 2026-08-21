import { NextResponse, type NextRequest } from 'next/server';
import { getMailtrapFromAddress, sendMailtrapEmail } from '@/lib/email/mailtrap';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'admin@setugroups.com';
const HELP_EMAIL = 'help@setugroups.com';
const SEARCH_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'ecosia.', 'brave.'];
const SOCIAL_HOSTS = ['linkedin.', 'facebook.', 'instagram.', 'x.com', 'twitter.', 't.co', 'youtube.'];

function clean(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function classifyAttribution(source: string, medium: string, referrer: string, gclid: string) {
  const sourceLower = source.toLowerCase();
  const mediumLower = medium.toLowerCase();
  const referrerHost = hostOf(referrer);
  if (gclid || /(cpc|ppc|paid|ads?)/.test(mediumLower) || ['googleads', 'google_ads', 'bingads'].includes(sourceLower)) return 'paid_search';
  if (mediumLower === 'organic' || SEARCH_HOSTS.some((host) => referrerHost.includes(host))) return 'organic_search';
  if (/(social|linkedin|facebook|instagram|twitter|youtube)/.test(`${sourceLower} ${mediumLower}`) || SOCIAL_HOSTS.some((host) => referrerHost.includes(host))) return 'social';
  if (referrerHost && !referrerHost.endsWith('setuflowcrm.com')) return 'referral';
  if (sourceLower || mediumLower) return 'campaign';
  return 'direct';
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
  const preferredSlot = clean(formData.get('preferredSlot'));
  const landingPage = clean(formData.get('firstTouchLandingPage')) || clean(formData.get('conversionPage')) || '/book-demo';
  const referrer = clean(formData.get('firstTouchReferrer'));
  const utmSource = clean(formData.get('utmSource'));
  const utmMedium = clean(formData.get('utmMedium'));
  const utmCampaign = clean(formData.get('utmCampaign'));
  const utmContent = clean(formData.get('utmContent'));
  const utmTerm = clean(formData.get('utmTerm'));
  const gclid = clean(formData.get('gclid'));
  const attributionCapturedAt = clean(formData.get('attributionCapturedAt'));
  const channel = classifyAttribution(utmSource, utmMedium, referrer, gclid);

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
    `Preferred slot: ${preferredSlot || 'Not selected'}`,
    `Notes: ${notes || 'Not provided'}`,
    '',
    'Marketing attribution',
    `Channel: ${channel}`,
    `First landing page: ${landingPage || 'Unknown'}`,
    `Referrer: ${referrer || 'Direct / unavailable'}`,
    `UTM: ${[utmSource, utmMedium, utmCampaign].filter(Boolean).join(' / ') || 'None'}`,
    `Reply from: ${HELP_EMAIL}`,
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>New Setu Flow demo request</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Company:</strong> ${escapeHtml(company)}</p><p><strong>Phone/WhatsApp:</strong> ${escapeHtml(phone || 'Not provided')}</p><p><strong>Team size:</strong> ${escapeHtml(teamSize)}</p><p><strong>Primary interest:</strong> ${escapeHtml(interest)}</p><p><strong>Preferred slot:</strong> ${escapeHtml(preferredSlot || 'Not selected')}</p><p><strong>Notes:</strong><br>${escapeHtml(notes || 'Not provided')}</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p><strong>Marketing channel:</strong> ${escapeHtml(channel)}</p><p><strong>First landing page:</strong> ${escapeHtml(landingPage || 'Unknown')}</p><p><strong>Referrer:</strong> ${escapeHtml(referrer || 'Direct / unavailable')}</p><p><strong>UTM:</strong> ${escapeHtml([utmSource, utmMedium, utmCampaign].filter(Boolean).join(' / ') || 'None')}</p><p style="color:#64748b">Reply from ${HELP_EMAIL}.</p></div>`;

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

  try {
    // This table is introduced by the same release. Keep access behind the
    // service-role client until generated DB types are refreshed post-migration.
    const admin = createAdminSupabaseClient() as any;
    if (admin) {
      const { error } = await admin.from('marketing_conversion_events').insert({
        event_name: 'demo_request',
        channel,
        landing_page: landingPage || null,
        conversion_page: clean(formData.get('conversionPage')) || '/book-demo',
        referrer: referrer || null,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        utm_term: utmTerm || null,
        gclid: gclid || null,
        visitor_email: email,
        company_name: company,
        metadata: {
          teamSize,
          interest,
          preferredSlot: preferredSlot || null,
          attributionCapturedAt: attributionCapturedAt || null,
        },
      });
      if (error) console.warn('[book-demo] marketing attribution insert failed', error.message);
    }
  } catch (error) {
    console.warn('[book-demo] marketing attribution unavailable', error);
  }

  return NextResponse.json({ message: 'Demo request sent to admin@setugroups.com. We will follow up from help@setugroups.com.' });
}
