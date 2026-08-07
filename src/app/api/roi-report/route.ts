import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getMailtrapFromAddress, sendMailtrapEmail } from '@/lib/email/mailtrap';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'admin@setugroups.com';
const HELP_EMAIL = 'help@setugroups.com';

type NextStep = 'report_only' | 'book_demo' | 'request_trial';
type PlanKey = 'starter' | 'growth';

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
    plan?: PlanKey;
    hourlyCost?: number;
    timeReductionRate?: number;
    leadRecoveryRate?: number;
  };
};

const PLANS: Record<PlanKey, { name: string; price: number }> = {
  starter: { name: 'Starter', price: 199 },
  growth: { name: 'Growth', price: 499 },
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.setuflowcrm.com').replace(/\/$/, '');
}

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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.max(0, value));
}

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function payback(value: number) {
  return value > 0 && value < 1 ? 'Less than 1 month' : `${number(value)} months`;
}

function recommendedSalesAngle(painPoint: string) {
  const pain = painPoint || 'missed follow-ups';
  return `Lead with ${pain}. Use the ROI range as the discovery opener, then map the prospect's lead capture, follow-up ownership, quote workflow, document readiness, and order handoff into SETU Flow.`;
}

async function sendEmail(payload: { to: string[]; bcc?: string[]; replyTo?: string; subject: string; text: string; html: string }) {
  const result = await sendMailtrapEmail({
    from: getMailtrapFromAddress(),
    fromName: 'SETU Flow CRM',
    to: payload.to,
    bcc: payload.bcc,
    replyTo: payload.replyTo ?? HELP_EMAIL,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    category: 'roi_report',
  });
  return result.ok ? { ok: true, error: null } : { ok: false, error: result.error };
}

type Scenario = {
  label: string;
  timeRate: number;
  recoveryRate: number;
  monthlyTimeSavings: number;
  leadsRecovered: number;
  recoveredLeadValueTotal: number;
  monthlyImpact: number;
  netMonthlyImpact: number;
  paybackMonths: number;
};

type Report = {
  id?: string;
  fullName: string;
  firstName: string;
  email: string;
  companyName: string;
  phone: string;
  role: string;
  painPoint: string;
  nextStep: NextStep;
  planName: string;
  planCost: number;
  people: number;
  leadsCaptured: number;
  leadsLost: number;
  weeklyChaseHours: number;
  recoveredLeadValue: number;
  hourlyCost: number;
  scenarios: {
    conservative: Scenario;
    balanced: Scenario;
    upside: Scenario;
  };
};

function calculateScenario(args: { label: string; timeRate: number; recoveryRate: number; weeklyChaseHours: number; hourlyCost: number; leadsLost: number; recoveredLeadValue: number; planCost: number }): Scenario {
  const monthlyTimeSavings = args.weeklyChaseHours * 4.33 * args.hourlyCost * (args.timeRate / 100);
  const leadsRecovered = args.leadsLost * (args.recoveryRate / 100);
  const recoveredLeadValueTotal = leadsRecovered * args.recoveredLeadValue;
  const monthlyImpact = monthlyTimeSavings + recoveredLeadValueTotal;
  const netMonthlyImpact = monthlyImpact - args.planCost;
  const paybackMonths = monthlyImpact > 0 ? args.planCost / monthlyImpact : 0;
  return { label: args.label, timeRate: args.timeRate, recoveryRate: args.recoveryRate, monthlyTimeSavings, leadsRecovered, recoveredLeadValueTotal, monthlyImpact, netMonthlyImpact, paybackMonths };
}

function subjectFor(nextStep: NextStep) {
  if (nextStep === 'request_trial') return 'Your SETU Flow trial setup request is received';
  return 'Your SETU Flow ROI estimate is ready';
}

