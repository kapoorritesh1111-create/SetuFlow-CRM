import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { getAiProviderKey, isAiEnabled } from '@/lib/ai/config';

export const dynamic = 'force-dynamic';

const MARKETING_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.setuflowcrm.com';
const CONTACT_KINDS = new Set(['call', 'email', 'whatsapp', 'demo_completed']);

type MessageMode = 'auto' | 'first_inquiry' | 'follow_up';

async function assertSmcMember() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: m } = await (sb as any)
    .from('organization_members').select('id')
    .eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  return m ? { user, sb } : null;
}

function stageContext(stage: string | null): string {
  switch ((stage ?? '').toLowerCase()) {
    case 'inquiry':    return 'They are at the top of the pipeline. If there is no prior contact, this must be a first introduction rather than a follow-up.';
    case 'qualified':  return 'We have qualified them as a good fit. Goal is to move toward a demo or trial.';
    case 'trial':      return 'They are currently on a trial of SETU Flow CRM. Goal is to check in on their experience, unblock any issues, and move toward converting.';
    case 'negotiating': return 'We are in active pricing/contract discussions. Goal is to keep momentum and close.';
    case 'converted':  return 'They are a paying customer. This is a success/account management message.';
    default: return 'They are a prospect. Goal is to build rapport and move the deal forward.';
  }
}

function hasPriorContact(activityLog: unknown, lastContactAt: unknown) {
  if (lastContactAt) return true;
  return Array.isArray(activityLog) && activityLog.some((entry: any) => CONTACT_KINDS.has(String(entry?.kind ?? '').toLowerCase()));
}

function resolveMode(requested: unknown, activityLog: unknown, lastContactAt: unknown): Exclude<MessageMode, 'auto'> {
  const mode: MessageMode = requested === 'first_inquiry' || requested === 'follow_up' ? requested : 'auto';
  if (mode === 'first_inquiry' || mode === 'follow_up') return mode;
  return hasPriorContact(activityLog, lastContactAt) ? 'follow_up' : 'first_inquiry';
}

function firstName(name: unknown) {
  const value = typeof name === 'string' ? name.trim() : '';
  return value ? value.split(/\s+/)[0] : '';
}

