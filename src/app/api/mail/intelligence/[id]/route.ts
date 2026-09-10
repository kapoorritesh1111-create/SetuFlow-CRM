import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

type Intent = {
  key: string;
  label: string;
  confidence: 'high' | 'medium';
  suggestedAction: string;
  evidence: string;
  actionLabel: string | null;
  actionHref: string | null;
};

type IntentRule = {
  key: string;
  label: string;
  confidence: 'high' | 'medium';
  suggestedAction: string;
  pattern: RegExp;
};

const INTENT_RULES: IntentRule[] = [
  { key: 'rfq', label: 'RFQ / pricing request', confidence: 'high', suggestedAction: 'Review the request and start the commercial workflow.', pattern: /\b(rfq|request for quote|quotation|please quote|price for|pricing for)\b/i },
  { key: 'purchase_order', label: 'Purchase order', confidence: 'high', suggestedAction: 'Review the PO against the related commercial record before changing execution state.', pattern: /\b(purchase order|po\b|attached po|po number|order confirmation)\b/i },
  { key: 'follow_up', label: 'Follow-up signal', confidence: 'medium', suggestedAction: 'Review the conversation and confirm the next follow-up.', pattern: /\b(follow up|following up|checking in|any update|status update|haven't heard|have not heard)\b/i },
  { key: 'execution_risk', label: 'Execution risk', confidence: 'high', suggestedAction: 'Review the lead/order context and execution timeline before committing.', pattern: /\b(delay|delayed|late|postpone|cannot meet|can't meet|shortage|issue with production)\b/i },
  { key: 'sample_request', label: 'Sample request', confidence: 'medium', suggestedAction: 'Review the lead and capture the sample requirement as the next action.', pattern: /\b(sample|samples|send sample|sample order)\b/i },
];

function compactEvidence(subject: string, text: string, pattern: RegExp) {
  const source = `${subject ? `Subject: ${subject}. ` : ''}${text}`.replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const match = pattern.exec(source);
  if (!match || match.index === undefined) return source.slice(0, 140);
  const start = Math.max(0, match.index - 55);
  const end = Math.min(source.length, match.index + match[0].length + 75);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < source.length ? '…' : '';
  return `${prefix}${source.slice(start, end).trim()}${suffix}`.slice(0, 180);
}

function actionForIntent(key: string, leadId: string | null) {
  if (!leadId) return { actionLabel: null, actionHref: null };
  if (key === 'rfq') return { actionLabel: 'Start RFQ', actionHref: `/leads/${leadId}/rfq/new` };
  if (key === 'quote_acceptance') return { actionLabel: 'Review quote', actionHref: `/leads/${leadId}/quote` };
  if (key === 'follow_up') return { actionLabel: 'Open follow-up', actionHref: `/leads/${leadId}` };
  if (key === 'sample_request') return { actionLabel: 'Open lead', actionHref: `/leads/${leadId}` };
  if (key === 'purchase_order') return { actionLabel: 'Review lead / order context', actionHref: `/leads/${leadId}` };
  if (key === 'execution_risk') return { actionLabel: 'Review execution context', actionHref: `/leads/${leadId}` };
  return { actionLabel: 'Open lead', actionHref: `/leads/${leadId}` };
}

function detectIntent(subject: string, text: string, leadId: string | null): Intent[] {
  const value = `${subject}\n${text}`;
  const results: Intent[] = [];
  const push = (rule: IntentRule) => {
    const action = actionForIntent(rule.key, leadId);
    results.push({
      key: rule.key,
      label: rule.label,
      confidence: rule.confidence,
      suggestedAction: rule.suggestedAction,
      evidence: compactEvidence(subject, text, rule.pattern),
      ...action,
    });
  };

  const quoteAcceptance = /\b(approved|accept(?:ed)?|proceed|go ahead|confirmed)\b/i.test(value) && /\b(quote|quotation|proposal|price)\b/i.test(value);
  if (quoteAcceptance) {
    const pattern = /\b(approved|accept(?:ed)?|proceed|go ahead|confirmed|quote|quotation|proposal|price)\b/i;
    const action = actionForIntent('quote_acceptance', leadId);
    results.push({
      key: 'quote_acceptance',
      label: 'Quote acceptance',
      confidence: 'high',
      suggestedAction: 'Review the approved commercial terms before converting anything to an order.',
      evidence: compactEvidence(subject, text, pattern),
      ...action,
    });
  }

  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(value) && !results.some((item) => item.key === rule.key)) push(rule);
  }
  return results.slice(0, 4);
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const [{ data: grant }, { data: mailbox }] = await Promise.all([
    supabase.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    supabase.from('mail_mailboxes').select('id,address').eq('organization_id', organizationId).eq('user_id', workspace.user.id).eq('status', 'active').limit(1).maybeSingle(),
  ]);
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  const { data: message } = await supabase.from('mail_messages')
    .select('id,direction,from_address,to_addresses,subject,text_body')
    .eq('id', params.id)
    .eq('mailbox_id', mailbox.id)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  const peerAddress = String(message.direction === 'inbound' ? message.from_address : message.to_addresses?.[0] ?? '').trim().toLowerCase();
  let crmMatch: any = null;
  if (peerAddress) {
    const { data: lead } = await supabase.from('leads')
      .select('id,lead_type,company_name,contact_name,email,stage_id,owner_user_id')
      .eq('organization_id', organizationId)
      .ilike('email', peerAddress)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lead) crmMatch = { type: 'lead', ...lead, href: `/leads/${lead.id}` };
  }

  const createCrmHref = peerAddress
    ? `/leads?quickLead=1&leadType=buyer&sourceType=setu_mail&sourceLabel=${encodeURIComponent(`Setu Mail · ${peerAddress}`)}`
    : '/leads?quickLead=1&sourceType=setu_mail&sourceLabel=Setu%20Mail';

  return NextResponse.json({
    messageId: message.id,
    peerAddress,
    crmMatch,
    createCrmHref: crmMatch ? null : createCrmHref,
    intents: detectIntent(String(message.subject ?? ''), String(message.text_body ?? ''), crmMatch?.id ?? null),
    autonomousActions: false,
  });
}
