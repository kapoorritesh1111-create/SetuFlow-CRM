import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'admin@setugroups.com';
const HELP_EMAIL = 'help@setugroups.com';

type NextStep = 'report_only' | 'book_demo' | 'request_trial';

type RoiRequest = {
  contact?: {
    fullName?: string;
    email?: string;
    companyName?: string;
    phone?: string;
    role?: string;
    mainPainPoint?: string;
    nextStep?: NextStep;
  };
  inputs?: {
    people?: number;
    leadsCaptured?: number;
    leadsLost?: number;
    weeklyChaseHours?: number;
    recoveredLeadValue?: number;
    plan?: 'starter' | 'growth';
    hourlyCost?: number;
    timeReductionRate?: number;
    leadRecoveryRate?: number;
  };
};

const PLANS = {
  starter: { name: 'Starter', price: 199, users: 'Up to 5 users' },
  growth: { name: 'Growth', price: 499, users: 'Up to 10 users' },
} as const;

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.setuflowcrm.com').replace(/\/$/, '');
}

function getFromAddress() {
  return process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.MAILTRAP_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? HELP_EMAIL;
}

function nextStepLabel(nextStep: NextStep) {
  if (nextStep === 'book_demo') return 'Book a demo with these numbers';
  if (nextStep === 'request_trial') return 'Request trial access';
  return 'Send report only';
}

function recommendedSalesAngle(painPoint: string) {
  const pain = painPoint || 'missed follow-ups';
  return `Lead with ${pain}. Use the ROI estimate as the discovery opener, then map their lead capture, follow-up ownership, quote workflow, document readiness, and order handoff into SETU Flow.`;
}

async function sendWithResend(payload: { to: string[]; bcc?: string[]; replyTo?: string; from: string; subject: string; text: string; html: string }) {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: payload.from,
      to: payload.to,
      bcc: payload.bcc,
      reply_to: payload.replyTo ?? HELP_EMAIL,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });
  if (!response.ok) return { ok: false, error: (await response.text()).slice(0, 500) };
  return { ok: true, error: null };
}