export async function POST(request: NextRequest) {
  const auth = await assertSmcMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    company_name, contact_name, pipeline_stage, source, source_detail,
    internal_notes, last_contact_at, next_follow_up_at, lead_score,
    activity_log, kind, sender_name, message_mode,
  } = body;

  // Enrich older callers (notably the lead drawer) from the canonical SMC lead row.
  let industry = typeof body.industry === 'string' ? body.industry.trim() : '';
  let companyWebsite = typeof body.website === 'string' ? body.website.trim() : '';
  let notes = typeof internal_notes === 'string' ? internal_notes.trim() : '';
  if ((!industry || !companyWebsite) && company_name) {
    const { data: lead } = await (auth.sb as any)
      .from('client_onboarding_requests')
      .select('industry,website,internal_notes')
      .eq('company_name', company_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    industry = industry || lead?.industry || '';
    companyWebsite = companyWebsite || lead?.website || '';
    notes = notes || lead?.internal_notes || '';
  }

  const mode = resolveMode(message_mode, activity_log, last_contact_at);
  const isFirstInquiry = mode === 'first_inquiry';
  const contactFirst = firstName(contact_name);
  const name = contactFirst || company_name || 'there';
  const industryLabel = industry || 'import/export and trade';

  const apiKey = getAiProviderKey();
  if (!isAiEnabled() || !apiKey) {
    const fallback = kind === 'email'
      ? isFirstInquiry
        ? `Subject: A simpler sales workflow for ${company_name}\n\nHi ${contactFirst || 'there'},\n\nI am Ritesh from SETU Flow. We built SETU Flow for ${industryLabel} teams that manage inquiries, quotations and follow-ups across email, WhatsApp and spreadsheets. It brings the buyer journey, quotes, orders and trade documentation into one place so the sales team can move faster without losing context.\n\nYou can see the platform here: ${MARKETING_SITE}\n\nWould you be open to a short demo using a workflow similar to ${company_name}?\n\nBest regards,\n${sender_name || 'Ritesh Kapoor'}\nSETU Flow`
        : `Subject: Following up — SETU Flow CRM\n\nHi ${contactFirst || 'there'},\n\nI wanted to follow up on SETU Flow and see if a short demo would be useful for your ${industryLabel} team.\n\nWould you be open to a quick call this week?\n\nBest regards,\n${sender_name || 'Ritesh Kapoor'}\nSETU Flow`
      : isFirstInquiry
        ? `Hi ${name}, I’m ${sender_name || 'Ritesh Kapoor'} from SETU Flow. We help ${industryLabel} teams manage inquiries, quotations, follow-ups, orders and trade documents in one place instead of across WhatsApp, email and spreadsheets. See what we do: ${MARKETING_SITE} — would a short demo be useful for ${company_name}?`
        : `Hi ${name}, following up on SETU Flow. Would a short demo be useful to see how it can support your ${industryLabel} sales and trade workflow?`;
    return NextResponse.json({ message: fallback, source: 'fallback', message_mode: mode });
  }

  const recentActivity = Array.isArray(activity_log) && activity_log.length > 0
    ? activity_log
        .slice(-4)
        .map((e: any) => `  • ${String(e.kind ?? 'note').toUpperCase()}: "${e.note}" (${new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`)
        .join('\n')
    : '  • No prior activity logged';

  const daysSince = last_contact_at
    ? Math.floor((Date.now() - new Date(last_contact_at).getTime()) / 86400000)
    : null;
  const stageCtx = stageContext(pipeline_stage);
  const sourceStr = source_detail ? `${source_detail}` : source ? source.replace(/_/g, ' ') : null;
  const historyRule = isFirstInquiry
    ? 'This is FIRST CONTACT. Do not say following up, checking in, circling back, again, or imply any prior conversation.'
    : 'This is a FOLLOW-UP. Reference prior contact only when supported by the activity/history supplied below.';

  if (kind === 'whatsapp') {
    const waPrompt = `You are writing a WhatsApp sales message on behalf of ${sender_name || 'Ritesh Kapoor'} from SETU Flow CRM — a B2B trade operating system for import/export teams. SETU Flow helps manage leads, quotations, buyer follow-ups, orders, trade/compliance documents and supplier workflows in one connected workspace.

MESSAGE MODE: ${mode.toUpperCase()}
${historyRule}

RECIPIENT:
- Name: ${contactFirst || '(unknown — do not invent a name)'}
- Company: ${company_name}
- Industry: ${industryLabel}
- Company website: ${companyWebsite || 'not recorded'}
- Pipeline stage: ${pipeline_stage || 'unknown'} — ${stageCtx}
- Lead score: ${lead_score != null ? `${lead_score}/100` : 'not scored'}
- How they came in: ${sourceStr || 'not recorded'}
- Days since last contact: ${daysSince !== null ? `${daysSince} days` : 'none / first contact'}
- Internal/research notes: ${notes || 'none'}
- Recent logged activity:
${recentActivity}

TASK: Write one WhatsApp ${isFirstInquiry ? 'first-introduction sales inquiry' : 'follow-up'} message.

RULES:
- Keep it concise but useful: 3-5 short sentences, no bullet list.
- Start naturally with "Hi ${contactFirst || ''}" if a first name is known; otherwise use "Hi" without a placeholder.
- ${isFirstInquiry ? `Introduce SETU Flow and explain 1-2 concrete ways it can help a ${industryLabel} company. Make the value relevant to their industry and any real pain signal in the notes.` : 'Continue the conversation naturally and move toward a demo/reply.'}
- Do not invent facts, software currently used, customer names, pain points, prior discussions, or company size.
- ${isFirstInquiry ? `You MUST include the marketing-site link exactly once: ${MARKETING_SITE}` : 'A website link is optional on follow-ups unless useful.'}
- End with one low-friction ask, preferably whether a short demo would be useful.
- Tone: founder-to-business-owner, warm, specific and direct. No corporate filler. No "I hope this message finds you well."
- OUTPUT only the WhatsApp message. No subject or explanation.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 320, messages: [{ role: 'user', content: waPrompt }] }),
      });
      if (!res.ok) return NextResponse.json({ error: `AI error: ${await res.text()}` }, { status: 500 });
      const data = await res.json();
      let message = data.content?.[0]?.text?.trim() ?? '';
      // First inquiry must always carry the marketing-site link, even if the model omits it.
      if (isFirstInquiry && !message.includes(MARKETING_SITE)) message = `${message}\n\n${MARKETING_SITE}`.trim();
      return NextResponse.json({ message, source: 'claude-sonnet-4-6', message_mode: mode });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  const emailPrompt = `You are writing a ${isFirstInquiry ? 'first-introduction sales email' : 'follow-up email'} on behalf of ${sender_name || 'Ritesh Kapoor'} from SETU Flow CRM — a B2B trade operating system for import/export teams. SETU Flow helps manage lead capture, quotation building, buyer follow-up, order execution, trade/compliance documents and supplier procurement.

MESSAGE MODE: ${mode.toUpperCase()}
${historyRule}

RECIPIENT:
- Full name: ${contact_name || '(not recorded — use "Hi there")'}
- Company: ${company_name}
- Industry: ${industryLabel}
- Company website: ${companyWebsite || 'not recorded'}
- Pipeline stage: ${pipeline_stage || 'unknown'} — ${stageCtx}
- Lead score: ${lead_score != null ? `${lead_score}/100` : 'not scored'}
- How they came in: ${sourceStr || 'not recorded'}
- Days since last contact: ${daysSince !== null ? `${daysSince} days` : 'none / first contact'}
- Next follow-up scheduled: ${next_follow_up_at ? new Date(next_follow_up_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'not set'}
- Internal/research notes: ${notes || 'none'}
- Recent logged activity:
${recentActivity}

TASK: Write a professional but human ${isFirstInquiry ? 'introductory outreach' : 'follow-up'} email.

FORMAT — output exactly:
Subject: [specific subject]

Hi [first name or "there"],

[opening]

[value paragraph]

[one clear low-friction ask]

Best regards,
${sender_name || 'Ritesh Kapoor'}
SETU Flow
${isFirstInquiry ? MARKETING_SITE : ''}

RULES:
- Subject line must be on the first line starting with "Subject: ".
- ${isFirstInquiry ? `Introduce why you are reaching out and explain 2-3 concrete ways SETU Flow can help a ${industryLabel} business. Focus on business outcomes, not a generic CRM feature list.` : 'Use the real prior history to make the follow-up relevant.'}
- Do not invent company facts, pain points, prior contact or software usage.
- ${isFirstInquiry ? `The marketing-site link ${MARKETING_SITE} MUST appear exactly once in the email.` : 'The marketing-site link is optional for a follow-up.'}
- Keep the body under 190 words.
- Do not mention SETU Flow more than three times.
- End with a short demo ask or a simple reply question.
- Output only the email.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: emailPrompt }] }),
    });
    if (!res.ok) return NextResponse.json({ error: `AI error: ${await res.text()}` }, { status: 500 });
    const data = await res.json();
    let message = data.content?.[0]?.text?.trim() ?? '';
    if (isFirstInquiry && !message.includes(MARKETING_SITE)) message = `${message}\n${MARKETING_SITE}`.trim();
    return NextResponse.json({ message, source: 'claude-sonnet-4-6', message_mode: mode });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
