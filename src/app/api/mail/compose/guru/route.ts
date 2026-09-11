import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { buildComposeGuruPrompt } from '@/lib/mail/compose-guru';

export const dynamic = 'force-dynamic';
const RequestSchema = z.object({
  action: z.enum(['improve', 'professional', 'shorter', 'warmer', 'draft_reply', 'draft_follow_up', 'suggest_subject']),
  to: z.array(z.string().email()).max(30).default([]),
  subject: z.string().max(500).default(''),
  text: z.string().max(20000).default(''),
  parentMessageId: z.string().uuid().nullable().optional(),
});
function outputText(result: Record<string, unknown>) {
  if (typeof result.output_text === 'string' && result.output_text.trim()) return result.output_text.trim();
  const output = Array.isArray(result.output) ? result.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as any).content) ? (item as any).content : [];
    for (const part of content) if (part && typeof part.text === 'string' && part.text.trim()) return part.text.trim();
  }
  return '';
}
export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Setu Guru compose request.', details: parsed.error.flatten() }, { status: 422 });
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const [{ data: grant }, mailbox] = await Promise.all([
    db.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    resolveUserMailbox(db, organizationId, workspace.user.id, 'id,address,status'),
  ]);
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  const body = parsed.data;
  const peer = body.to[0]?.trim().toLowerCase() ?? '';
  let crmContext: any = null;
  if (peer) {
    const { data: lead } = await db.from('leads')
      .select('id,lead_type,company_name,contact_name,email,stage_id,owner_user_id,next_follow_up_at,last_contacted_at,deal_value,deal_currency,products_or_needs,updated_at')
      .eq('organization_id', organizationId).ilike('email', peer).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (lead) {
      let stageName: string | null = null;
      if (lead.stage_id) {
        const { data: stage } = await db.from('pipeline_stages').select('name').eq('id', lead.stage_id).eq('organization_id', organizationId).maybeSingle();
        stageName = stage?.name ?? null;
      }
      crmContext = { leadId: lead.id, companyName: lead.company_name, contactName: lead.contact_name, email: lead.email, leadType: lead.lead_type, stageId: lead.stage_id, stageName, ownerUserId: lead.owner_user_id, nextFollowUpAt: lead.next_follow_up_at, lastContactedAt: lead.last_contacted_at, dealValue: lead.deal_value, dealCurrency: lead.deal_currency, productsOrNeeds: lead.products_or_needs };
    }
  }

  let threadContext = '';
  if (body.parentMessageId) {
    const { data: parent } = await db.from('mail_messages').select('id,subject,text_body,from_address,to_addresses').eq('id', body.parentMessageId).eq('mailbox_id', mailbox.id).maybeSingle();
    if (parent) threadContext = `From: ${parent.from_address}\nTo: ${(parent.to_addresses ?? []).join(', ')}\nSubject: ${parent.subject ?? ''}\nMessage:\n${String(parent.text_body ?? '').slice(0, 8000)}`;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Setu Guru is not configured.' }, { status: 503 });
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Setu Guru usage controls are unavailable.' }, { status: 503 });
  const reservation = await admin.rpc('mail_reserve_guru', { p_organization_id: organizationId, p_mailbox_id: mailbox.id, p_user_id: workspace.user.id });
  if (reservation.error) {
    console.error('mail.guru.reserve_failed', { organizationId, mailboxId: mailbox.id, code: reservation.error.code ?? 'unknown' });
    return NextResponse.json({ error: 'Setu Guru usage could not be verified.' }, { status: 503 });
  }
  if (reservation.data !== true) return NextResponse.json({ error: 'Setu Guru usage limit reached or sending access is unavailable.' }, { status: 429 });

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.SETU_GURU_MODEL || 'gpt-4.1-mini', input: buildComposeGuruPrompt({ action: body.action, to: body.to, subject: body.subject, text: body.text, threadContext, crmContext }), max_output_tokens: body.action === 'suggest_subject' ? 80 : 1200 }),
  });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) return NextResponse.json({ error: 'Setu Guru could not prepare this draft.' }, { status: response.status });
  const suggestion = outputText(result);
  if (!suggestion) return NextResponse.json({ error: 'Setu Guru returned an empty suggestion.' }, { status: 502 });
  return NextResponse.json({ suggestion, action: body.action, crmContext, autonomousActions: false, permissionScope: 'current-user-crm-access' });
}