function brandedEmail(data: Report) {
  const base = siteUrl();
  const logo = `${base}/logos/setu-flow-logo.png`;
  const demoLink = `${base}/book-demo?source=roi-calculator&intent=demo`;
  const trialLink = `${base}/book-demo?source=roi-calculator&intent=trial-onboarding`;
  const subject = subjectFor(data.nextStep);
  const primaryLink = data.nextStep === 'request_trial' ? trialLink : demoLink;
  const primaryText = data.nextStep === 'request_trial' ? 'Start Trial Onboarding' : 'Book Demo With My ROI';
  const { conservative, balanced, upside } = data.scenarios;
  const intro = data.nextStep === 'request_trial'
    ? 'Your trial setup request is received. SETU Guru has prepared your ROI context so our team can use it during onboarding.'
    : 'Your ROI estimate is ready. This summary is powered by SETU Guru, our workflow intelligence layer that turns calculator inputs into practical next steps.';
  const text = `Hi ${data.firstName},\n\n${subject}\n\nPotential monthly improvement range: ${money(conservative.monthlyImpact)} to ${money(upside.monthlyImpact)}\nBalanced estimate: ${money(balanced.monthlyImpact)} per month\nRecovered leads/month: ${number(balanced.leadsRecovered)}\nMonthly time savings: ${money(balanced.monthlyTimeSavings)}\nSelected plan: ${data.planName} (${money(data.planCost)}/month)\n\nBook demo: ${demoLink}\nRequest trial: ${trialLink}\n\nThis is a directional estimate, not guaranteed revenue. Actual results depend on lead quality, team behavior, margins, and implementation quality.\n\nSETU Flow Team`;
  const row = (label: string, value: string) => `<tr><td style="padding:12px 16px;border-top:1px solid #e8eef5;color:#64748b;font-size:14px;line-height:20px">${escapeHtml(label)}</td><td align="right" style="padding:12px 16px;border-top:1px solid #e8eef5;color:#0f172a;font-size:14px;line-height:20px;font-weight:800">${escapeHtml(value)}</td></tr>`;
  const scenarioRow = (label: string, scenario: Scenario, accent = false) => `<tr><td style="padding:14px 16px;border-top:1px solid rgba(255,255,255,.14);font-family:Arial,sans-serif;color:${accent ? '#99f6e4' : '#d8e7f4'};font-size:14px;font-weight:800">${escapeHtml(label)}</td><td align="right" style="padding:14px 16px;border-top:1px solid rgba(255,255,255,.14);font-family:Arial,sans-serif;color:${accent ? '#99f6e4' : '#ffffff'};font-size:18px;font-weight:900">${money(scenario.monthlyImpact)}/mo</td></tr>`;
  const metric = (label: string, value: string) => `<tr><td style="padding:0 0 12px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fbff;border:1px solid #dbe7f3;border-radius:18px"><tr><td style="padding:16px 18px;font-family:Arial,sans-serif"><div style="font-size:12px;line-height:18px;color:#64748b;font-weight:700">${escapeHtml(label)}</div><div style="font-size:24px;line-height:31px;color:#071232;font-weight:900;margin-top:3px">${escapeHtml(value)}</div></td></tr></table></td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#edf5f9"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf5f9"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:26px;overflow:hidden;border:1px solid #dbe7f3"><tr><td style="padding:26px 24px 18px 24px;background:#ffffff;border-bottom:1px solid #e5eef7"><img src="${logo}" width="150" alt="SETU Flow CRM" style="display:block;border:0;max-width:150px;height:auto;margin:0 0 18px 0" /><div style="display:inline-block;background:#e9fbf6;color:#0f766e;border-radius:999px;padding:7px 12px;font-family:Arial,sans-serif;font-size:11px;line-height:14px;font-weight:900;letter-spacing:.12em;text-transform:uppercase">Powered by SETU Guru</div><h1 style="margin:14px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;color:#071232;font-weight:900">${escapeHtml(subject)}</h1><p style="margin:12px 0 0 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;color:#475569">${escapeHtml(intro)}</p></td></tr><tr><td style="padding:24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#06263f;border-radius:22px"><tr><td style="padding:24px;font-family:Arial,sans-serif;text-align:center"><div style="color:#9cebdc;font-size:12px;line-height:18px;font-weight:900;letter-spacing:.12em;text-transform:uppercase">Potential monthly improvement</div><div style="color:#ffffff;font-size:42px;line-height:50px;font-weight:900;margin-top:6px">${money(balanced.monthlyImpact)} <span style="font-size:19px;color:#dbeafe">/ month</span></div><div style="color:#b8c7d5;font-size:14px;line-height:22px;font-weight:700">Balanced estimate based on conservative assumptions</div></td></tr>${scenarioRow('Conservative estimate', conservative)}${scenarioRow('Balanced estimate', balanced, true)}${scenarioRow('Upside estimate', upside)}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px">${metric('Recovered leads per month', number(balanced.leadsRecovered))}${metric('Monthly time savings', money(balanced.monthlyTimeSavings))}${metric('Selected plan', `${data.planName} (${money(data.planCost)}/month)`)}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border:1px solid #dbe7f3;border-radius:18px;overflow:hidden"><tr><td colspan="2" style="padding:15px 16px;background:#f8fafc;color:#071232;font-family:Arial,sans-serif;font-size:16px;font-weight:900">Your inputs</td></tr>${row('People following up on leads', String(data.people))}${row('Leads captured per month', String(data.leadsCaptured))}${row('Leads lost or missed per month', String(data.leadsLost))}${row('Team hours chasing leads per week', String(data.weeklyChaseHours))}${row('Average value per recovered lead', money(data.recoveredLeadValue))}${row('Selected plan', `${data.planName} (${money(data.planCost)}/month)`)}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;background:#effaf7;border:1px solid #c7f0e5;border-radius:18px"><tr><td style="padding:20px;font-family:Arial,sans-serif"><div style="font-size:18px;line-height:24px;font-weight:900;color:#065f46">Recommended next step</div><p style="margin:8px 0 18px 0;font-size:15px;line-height:24px;color:#334155">Bring this ROI context into your demo or trial setup. SETU Guru will use your numbers to tailor the walkthrough, map workflows, and prioritize the highest-impact automations.</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:14px;background:#108477"><a href="${primaryLink}" style="display:inline-block;padding:14px 18px;font-family:Arial,sans-serif;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900">${primaryText}</a></td></tr></table><p style="margin:14px 0 0 0;font-size:13px;line-height:20px"><a href="${trialLink}" style="color:#0f766e;font-weight:800;text-decoration:none">Request trial access</a> &nbsp;•&nbsp; <a href="${demoLink}" style="color:#0f766e;font-weight:800;text-decoration:none">Book a demo</a></p></td></tr></table><p style="margin:20px 0 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:19px;color:#64748b">This is a directional estimate, not guaranteed revenue. SETU Flow does not guarantee revenue recovery or savings. Actual results depend on lead quality, internal process, user adoption, margins, and implementation quality.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

function adminEmail(data: Report) {
  const salesAngle = recommendedSalesAngle(data.painPoint);
  const subject = `New ROI Calculator Lead - ${data.companyName}`;
  const { conservative, balanced, upside } = data.scenarios;
  const text = `New ROI Calculator Lead\n\nName: ${data.fullName}\nCompany: ${data.companyName}\nEmail: ${data.email}\nPhone: ${data.phone || 'Not provided'}\nRole: ${data.role || 'Not provided'}\nPain point: ${data.painPoint || 'Not provided'}\nNext step: ${data.nextStep}\nPlan: ${data.planName}\nConservative: ${money(conservative.monthlyImpact)}\nBalanced: ${money(balanced.monthlyImpact)}\nUpside: ${money(upside.monthlyImpact)}\nSales angle: ${salesAngle}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h2>New ROI Calculator Lead</h2><p><b>Name:</b> ${escapeHtml(data.fullName)}<br/><b>Company:</b> ${escapeHtml(data.companyName)}<br/><b>Email:</b> ${escapeHtml(data.email)}<br/><b>Phone:</b> ${escapeHtml(data.phone || 'Not provided')}<br/><b>Role:</b> ${escapeHtml(data.role || 'Not provided')}</p><p><b>Pain point:</b> ${escapeHtml(data.painPoint || 'Not provided')}<br/><b>Next step:</b> ${escapeHtml(data.nextStep)}<br/><b>Plan:</b> ${escapeHtml(data.planName)}</p><p><b>Conservative:</b> ${money(conservative.monthlyImpact)}<br/><b>Balanced:</b> ${money(balanced.monthlyImpact)}<br/><b>Upside:</b> ${money(upside.monthlyImpact)}</p><p><b>Sales angle:</b><br/>${escapeHtml(salesAngle)}</p></div>`;
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

  if (!fullName || !email || !companyName) return NextResponse.json({ error: 'Please provide full name, work email, and company name.' }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Please provide a valid work email.' }, { status: 400 });

  const planKey: PlanKey = input.plan === 'starter' ? 'starter' : 'growth';
  const plan = PLANS[planKey];
  const people = Math.round(toNumber(input.people));
  const leadsCaptured = Math.round(toNumber(input.leadsCaptured));
  const leadsLost = Math.round(toNumber(input.leadsLost));
  const weeklyChaseHours = toNumber(input.weeklyChaseHours);
  const recoveredLeadValue = toNumber(input.recoveredLeadValue);
  const hourlyCost = toNumber(input.hourlyCost, 25);
  const timeReductionRate = toNumber(input.timeReductionRate, 35);
  const leadRecoveryRate = toNumber(input.leadRecoveryRate, 25);
  const planCost = plan.price;
  const scenarios = {
    conservative: calculateScenario({ label: 'Conservative', timeRate: 20, recoveryRate: 10, weeklyChaseHours, hourlyCost, leadsLost, recoveredLeadValue, planCost }),
    balanced: calculateScenario({ label: 'Balanced', timeRate: 25, recoveryRate: 15, weeklyChaseHours, hourlyCost, leadsLost, recoveredLeadValue, planCost }),
    upside: calculateScenario({ label: 'Upside', timeRate: timeReductionRate, recoveryRate: leadRecoveryRate, weeklyChaseHours, hourlyCost, leadsLost, recoveredLeadValue, planCost }),
  };

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: 'Report delivery is not fully configured yet. Please try again later.' }, { status: 503 });

  const { balanced, conservative, upside } = scenarios;
  const record = {
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
    time_reduction_rate: 25,
    lead_recovery_rate: 15,
    monthly_time_savings: balanced.monthlyTimeSavings,
    leads_recovered: balanced.leadsRecovered,
    recovered_lead_value_total: balanced.recoveredLeadValueTotal,
    monthly_impact: balanced.monthlyImpact,
    plan_cost: planCost,
    net_monthly_impact: balanced.netMonthlyImpact,
    payback_months: balanced.paybackMonths,
    payload: { contact, inputs: input, scenarios: { conservative, balanced, upside } },
  };
  const { data, error } = await db.from('roi_report_leads').insert(record).select('id').single();
  if (error || !data) return NextResponse.json({ error: 'We could not prepare your report right now. Please try again later.' }, { status: 500 });

  const report: Report = {
    id: data.id,
    fullName,
    firstName: fullName.split(/\s+/)[0] || fullName,
    email,
    companyName,
    phone,
    role,
    painPoint,
    nextStep,
    planName: plan.name,
    planCost,
    people,
    leadsCaptured,
    leadsLost,
    weeklyChaseHours,
    recoveredLeadValue,
    hourlyCost,
    scenarios,
  };

  const user = brandedEmail(report);
  const sent = await sendEmail({ to: [email], bcc: [ADMIN_EMAIL], replyTo: HELP_EMAIL, subject: user.subject, text: user.text, html: user.html });
  if (!sent.ok) return NextResponse.json({ error: 'Your details were received, but the report email could not be sent. Please try again later.' }, { status: 503 });

  const admin = adminEmail(report);
  await sendEmail({ to: [ADMIN_EMAIL], replyTo: email, subject: admin.subject, text: admin.text, html: admin.html });

  const message = nextStep === 'request_trial'
    ? 'Your trial request is received. We have emailed your onboarding next step.'
    : nextStep === 'book_demo'
      ? 'Your ROI report is on the way. We have included your demo request with these numbers.'
      : 'Your ROI report is on the way. Please check your inbox.';

  return NextResponse.json({ message });
}