async function sendWithMailtrap(payload: { to: string[]; bcc?: string[]; replyTo?: string; from: string; subject: string; text: string; html: string }) {
  if (!process.env.MAILTRAP_API_KEY) return { ok: false, error: 'MAILTRAP_API_KEY is not configured.' };
  const useSandbox = String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true';
  const endpoint = useSandbox
    ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(process.env.MAILTRAP_SANDBOX_ID ?? '')}`
    : 'https://send.api.mailtrap.io/api/send';
  const body: Record<string, unknown> = {
    from: { email: payload.from },
    to: payload.to.map((email) => ({ email })),
    bcc: payload.bcc?.map((email) => ({ email })),
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  };
  if (payload.replyTo) body.reply_to = { email: payload.replyTo };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.MAILTRAP_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return { ok: false, error: (await response.text()).slice(0, 500) };
  return { ok: true, error: null };
}

async function sendEmail(payload: { to: string[]; bcc?: string[]; replyTo?: string; subject: string; text: string; html: string }) {
  const emailPayload = { ...payload, from: getFromAddress() };
  const provider = (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : 'resend')).toLowerCase();
  return provider === 'mailtrap' ? sendWithMailtrap(emailPayload) : sendWithResend(emailPayload);
}

function buildUserEmail(data: {
  firstName: string;
  fullName: string;
  companyName: string;
  nextStep: NextStep;
  painPoint: string;
  planName: string;
  planCost: number;
  people: number;
  leadsCaptured: number;
  leadsLost: number;
  weeklyChaseHours: number;
  recoveredLeadValue: number;
  hourlyCost: number;
  timeReductionRate: number;
  leadRecoveryRate: number;
  monthlyTimeSavings: number;
  leadsRecovered: number;
  recoveredLeadValueTotal: number;
  monthlyImpact: number;
  netMonthlyImpact: number;
  paybackMonths: number;
}) {
  const demoLink = `${baseUrl()}/book-demo?source=roi-calculator&intent=demo`;
  const trialLink = `${baseUrl()}/book-demo?source=roi-calculator&intent=trial-onboarding`;
  const headline = data.nextStep === 'request_trial' ? 'Your SETU Flow trial setup request is received' : 'Your SETU Flow ROI estimate is ready';
  const primaryCta = data.nextStep === 'request_trial' ? 'Start Trial Onboarding' : 'Book Demo With My ROI';
  const primaryLink = data.nextStep === 'request_trial' ? trialLink : demoLink;

  const text = [
    `Hi ${data.firstName},`,
    '',
    headline,
    '',
    `Estimated monthly impact: ${money(data.monthlyImpact)}`,
    `Estimated recovered leads/month: ${number(data.leadsRecovered)}`,
    `Estimated monthly time savings: ${money(data.monthlyTimeSavings)}`,
    `Selected plan: ${data.planName} (${money(data.planCost)}/month)`,
    `Estimated payback: ${data.paybackMonths > 0 && data.paybackMonths < 1 ? 'Less than 1 month' : `${number(data.paybackMonths)} months`}`,
    '',
    'Your inputs:',
    `People following up: ${data.people}`,
    `Leads captured/month: ${data.leadsCaptured}`,
    `Leads lost or missed/month: ${data.leadsLost}`,
    `Team hours chasing leads/week: ${data.weeklyChaseHours}`,
    `Average value per recovered lead: ${money(data.recoveredLeadValue)}`,
    '',
    data.nextStep === 'request_trial'
      ? `Trial onboarding link: ${trialLink}`
      : `Book a demo with these numbers: ${demoLink}`,
    `Request trial access: ${trialLink}`,
    '',
    'This is a directional estimate based on your inputs and assumptions. Actual results depend on your lead quality, team behavior, margins, and implementation quality.',
    '',
    'Regards,',
    'SETU Flow Team',
  ].join('\n');

  const html = `
  <div style="margin:0;padding:0;background:#f6f9fc;font-family:Inter,Arial,sans-serif;color:#0f172a">
    <div style="max-width:720px;margin:0 auto;padding:28px 16px">
      <div style="background:#ffffff;border:1px solid #dbe7f3;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,.08)">
        <div style="padding:28px 30px;border-bottom:1px solid #e5eef7;display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
          <div>
            <div style="font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#108477">SETU Flow CRM</div>
            <h1 style="margin:10px 0 0;font-size:30px;line-height:1.1;color:#071232">${escapeHtml(headline)}</h1>
          </div>
          <div style="font-size:12px;color:#64748b;text-align:right">Trade Execution CRM<br/>for Import-Export Teams</div>
        </div>
        <div style="padding:26px 30px">
          <p style="margin:0 0 18px;line-height:1.65;color:#334155">Hi ${escapeHtml(data.firstName)}, thanks for using the SETU Flow ROI Calculator. Based on the numbers you entered, your estimated monthly impact from better lead follow-up, reduced manual chasing, and recovered opportunities is:</p>
          <div style="background:linear-gradient(135deg,#06263f,#071232);border-radius:20px;padding:26px;color:#fff;text-align:center">
            <div style="font-size:13px;opacity:.75;font-weight:700">Estimated monthly impact</div>
            <div style="font-size:42px;line-height:1.1;font-weight:900;margin-top:6px">${money(data.monthlyImpact)} <span style="font-size:18px;font-weight:700;opacity:.75">/ month</span></div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px;text-align:left">
              <div style="border-left:1px solid rgba(255,255,255,.16);padding-left:12px"><div style="font-size:20px;font-weight:900">${number(data.leadsRecovered)}</div><div style="font-size:11px;opacity:.72">Recovered leads/month</div></div>
              <div style="border-left:1px solid rgba(255,255,255,.16);padding-left:12px"><div style="font-size:20px;font-weight:900">${money(data.monthlyTimeSavings)}</div><div style="font-size:11px;opacity:.72">Monthly time savings</div></div>
              <div style="border-left:1px solid rgba(255,255,255,.16);padding-left:12px"><div style="font-size:20px;font-weight:900">${money(data.recoveredLeadValueTotal)}</div><div style="font-size:11px;opacity:.72">Recovered lead value</div></div>
              <div style="border-left:1px solid rgba(255,255,255,.16);padding-left:12px"><div style="font-size:20px;font-weight:900">${data.paybackMonths > 0 && data.paybackMonths < 1 ? 'Less than 1' : number(data.paybackMonths)}</div><div style="font-size:11px;opacity:.72">Month payback</div></div>
            </div>
          </div>
          <div style="margin-top:22px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
            <div style="background:#f8fafc;padding:14px 18px;font-weight:900">Your inputs</div>
            ${[
              ['People following up on leads', String(data.people)],
              ['Leads captured per month', String(data.leadsCaptured)],
              ['Leads lost or missed per month', String(data.leadsLost)],
              ['Team hours chasing leads per week', String(data.weeklyChaseHours)],
              ['Average value per recovered lead', money(data.recoveredLeadValue)],
              ['Selected plan', `${data.planName} (${money(data.planCost)}/month)`],
            ].map(([label, value]) => `<div style="display:flex;justify-content:space-between;gap:18px;padding:12px 18px;border-top:1px solid #edf2f7"><span style="color:#64748b">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
          </div>
          <div style="margin-top:22px;background:#effaf7;border:1px solid #caeee3;border-radius:18px;padding:18px">
            <div style="font-weight:900;color:#065f46">Recommended next step</div>
            <p style="margin:8px 0 0;line-height:1.6;color:#334155">${data.nextStep === 'request_trial' ? 'Your trial setup request is ready for onboarding. Use the link below so the SETU Flow team can collect the setup details needed to activate your trial workspace.' : 'Book a workflow demo and we will map this estimate to your actual trade workflow, including lead capture, follow-ups, quote control, document readiness, and order execution.'}</p>
            <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
              <a href="${primaryLink}" style="background:#108477;color:#fff;text-decoration:none;border-radius:12px;padding:12px 16px;font-weight:900">${primaryCta}</a>
              <a href="${trialLink}" style="background:#fff;color:#0f172a;text-decoration:none;border:1px solid #cbd5e1;border-radius:12px;padding:12px 16px;font-weight:900">Request Trial Access</a>
            </div>
          </div>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b">This is a directional estimate. SETU Flow does not guarantee revenue recovery or savings. Actual results depend on lead quality, internal process, user adoption, margins, and implementation quality.</p>
          <p style="margin:22px 0 0;line-height:1.6;color:#334155">Regards,<br/><strong>SETU Flow Team</strong></p>
        </div>
      </div>
    </div>
  </div>`;
  return { text, html, subject: headline };
}

function buildAdminEmail(data: {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  phone: string;
  role: string;
  painPoint: string;
  nextStep: NextStep;
  planName: string;
  people: number;
  leadsCaptured: number;
  leadsLost: number;
  weeklyChaseHours: number;
  recoveredLeadValue: number;
  monthlyTimeSavings: number;
  leadsRecovered: number;
  monthlyImpact: number;
  netMonthlyImpact: number;
  paybackMonths: number;
}) {
  const subject = `New ROI Calculator Lead — ${data.companyName}`;
  const text = [
    'New ROI Calculator Lead',
    '',
    `Lead ID: ${data.id}`,
    `Name: ${data.fullName}`,
    `Company: ${data.companyName}`,
    `Email: ${data.email}`,
    `Phone/WhatsApp: ${data.phone || 'Not provided'}`,
    `Role: ${data.role || 'Not provided'}`,
    '',
    `Requested next step: ${nextStepLabel(data.nextStep)}`,
    `Main workflow pain: ${data.painPoint || 'Not provided'}`,
    `Selected plan: ${data.planName}`,
    '',
    `Estimated monthly impact: ${money(data.monthlyImpact)}`,
    `Net monthly impact: ${money(data.netMonthlyImpact)}`,
    `Estimated payback: ${data.paybackMonths > 0 && data.paybackMonths < 1 ? 'Less than 1 month' : `${number(data.paybackMonths)} months`}`,
    `Recovered leads/month: ${number(data.leadsRecovered)}`,
    `Monthly time savings: ${money(data.monthlyTimeSavings)}`,
    '',
    `Sales angle: ${recommendedSalesAngle(data.painPoint)}`,
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>New ROI Calculator Lead</h2><p><strong>Lead ID:</strong> ${escapeHtml(data.id)}</p><h3>Contact</h3><p><strong>Name:</strong> ${escapeHtml(data.fullName)}<br/><strong>Company:</strong> ${escapeHtml(data.companyName)}<br/><strong>Email:</strong> ${escapeHtml(data.email)}<br/><strong>Phone/WhatsApp:</strong> ${escapeHtml(data.phone || 'Not provided')}<br/><strong>Role:</strong> ${escapeHtml(data.role || 'Not provided')}</p><h3>Intent</h3><p><strong>Requested next step:</strong> ${escapeHtml(nextStepLabel(data.nextStep))}<br/><strong>Main workflow pain:</strong> ${escapeHtml(data.painPoint || 'Not provided')}<br/><strong>Selected plan:</strong> ${escapeHtml(data.planName)}</p><h3>ROI Estimate</h3><p><strong>Estimated monthly impact:</strong> ${money(data.monthlyImpact)}<br/><strong>Net monthly impact:</strong> ${money(data.netMonthlyImpact)}<br/><strong>Estimated payback:</strong> ${data.paybackMonths > 0 && data.paybackMonths < 1 ? 'Less than 1 month' : `${number(data.paybackMonths)} months`}<br/><strong>Recovered leads/month:</strong> ${number(data.leadsRecovered)}<br/><strong>Monthly time savings:</strong> ${money(data.monthlyTimeSavings)}</p><h3>User Inputs</h3><p><strong>People following up:</strong> ${data.people}<br/><strong>Leads captured/month:</strong> ${data.leadsCaptured}<br/><strong>Leads lost/month:</strong> ${data.leadsLost}<br/><strong>Team hours chasing leads/week:</strong> ${data.weeklyChaseHours}<br/><strong>Average value per recovered lead:</strong> ${money(data.recoveredLeadValue)}</p><p><strong>Recommended sales angle:</strong><br/>${escapeHtml(recommendedSalesAngle(data.painPoint))}</p></div>`;
  return { subject, text, html };
}

export async function POST(request: NextRequest) {
  let body: RoiRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const contact = body.contact ?? {};
  const input = body.inputs ?? {};
  const fullName = clean(contact.fullName);
  const email = clean(contact.email).toLowerCase();
  const companyName = clean(contact.companyName);
  const phone = clean(contact.phone);
  const role = clean(contact.role);
  const painPoint = clean(contact.mainPainPoint);
  const nextStep: NextStep = contact.nextStep === 'book_demo' || contact.nextStep === 'request_trial' ? contact.nextStep : 'report_only';

  if (!fullName || !email || !companyName) {
    return NextResponse.json({ error: 'Please provide full name, work email, and company name.' }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Please provide a valid work email.' }, { status: 400 });
  }

  const planKey = input.plan === 'starter' ? 'starter' : 'growth';
  const plan = PLANS[planKey];
  const people = Math.round(toNumber(input.people, 0));
  const leadsCaptured = Math.round(toNumber(input.leadsCaptured, 0));
  const leadsLost = Math.round(toNumber(input.leadsLost, 0));
  const weeklyChaseHours = toNumber(input.weeklyChaseHours, 0);
  const recoveredLeadValue = toNumber(input.recoveredLeadValue, 0);
  const hourlyCost = toNumber(input.hourlyCost, 25);
  const timeReductionRate = toNumber(input.timeReductionRate, 35);
  const leadRecoveryRate = toNumber(input.leadRecoveryRate, 25);

  const monthlyTimeSavings = weeklyChaseHours * 4.33 * hourlyCost * (timeReductionRate / 100);
  const leadsRecovered = leadsLost * (leadRecoveryRate / 100);
  const recoveredLeadValueTotal = leadsRecovered * recoveredLeadValue;
  const monthlyImpact = monthlyTimeSavings + recoveredLeadValueTotal;
  const planCost = plan.price;
  const netMonthlyImpact = monthlyImpact - planCost;
  const paybackMonths = monthlyImpact > 0 ? planCost / monthlyImpact : 0;

  const db = createServiceRoleClient();
  if (!db) {
    return NextResponse.json({ error: 'Lead capture is not configured yet. SUPABASE_SERVICE_ROLE_KEY is missing.' }, { status: 503 });
  }

  const payload = {
    contact: { fullName, email, companyName, phone, role, painPoint, nextStep },
    inputs: { people, leadsCaptured, leadsLost, weeklyChaseHours, recoveredLeadValue, plan: planKey, hourlyCost, timeReductionRate, leadRecoveryRate },
    results: { monthlyTimeSavings, leadsRecovered, recoveredLeadValueTotal, monthlyImpact, planCost, netMonthlyImpact, paybackMonths },
  };

  const { data, error } = await db
    .from('roi_report_leads')
    .insert({
      source: 'roi_calculator',
      status: 'potential_lead',
      qualification_status: nextStep === 'report_only' ? 'unqualified' : 'pending_demo_or_trial',
      requested_next_step: nextStep,
      full_name: fullName,
      email,
      company_name: companyName,
      phone,
      role,
      main_pain_point: painPoint,
      selected_plan: plan.name,
      people_following_up: people,
      leads_captured_month: leadsCaptured,
      leads_lost_month: leadsLost,
      weekly_chase_hours: weeklyChaseHours,
      recovered_lead_value: recoveredLeadValue,
      hourly_cost: hourlyCost,
      time_reduction_rate: timeReductionRate,
      lead_recovery_rate: leadRecoveryRate,
      monthly_time_savings: monthlyTimeSavings,
      leads_recovered: leadsRecovered,
      recovered_lead_value_total: recoveredLeadValueTotal,
      monthly_impact: monthlyImpact,
      plan_cost: planCost,
      net_monthly_impact: netMonthlyImpact,
      payback_months: paybackMonths,
      payload,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: `Unable to save ROI lead: ${error?.message ?? 'Unknown error'}` }, { status: 500 });
  }

  const firstName = fullName.split(/\s+/)[0] || fullName;
  const userEmail = buildUserEmail({
    firstName,
    fullName,
    companyName,
    nextStep,
    painPoint,
    planName: plan.name,
    planCost,
    people,
    leadsCaptured,
    leadsLost,
    weeklyChaseHours,
    recoveredLeadValue,
    hourlyCost,
    timeReductionRate,
    leadRecoveryRate,
    monthlyTimeSavings,
    leadsRecovered,
    recoveredLeadValueTotal,
    monthlyImpact,
    netMonthlyImpact,
    paybackMonths,
  });

  const adminEmail = buildAdminEmail({
    id: data.id,
    fullName,
    email,
    companyName,
    phone,
    role,
    painPoint,
    nextStep,
    planName: plan.name,
    people,
    leadsCaptured,
    leadsLost,
    weeklyChaseHours,
    recoveredLeadValue,
    monthlyTimeSavings,
    leadsRecovered,
    monthlyImpact,
    netMonthlyImpact,
    paybackMonths,
  });

  const userResult = await sendEmail({
    to: [email],
    bcc: [ADMIN_EMAIL],
    replyTo: HELP_EMAIL,
    subject: userEmail.subject,
    text: userEmail.text,
    html: userEmail.html,
  });

  if (!userResult.ok) {
    return NextResponse.json({ error: `Lead saved, but report email could not be sent: ${userResult.error}` }, { status: 503 });
  }

  await sendEmail({
    to: [ADMIN_EMAIL],
    replyTo: email,
    subject: adminEmail.subject,
    text: adminEmail.text,
    html: adminEmail.html,
  });

  const message = nextStep === 'request_trial'
    ? 'Trial setup request saved. A branded onboarding email has been sent, with admin copied.'
    : nextStep === 'book_demo'
      ? 'Demo request saved. A branded ROI report has been sent, with admin copied.'
      : 'ROI report sent. Your information has been saved as a potential SETU Flow lead.';

  return NextResponse.json({ message, leadId: data.id });
}
