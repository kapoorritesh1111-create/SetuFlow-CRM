import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { getAiProviderKey, isAiEnabled } from '@/lib/ai/config';

export const dynamic = 'force-dynamic';

async function assertSmcMember() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: m } = await (sb as any)
    .from('organization_members').select('id')
    .eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  return m ? user : null;
}

function stageContext(stage: string | null): string {
  switch ((stage ?? '').toLowerCase()) {
    case 'inquiry':    return 'They just expressed interest — we haven\'t spoken in depth yet.';
    case 'qualified':  return 'We\'ve qualified them as a good fit. Goal is to move toward a demo or trial.';
    case 'trial':      return 'They are currently on a trial of SETU Flow CRM. Goal is to check in on their experience, unblock any issues, and move toward converting.';
    case 'negotiating': return 'We\'re in active pricing/contract discussions. Goal is to keep momentum and close.';
    case 'converted':  return 'They are a paying customer. This is a success/account management message.';
    default: return 'They are a prospect. Goal is to build rapport and move the deal forward.';
  }
}

export async function POST(request: NextRequest) {
  const user = await assertSmcMember();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    company_name, contact_name, pipeline_stage, source, source_detail,
    internal_notes, last_contact_at, next_follow_up_at, lead_score,
    activity_log, kind, sender_name,
  } = body;

  const apiKey = getAiProviderKey();
  if (!isAiEnabled() || !apiKey) {
    const name = contact_name || company_name;
    const fallback = kind === 'email'
      ? `Subject: Following up — SETU Flow CRM\n\nHi ${name},\n\nI wanted to follow up and see how things are going on your end.\n\nWould you be open to a quick call this week to discuss how SETU Flow CRM can help your team?\n\nBest regards,\n${sender_name || 'Ritesh Kapoor'}\nSETU Flow`
      : `Hi ${name}, just checking in — wanted to see how things are going and if you have any questions about SETU Flow. Are you free for a quick call this week?`;
    return NextResponse.json({ message: fallback, source: 'fallback' });
  }

  const recentActivity = Array.isArray(activity_log) && activity_log.length > 0
    ? activity_log
        .slice(-4)
        .map((e: any) => `  • ${e.kind.toUpperCase()}: "${e.note}" (${new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`)
        .join('\n')
    : '  • No prior activity logged';

  const daysSince = last_contact_at
    ? Math.floor((Date.now() - new Date(last_contact_at).getTime()) / 86400000)
    : null;

  const contactRef = contact_name ? contact_name.split(' ')[0] : null; // first name only
  const stageCtx = stageContext(pipeline_stage);
  const sourceStr = source_detail ? `${source_detail}` : source ? source.replace(/_/g, ' ') : null;

  if (kind === 'whatsapp') {
    const waPrompt = `You are writing a WhatsApp message on behalf of ${sender_name || 'Ritesh Kapoor'} from SETU Flow CRM — a B2B trade execution platform built for import/export teams (lead tracking, quotes, orders, compliance documents, supplier management).

RECIPIENT:
- Name: ${contactRef || contact_name || '(contact name unknown — do not use a placeholder, just skip the name)'}
- Company: ${company_name}
- Pipeline stage: ${pipeline_stage || 'unknown'} — ${stageCtx}
- Lead score: ${lead_score != null ? `${lead_score}/100` : 'not scored'}
- How they came in: ${sourceStr || 'not recorded'}
- Days since last contact: ${daysSince !== null ? `${daysSince} days` : 'unknown'}
- Internal notes: ${internal_notes?.trim() || 'none'}
- Recent logged activity:
${recentActivity}

TASK: Write a single WhatsApp follow-up message. It must be:
- SHORT: 2-3 sentences maximum. No lists, no bullet points.
- PERSONAL: Start with "Hi ${contactRef || '[name]'}" — use their first name if known.
- SPECIFIC: Reference something real from the context above (their stage, source event, internal notes, or a recent activity). Do NOT invent details that aren't in the context.
- HONEST: Only mention a previous call/email/demo if it appears in the activity log above. If no prior activity, write as if this is a first or general follow-up.
- ONE CLEAR ASK at the end: a call, a reply, a question — pick one.
- TONE: Warm and direct. No corporate speak. No emojis unless the context strongly suggests it (e.g. trade show excitement). No "I hope this message finds you well."
- OUTPUT: Only the message text. Nothing else. No subject line. No explanation.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, messages: [{ role: 'user', content: waPrompt }] }),
      });
      if (!res.ok) return NextResponse.json({ error: `AI error: ${await res.text()}` }, { status: 500 });
      const data = await res.json();
      return NextResponse.json({ message: data.content?.[0]?.text?.trim() ?? '', source: 'claude-sonnet-4-6' });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // ── EMAIL ────────────────────────────────────────────────────────────────
  const emailPrompt = `You are writing a follow-up email on behalf of ${sender_name || 'Ritesh Kapoor'} from SETU Flow CRM — a B2B trade execution platform for import/export teams (lead management, quote building, order execution, compliance documents, supplier procurement).

RECIPIENT:
- Full name: ${contact_name || '(not recorded — use "Hi there" as greeting)'}
- Company: ${company_name}
- Pipeline stage: ${pipeline_stage || 'unknown'} — ${stageCtx}
- Lead score: ${lead_score != null ? `${lead_score}/100` : 'not scored'}
- How they came in: ${sourceStr || 'not recorded'}
- Days since last contact: ${daysSince !== null ? `${daysSince} days` : 'unknown'}
- Next follow-up scheduled: ${next_follow_up_at ? new Date(next_follow_up_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'not set'}
- Internal notes: ${internal_notes?.trim() || 'none'}
- Recent logged activity:
${recentActivity}

TASK: Write a professional but human follow-up email.

FORMAT — output exactly this structure:
Subject: [subject line here]

Hi [first name or "there" if unknown],

[paragraph 1 — context-aware opening, 2-3 sentences, references something specific from above]

[paragraph 2 — value or specific offer, 2-3 sentences, relevant to their stage]

[closing paragraph — one clear low-friction ask: call, demo, reply, or question]

[sign-off]
${sender_name || 'Ritesh Kapoor'}
SETU Flow

RULES:
- Subject line must be on the FIRST line starting with "Subject: "
- Use contact's first name in the greeting if known. If unknown use "Hi there"
- Reference something REAL from the context (source event, stage, internal notes, activity). Do NOT invent history.
- Only reference a previous call/meeting/email if it appears in the activity log.
- Keep it under 180 words in the body.
- Do NOT mention SETU Flow more than twice.
- Output ONLY the email. No explanation, no commentary.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 500, messages: [{ role: 'user', content: emailPrompt }] }),
    });
    if (!res.ok) return NextResponse.json({ error: `AI error: ${await res.text()}` }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ message: data.content?.[0]?.text?.trim() ?? '', source: 'claude-sonnet-4-6' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
