import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { matchCommunicationIdentity, primaryIdentityMatch } from '@/lib/contacts/identity';

export const dynamic = 'force-dynamic';

type Confidence = 'high' | 'medium';
type EvidenceSource = 'subject' | 'message' | 'attachment' | 'crm';
type IntentEvidence = { source: EvidenceSource; label: string; text: string };
type Intent = {
  key: string;
  label: string;
  confidence: Confidence;
  suggestedAction: string;
  evidence: string;
  evidenceSources: IntentEvidence[];
  actionLabel: string | null;
  actionHref: string | null;
  requiresReview: true;
};
type IntentRule = {
  key: string;
  label: string;
  confidence: Confidence;
  suggestedAction: string;
  pattern: RegExp;
  attachmentPattern?: RegExp;
};
type RelatedContext = {
  lead: any | null;
  quote: any | null;
  order: any | null;
  followUp: any | null;
  attachments: Array<{ id: string; filename: string; content_type: string | null; size_bytes: number | null; security_status: string | null }>;
};
type ActionContext = {
  leadId: string | null;
  peer: string;
  threadId: string | null;
  messageId: string;
  createLeadHref: string;
  quote: any | null;
  order: any | null;
};

const RULES: IntentRule[] = [
  {
    key: 'meeting',
    label: 'Meeting request',
    confidence: 'high',
    suggestedAction: 'Review the conversation and schedule a meeting.',
    pattern: /\b(meet|meeting|schedule a call|book a call|available (?:on|for)|calendar invite|zoom)\b/i,
  },
  {
    key: 'rfq',
    label: 'RFQ / pricing request',
    confidence: 'high',
    suggestedAction: 'Review the request and start the commercial workflow with the message context carried forward.',
    pattern: /\b(rfq|request for (?:a )?(?:quote|quotation)|quotation required|pricing request|please (?:send|share|provide)(?: us| me)? (?:a )?(?:quote|quotation)|please quote|price for|pricing for)\b/i,
    attachmentPattern: /(?:^|[\s_.-])(rfq|request[\s_.-]*for[\s_.-]*(?:quote|quotation))(?:[\s_.-]|$)/i,
  },
  {
    key: 'purchase_order',
    label: 'Purchase order',
    confidence: 'high',
    suggestedAction: 'Review the PO against the latest quote/order context before changing execution state.',
    pattern: /\b(purchase order|attached p\.?\s*o\.?|p\.?\s*o\.?\s*(?:no\.?|number|#)|please find (?:the )?p\.?\s*o\.?|po attached|order confirmation)\b/i,
    attachmentPattern: /(?:^|[\s_.-])(po|purchase[\s_.-]*order)(?:[\s_.#-]|$)/i,
  },
  {
    key: 'follow_up',
    label: 'Follow-up needed',
    confidence: 'medium',
    suggestedAction: 'Review the conversation and confirm or schedule the next follow-up.',
    pattern: /\b(follow up|following up|checking in|any update|status update|please update|haven't heard|have not heard|awaiting (?:your )?(?:reply|response|update))\b/i,
  },
  {
    key: 'shipment_risk',
    label: 'Shipment / execution risk',
    confidence: 'high',
    suggestedAction: 'Review the linked order and execution timeline before making a customer commitment.',
    pattern: /\b(delay(?:ed)?|late shipment|shipment delayed|shipping delay|dispatch delay|delivery delay|miss(?:ed|ing) (?:ship|dispatch|delivery) date|cannot meet|can't meet|production delay|production issue|shortage|stockout|port congestion|customs hold|held at customs|container unavailable|vessel delay|eta slipped|delivery risk)\b/i,
  },
  {
    key: 'sample_request',
    label: 'Sample request',
    confidence: 'medium',
    suggestedAction: 'Review the lead and capture the sample requirement as the next action.',
    pattern: /\b(sample request|send (?:a )?sample|send samples|samples required|sample order|need (?:a )?sample)\b/i,
  },
];

const ACCEPTANCE_PATTERN = /\b(approved|accept(?:ed)?|we accept|please proceed|proceed|go ahead|confirmed|looks good|we agree|ready to move forward|move forward)\b/i;
const QUOTE_PATTERN = /\b(quote|quotation|proposal|offer|commercial terms|pricing)\b/i;
const CLOSED_FOLLOW_UP = new Set(['completed', 'complete', 'done', 'cancelled', 'canceled', 'closed']);
const CLOSED_ORDER = new Set(['completed', 'complete', 'cancelled', 'canceled']);
const COMMERCIAL_QUOTE = new Set(['sent', 'sent_follow_up', 'approved', 'accepted']);

function clean(value: unknown, limit = 180) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1)).trim()}…` : text;
}

function snippet(value: string, pattern: RegExp, limit = 180) {
  const text = clean(value, 4000);
  const match = pattern.exec(text);
  if (!match) return clean(text, limit);
  const start = Math.max(0, match.index - 55);
  const end = Math.min(text.length, match.index + match[0].length + 80);
  const excerpt = `${start ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
  return clean(excerpt, limit);
}

function messageEvidence(subject: string, text: string, pattern: RegExp): IntentEvidence | null {
  if (pattern.test(subject)) return { source: 'subject', label: 'Subject', text: snippet(subject, pattern) };
  if (pattern.test(text)) return { source: 'message', label: 'Message', text: snippet(text, pattern) };
  return null;
}

function attachmentEvidence(attachments: RelatedContext['attachments'], pattern?: RegExp): IntentEvidence | null {
  if (!pattern) return null;
  const match = attachments.find((attachment) => pattern.test(String(attachment.filename ?? '')));
  if (!match) return null;
  const security = String(match.security_status ?? '').toLowerCase();
  const suffix = security && security !== 'clean' ? ` (${security})` : '';
  return { source: 'attachment', label: 'Attachment', text: `${clean(match.filename, 120)}${suffix}` };
}

function quoteEvidence(quote: any | null): IntentEvidence | null {
  if (!quote) return null;
  const number = quote.quote_number ? ` ${quote.quote_number}` : '';
  const status = clean(quote.status || 'unknown', 50);
  return { source: 'crm', label: 'CRM quote', text: `Quote${number} is ${status}.` };
}

function orderEvidence(order: any | null): IntentEvidence | null {
  if (!order) return null;
  const number = order.order_number ? ` ${order.order_number}` : '';
  const stage = clean(order.current_stage || order.order_lifecycle_status || order.status || 'active', 70);
  return { source: 'crm', label: 'CRM order', text: `Order${number} is at ${stage}.` };
}

function followUpEvidence(followUp: any | null): IntentEvidence | null {
  if (!followUp) return null;
  const when = followUp.scheduled_at ? new Date(followUp.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }) : 'a scheduled time';
  return { source: 'crm', label: 'CRM follow-up', text: `An open follow-up is scheduled for ${when}.` };
}

function evidenceText(items: Array<IntentEvidence | null>) {
  return items.filter((item): item is IntentEvidence => Boolean(item)).slice(0, 3).map((item) => `${item.label}: ${item.text}`).join(' · ');
}

function withMailContext(href: string, context: Pick<ActionContext, 'messageId' | 'threadId'>) {
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('source', 'setu_mail');
  params.set('mailMessage', context.messageId);
  if (context.threadId) params.set('mailThread', context.threadId);
  return `${path}?${params.toString()}`;
}

function action(key: string, context: ActionContext) {
  if (key === 'meeting') {
    const params = new URLSearchParams({ compose: '1' });
    if (context.peer) params.set('guest', context.peer);
    if (context.leadId) params.set('lead', context.leadId);
    if (context.threadId) params.set('mailThread', context.threadId);
    return { actionLabel: 'Schedule meeting', actionHref: `/calendar?${params.toString()}` };
  }
  if (!context.leadId) return { actionLabel: 'Create buyer lead', actionHref: context.createLeadHref };
  if (key === 'rfq') return { actionLabel: 'Start RFQ', actionHref: withMailContext(`/leads/${context.leadId}/rfq/new`, context) };
  if (key === 'quote_acceptance') {
    const href = context.quote?.id ? `/quotes?focus=${encodeURIComponent(context.quote.id)}` : `/leads/${context.leadId}/quote`;
    return { actionLabel: 'Review quote acceptance', actionHref: withMailContext(href, context) };
  }
  if (key === 'purchase_order') {
    if (context.order?.id) return { actionLabel: 'Review order', actionHref: withMailContext(`/orders?focus=${encodeURIComponent(context.order.id)}`, context) };
    if (context.quote?.id) return { actionLabel: 'Review quote before handoff', actionHref: withMailContext(`/quotes?focus=${encodeURIComponent(context.quote.id)}`, context) };
    return { actionLabel: 'Review buyer record', actionHref: withMailContext(`/leads/${context.leadId}`, context) };
  }
  if (key === 'shipment_risk') {
    if (context.order?.id) return { actionLabel: 'Review order risk', actionHref: withMailContext(`/orders?focus=${encodeURIComponent(context.order.id)}`, context) };
    return { actionLabel: 'Review execution context', actionHref: withMailContext(`/leads/${context.leadId}?tab=workflow&handoff=mail-risk`, context) };
  }
  if (key === 'follow_up') return { actionLabel: 'Review follow-up', actionHref: withMailContext(`/leads/${context.leadId}?tab=workflow&handoff=follow-up`, context) };
  if (key === 'sample_request') return { actionLabel: 'Review sample need', actionHref: withMailContext(`/leads/${context.leadId}?tab=workflow`, context) };
  return { actionLabel: 'Open buyer record', actionHref: withMailContext(`/leads/${context.leadId}`, context) };
}

function intent(rule: IntentRule, evidenceSources: IntentEvidence[], actionContext: ActionContext): Intent {
  return {
    key: rule.key,
    label: rule.label,
    confidence: rule.confidence,
    suggestedAction: rule.suggestedAction,
    evidence: evidenceText(evidenceSources),
    evidenceSources,
    ...action(rule.key, actionContext),
    requiresReview: true,
  };
}

function detect(subject: string, text: string, direction: string, context: RelatedContext, actionContext: ActionContext): Intent[] {
  const out: Intent[] = [];
  const acceptance = messageEvidence(subject, text, ACCEPTANCE_PATTERN);
  const quoteMention = messageEvidence(subject, text, QUOTE_PATTERN);
  const quoteSupportsAcceptance = Boolean(context.quote && COMMERCIAL_QUOTE.has(String(context.quote.status ?? '').toLowerCase()));

  if (direction === 'inbound' && acceptance && (quoteMention || quoteSupportsAcceptance)) {
    const evidenceSources = [acceptance, quoteMention, quoteSupportsAcceptance ? quoteEvidence(context.quote) : null].filter((item): item is IntentEvidence => Boolean(item));
    out.push({
      key: 'quote_acceptance',
      label: 'Quote acceptance',
      confidence: quoteMention || quoteSupportsAcceptance ? 'high' : 'medium',
      suggestedAction: 'Review the customer response against the latest quote before accepting terms or allowing order handoff.',
      evidence: evidenceText(evidenceSources),
      evidenceSources,
      ...action('quote_acceptance', actionContext),
      requiresReview: true,
    });
  }

  for (const rule of RULES) {
    const bodyEvidence = messageEvidence(subject, text, rule.pattern);
    const fileEvidence = attachmentEvidence(context.attachments, rule.attachmentPattern);
    if (!bodyEvidence && !fileEvidence) continue;
    if (out.some((item) => item.key === rule.key)) continue;
    const contextual: Array<IntentEvidence | null> = [bodyEvidence, fileEvidence];
    if (rule.key === 'rfq' || rule.key === 'purchase_order') contextual.push(quoteEvidence(context.quote));
    if (rule.key === 'purchase_order' || rule.key === 'shipment_risk') contextual.push(orderEvidence(context.order));
    if (rule.key === 'follow_up') contextual.push(followUpEvidence(context.followUp));
    out.push(intent(rule, contextual.filter((item): item is IntentEvidence => Boolean(item)), actionContext));
  }

  if (actionContext.peer && !out.some((item) => item.key === 'meeting')) {
    const evidenceSources: IntentEvidence[] = [{ source: 'crm', label: 'Conversation', text: 'The sender can be carried into Calendar with the Mail thread and matched CRM context.' }];
    out.push({
      key: 'schedule_meeting',
      label: 'Schedule meeting',
      confidence: 'medium',
      suggestedAction: 'Schedule time from this conversation when a live discussion would help.',
      evidence: evidenceText(evidenceSources),
      evidenceSources,
      ...action('meeting', actionContext),
      requiresReview: true,
    });
  }

  return out.slice(0, 6);
}

function senderName(metadata: any) {
  const raw = String(metadata?.headers?.from ?? '');
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);
  return match?.[1]?.trim() || '';
}

function explicitLeadShape(row: any) {
  if (!row?.id) return null;
  const leadType = String(row.lead_type ?? '').toLowerCase();
  return {
    type: leadType === 'buyer' ? 'buyer' : leadType === 'supplier' ? 'supplier' : 'lead',
    id: String(row.id),
    lead_type: row.lead_type ?? null,
    company_name: row.company_name ?? null,
    contact_name: row.contact_name ?? null,
    email: row.email ?? null,
    job_title: row.job_title ?? null,
    href: `/leads/${row.id}`,
  };
}

async function relatedContext(db: any, organizationId: string, mailboxId: string, messageId: string, lead: any | null): Promise<RelatedContext> {
  const attachmentsPromise = db.from('mail_attachments')
    .select('id,filename,content_type,size_bytes,security_status')
    .eq('organization_id', organizationId)
    .eq('mailbox_id', mailboxId)
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });

  if (!lead?.id) {
    const { data: attachments } = await attachmentsPromise;
    return { lead: null, quote: null, order: null, followUp: null, attachments: attachments ?? [] };
  }

  const [attachmentsResult, quotesResult, ordersResult, followUpsResult] = await Promise.all([
    attachmentsPromise,
    db.from('quotes')
      .select('id,quote_number,status,accepted_version_id,sent_at,valid_until,follow_up_at,last_customer_response_at,archived_at,updated_at')
      .eq('organization_id', organizationId)
      .eq('lead_id', lead.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(5),
    db.from('orders')
      .select('id,order_number,status,current_stage,order_lifecycle_status,fulfillment_status,dispatch_status,buyer_reference,updated_at')
      .eq('organization_id', organizationId)
      .eq('lead_id', lead.id)
      .order('updated_at', { ascending: false })
      .limit(5),
    db.from('lead_follow_ups')
      .select('id,scheduled_at,status,notes,created_at')
      .eq('organization_id', organizationId)
      .eq('lead_id', lead.id)
      .order('scheduled_at', { ascending: false })
      .limit(10),
  ]);

  const quoteRows = quotesResult.data ?? [];
  const orderRows = ordersResult.data ?? [];
  const followUpRows = followUpsResult.data ?? [];
  const quote = quoteRows.find((row: any) => COMMERCIAL_QUOTE.has(String(row.status ?? '').toLowerCase())) ?? quoteRows[0] ?? null;
  const order = orderRows.find((row: any) => !CLOSED_ORDER.has(String(row.order_lifecycle_status || row.status || '').toLowerCase())) ?? orderRows[0] ?? null;
  const followUp = followUpRows.find((row: any) => !CLOSED_FOLLOW_UP.has(String(row.status ?? '').toLowerCase())) ?? null;
  return { lead, quote, order, followUp, attachments: attachmentsResult.data ?? [] };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const [{ data: grant }, mailbox] = await Promise.all([
    db.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    resolveUserMailbox(db, organizationId, workspace.user.id, 'id,address,status'),
  ]);
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Communications is not enabled for this organization.' }, { status: 403 });
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  const { data: message } = await db.from('mail_messages')
    .select('id,direction,from_address,to_addresses,subject,text_body,thread_id,metadata')
    .eq('id', params.id)
    .eq('organization_id', organizationId)
    .eq('mailbox_id', mailbox.id)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  const peer = String(message.direction === 'inbound' ? message.from_address : message.to_addresses?.[0] ?? '').trim().toLowerCase();
  const identity = await matchCommunicationIdentity(db, organizationId, peer);
  const { data: explicitLinks } = message.thread_id
    ? await db.from('mail_crm_links').select('id,entity_type,entity_id,created_at').eq('organization_id', organizationId).eq('mailbox_id', mailbox.id).eq('thread_id', message.thread_id)
    : { data: [] };

  let lead: any | null = identity.records[0] ?? null;
  if (!lead) {
    const explicitLead = (explicitLinks ?? []).find((link: any) => ['lead', 'buyer', 'supplier'].includes(String(link.entity_type ?? '').toLowerCase()));
    if (explicitLead?.entity_id) {
      const { data: row } = await db.from('leads')
        .select('id,lead_type,company_name,contact_name,email,job_title')
        .eq('organization_id', organizationId)
        .eq('id', explicitLead.entity_id)
        .maybeSingle();
      lead = explicitLeadShape(row);
    }
  }

  const primary = primaryIdentityMatch(identity) ?? lead;
  const relationship = identity.contact?.relationship_type ? ` · ${identity.contact.relationship_type}` : '';
  const crmMatch = primary ? {
    ...primary,
    company_name: identity.contact ? `${identity.contact.company || primary.company_name || identity.contact.email}${relationship}` : primary.company_name,
    href: `/mail/crm-context/${message.id}`,
  } : null;

  const createLeadType = String(identity.contact?.relationship_type ?? '').toLowerCase().includes('supplier') ? 'supplier' : 'buyer';
  const createLeadHref = peer
    ? `/leads?quickLead=1&leadType=${createLeadType}&sourceType=setu_mail&sourceLabel=${encodeURIComponent(`Setu Mail · ${peer}`)}`
    : `/leads?quickLead=1&leadType=${createLeadType}&sourceType=setu_mail&sourceLabel=Setu%20Mail`;
  const name = senderName(message.metadata);
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? '';
  const lastName = parts.join(' ');
  const createContactHref = identity.contact ? null : `/contacts?create=1&email=${encodeURIComponent(peer)}${firstName ? `&firstName=${encodeURIComponent(firstName)}` : ''}${lastName ? `&lastName=${encodeURIComponent(lastName)}` : ''}`;

  const context = await relatedContext(db, organizationId, mailbox.id, message.id, lead);
  const actionContext: ActionContext = {
    leadId: lead?.id ?? null,
    peer,
    threadId: message.thread_id,
    messageId: message.id,
    createLeadHref,
    quote: context.quote,
    order: context.order,
  };
  const intents = detect(String(message.subject ?? ''), String(message.text_body ?? ''), String(message.direction ?? ''), context, actionContext);

  if (message.direction === 'inbound' && peer && !identity.contact && createContactHref) {
    const evidenceSources: IntentEvidence[] = [{ source: 'message', label: 'Sender', text: name ? `${name} · ${peer}` : peer }];
    intents.unshift({
      key: 'save_contact',
      label: 'Save sender to Contacts',
      confidence: 'high',
      suggestedAction: 'Keep this sender available for future Mail and Calendar conversations without creating a Lead.',
      evidence: evidenceText(evidenceSources),
      evidenceSources,
      actionLabel: 'Create contact',
      actionHref: createContactHref,
      requiresReview: true,
    });
  }

  return NextResponse.json({
    messageId: message.id,
    mailThreadId: message.thread_id,
    peerAddress: peer,
    identity,
    crmMatch,
    explicitLinks: explicitLinks ?? [],
    createContactHref,
    createLeadHref,
    createCrmHref: lead ? null : createLeadHref,
    contextHref: `/mail/crm-context/${message.id}`,
    relatedContext: {
      lead: context.lead ? { id: context.lead.id, type: context.lead.type ?? context.lead.lead_type ?? 'lead', company_name: context.lead.company_name ?? null, contact_name: context.lead.contact_name ?? null } : null,
      quote: context.quote ? { id: context.quote.id, quote_number: context.quote.quote_number ?? null, status: context.quote.status ?? null, valid_until: context.quote.valid_until ?? null } : null,
      order: context.order ? { id: context.order.id, order_number: context.order.order_number ?? null, status: context.order.status ?? null, current_stage: context.order.current_stage ?? null, order_lifecycle_status: context.order.order_lifecycle_status ?? null } : null,
      followUp: context.followUp ? { id: context.followUp.id, scheduled_at: context.followUp.scheduled_at ?? null, status: context.followUp.status ?? null } : null,
      attachments: context.attachments.map((attachment) => ({ id: attachment.id, filename: attachment.filename, content_type: attachment.content_type, security_status: attachment.security_status })),
    },
    intents: intents.slice(0, 7),
    autonomousActions: false,
    reviewRequired: true,
    intelligenceVersion: 's41-mail-009',
  });
}
