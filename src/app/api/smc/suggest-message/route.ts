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

export async function POST(request: NextRequest) {
  const user = await assertSmcMember();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    company_name, contact_name, pipeline_stage, source, source_detail,
    internal_notes, last_contact_at, next_follow_up_at, lead_score,
    activity_log, kind, // 'whatsapp' | 'email'
    sender_name,
  } = body;

  const apiKey = getAiProviderKey();
  if (!isAiEnabled() || !apiKey) {
    // Fallback templates when AI not available
    const fallback = kind === 'email'
      ? `Subject: Following up — SETU Flow CRM\n\nHi ${contact_name || company_name},\n\nI wanted to follow up on our conversation about SETU Flow CRM and see if you had any questions or needed more information.\n\nWould you be open to a quick call this week?\n\nBest regards,\n${sender_name || 'Ritesh Kapoor'}`
      : `Hi ${contact_name || company_name}, following up on SETU Flow CRM. Would love to connect and answer any questions. Are you available for a quick call this week?`;
    return NextResponse.json({ message: fallback, source: 'fallback' });
  }

  // Build context for Claude
  const recentActivity = Array.isArray(activity_log)
    ? activity_log.slice(-3).map((e: any) => `- ${e.kind}: ${e.note} (${new Date(e.created_at).toLocaleDateString()})`).join('\n')
    : 'No prior activity';

  const daysSinceContact = last_contact_at
    ? Math.floor((Date.now() - new Date(last_contact_at).getTime()) / 86400000)
    : null;

  const prompt = kind === 'email'
    ? `You are Setu Guru, the AI assistant for SETU Flow CRM (a B2B trade execution platform for import/export teams).

Write a short, warm, professional follow-up email from ${sender_name || 'Ritesh Kapoor'} at SETU Flow to ${contact_name || 'the contact'} at ${company_name}.

Context:
- Pipeline stage: ${pipeline_stage || 'qualified'}
- Lead score: ${lead_score || 'N/A'}/100
- Source: ${source || 'unknown'}${source_detail ? ` (${source_detail})` : ''}
- Days since last contact: ${daysSinceContact !== null ? daysSinceContact : 'unknown'}
- Internal notes: ${internal_notes || 'none'}
- Recent activity:\n${recentActivity}

Rules:
- Subject line first, then body
- 3-4 short paragraphs max
- Reference specific context where possible (source, stage, any notes)
- End with a clear, low-friction ask (call, demo, or reply)
- Sign off as ${sender_name || 'Ritesh'}
- Do NOT mention SETU Flow in every sentence — be natural
- Output only the email, no extra commentary`
    : `You are Setu Guru, the AI assistant for SETU Flow CRM.

Write a short, friendly WhatsApp follow-up message from ${sender_name || 'Ritesh'} at SETU Flow to ${contact_name || 'the contact'} at ${company_name}.

Context:
- Pipeline stage: ${pipeline_stage || 'qualified'}
- Lead score: ${lead_score || 'N/A'}/100
- Source: ${source || 'unknown'}${source_detail ? ` (${source_detail})` : ''}
- Days since last contact: ${daysSinceContact !== null ? daysSinceContact : 'unknown'}
- Internal notes: ${internal_notes || 'none'}
- Recent activity:\n${recentActivity}

Rules:
- WhatsApp tone: conversational, warm, brief (2-3 sentences max)
- No formal salutations — just "Hi [name]"
- Reference something specific from context (event, stage, notes) where natural
- End with ONE clear question or ask
- Do NOT write bullet points or formal email structure
- Output only the message text, nothing else`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `AI error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const message = data.content?.[0]?.text ?? '';
    return NextResponse.json({ message, source: 'claude-sonnet-4-6' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
