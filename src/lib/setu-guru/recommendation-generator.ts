import { createClient } from '@/lib/supabase/server';

export type GeneratedRecommendation = {
  org_id: string;
  entity_type: 'lead' | 'buyer' | 'supplier' | 'quote' | 'rfq' | 'trade_event';
  entity_id: string;
  recommendation_type:
    | 'lead_no_outreach'
    | 'quote_no_follow_up'
    | 'trade_event_lead_not_contacted'
    | 'supplier_document_gap'
    | 'buyer_quote_request'
    | 'catalog_sent_no_reply'
    | 'supplier_rfq_overdue'
    | 'deal_stuck_in_stage';
  title: string;
  summary: string;
  reason: string;
  recommended_action: string;
  action_href: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata: Record<string, unknown>;
};

type GeneratorResult = {
  generated: number;
  inserted: number;
  completed: number;
  expired: number;
  skippedDuplicates: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const nowMs = () => Date.now();
const ageDays = (value?: string | null) => (value ? Math.floor((nowMs() - Date.parse(value)) / DAY_MS) : Number.POSITIVE_INFINITY);
const keyOf = (item: Pick<GeneratedRecommendation, 'recommendation_type' | 'entity_type' | 'entity_id'>) =>
  `${item.recommendation_type}:${item.entity_type}:${item.entity_id}`;

export async function generateRecommendationsForOrganization(orgId: string): Promise<GeneratorResult> {
  const supabase = await createClient();
  const client = supabase as any;

  const [leadsResult, quotesResult, rfqsResult, sharesResult, communicationsResult, documentsResult, openResult] = await Promise.all([
    client.from('leads').select('id,lead_type,company_name,contact_name,products_or_needs,trade_event_id,intro_sent,last_contacted_at,next_follow_up_at,stage_id,deal_value,created_at,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('quotes').select('id,lead_id,status,sent_at,follow_up_at,last_customer_response_at,created_at,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('rfqs').select('id,lead_id,status,validity_date,created_at,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('catalog_shares').select('id,lead_id,status,last_opened_at,created_at,updated_at').eq('organization_id', orgId).limit(1000),
    client.from('communications').select('id,lead_id,direction,status,sent_at,created_at').eq('organization_id', orgId).limit(2000),
    client.from('documents').select('id,related_entity,related_id,status,expires_at').eq('organization_id', orgId).limit(2000),
    client.from('ai_recommendations').select('id,entity_type,entity_id,recommendation_type,created_at').eq('org_id', orgId).eq('status', 'open').limit(2000),
  ]);

  for (const result of [leadsResult, quotesResult, rfqsResult, sharesResult, communicationsResult, documentsResult, openResult]) {
    if (result.error) throw result.error;
  }

  const leads = leadsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const rfqs = rfqsResult.data ?? [];
  const shares = sharesResult.data ?? [];
  const communications = communicationsResult.data ?? [];
  const documents = documentsResult.data ?? [];
  const existingOpen = openResult.data ?? [];

  const quotesByLead = new Map<string, any[]>();
  for (const quote of quotes) {
    if (!quote.lead_id) continue;
    quotesByLead.set(quote.lead_id, [...(quotesByLead.get(quote.lead_id) ?? []), quote]);
  }
  const inboundByLead = new Map<string, any[]>();
  for (const communication of communications) {
    if (!communication.lead_id || communication.direction !== 'inbound') continue;
    inboundByLead.set(communication.lead_id, [...(inboundByLead.get(communication.lead_id) ?? []), communication]);
  }
  const docsByLead = new Map<string, any[]>();
  for (const document of documents) {
    if (document.related_entity !== 'lead' || !document.related_id) continue;
    docsByLead.set(document.related_id, [...(docsByLead.get(document.related_id) ?? []), document]);
  }

  const generated: GeneratedRecommendation[] = [];
  const push = (item: GeneratedRecommendation) => {
    if (!generated.some((existing) => keyOf(existing) === keyOf(item))) generated.push(item);
  };

  for (const lead of leads) {
    const label = lead.company_name || lead.contact_name || 'This lead';
    const isSupplier = String(lead.lead_type ?? '').toLowerCase() === 'supplier';
    const isBuyer = !isSupplier;
    const noOutreach = !lead.last_contacted_at && !lead.intro_sent && ageDays(lead.created_at) >= 1;

    if (isBuyer && noOutreach) {
      push({ org_id: orgId, entity_type: 'lead', entity_id: lead.id, recommendation_type: 'lead_no_outreach', title: `Start outreach to ${label}`, summary: 'This buyer lead has been captured but no outreach is recorded.', reason: `The lead was created ${ageDays(lead.created_at)} day(s) ago and has no introduction or contact activity.`, recommended_action: 'Open the buyer lead and prepare the first approved outreach.', action_href: `/leads/${lead.id}`, priority: ageDays(lead.created_at) >= 3 ? 'high' : 'medium', metadata: { source: 'deterministic_rule' } });
    }

    if (lead.trade_event_id && noOutreach) {
      push({ org_id: orgId, entity_type: 'trade_event', entity_id: lead.id, recommendation_type: 'trade_event_lead_not_contacted', title: `Follow up with ${label} after the trade event`, summary: 'A trade-event lead is at risk of going cold.', reason: 'The lead is linked to a trade event and no follow-up activity is recorded.', recommended_action: 'Open the lead and prepare a trade-event follow-up.', action_href: `/leads/${lead.id}`, priority: ageDays(lead.created_at) >= 3 ? 'urgent' : 'high', metadata: { trade_event_id: lead.trade_event_id } });
    }

    if (isSupplier && (docsByLead.get(lead.id) ?? []).length === 0) {
      push({ org_id: orgId, entity_type: 'supplier', entity_id: lead.id, recommendation_type: 'supplier_document_gap', title: `Collect supplier documents from ${label}`, summary: 'No supplier compliance or capability documents are linked to this supplier.', reason: 'The supplier record has no linked documents in the CRM.', recommended_action: 'Open the supplier record and request the required documents.', action_href: `/leads/${lead.id}`, priority: 'high', metadata: { source: 'document_gap' } });
    }

    if (isBuyer && lead.products_or_needs && (quotesByLead.get(lead.id) ?? []).length === 0) {
      push({ org_id: orgId, entity_type: 'buyer', entity_id: lead.id, recommendation_type: 'buyer_quote_request', title: `Prepare a quote for ${label}`, summary: 'The buyer has product needs recorded but no quote exists.', reason: 'Products or requirements are present on the buyer lead and no linked quote was found.', recommended_action: 'Open the buyer lead and create a user-approved quote.', action_href: `/leads/${lead.id}/quote`, priority: 'high', metadata: { source: 'buyer_need_without_quote' } });
    }

    if (lead.stage_id && ageDays(lead.updated_at) >= 14) {
      push({ org_id: orgId, entity_type: isSupplier ? 'supplier' : 'lead', entity_id: lead.id, recommendation_type: 'deal_stuck_in_stage', title: `Review stalled progress for ${label}`, summary: 'This CRM record has not moved recently.', reason: `The record has a pipeline stage and has not been updated for ${ageDays(lead.updated_at)} day(s).`, recommended_action: 'Open the record and confirm the next step or update its stage.', action_href: `/leads/${lead.id}`, priority: ageDays(lead.updated_at) >= 30 ? 'high' : 'medium', metadata: { stage_id: lead.stage_id } });
    }
  }

  for (const quote of quotes) {
    if (!quote.sent_at || quote.last_customer_response_at || ageDays(quote.sent_at) < 3) continue;
    push({ org_id: orgId, entity_type: 'quote', entity_id: quote.id, recommendation_type: 'quote_no_follow_up', title: 'Follow up on a sent quote', summary: 'A sent quote has no recorded buyer response.', reason: `The quote was sent ${ageDays(quote.sent_at)} day(s) ago and no customer response is recorded.`, recommended_action: 'Open the quote and prepare an approved follow-up.', action_href: `/quotes/${quote.id}`, priority: ageDays(quote.sent_at) >= 7 ? 'high' : 'medium', metadata: { lead_id: quote.lead_id } });
  }

  for (const share of shares) {
    if (!share.lead_id || !share.last_opened_at || ageDays(share.last_opened_at) < 3) continue;
    const replies = inboundByLead.get(share.lead_id) ?? [];
    const hasReplyAfterOpen = replies.some((reply) => Date.parse(reply.sent_at || reply.created_at) > Date.parse(share.last_opened_at));
    if (hasReplyAfterOpen) continue;
    push({ org_id: orgId, entity_type: 'buyer', entity_id: share.lead_id, recommendation_type: 'catalog_sent_no_reply', title: 'Follow up after the buyer opened the catalog', summary: 'The buyer opened a shared catalog but no reply is recorded.', reason: `The catalog was last opened ${ageDays(share.last_opened_at)} day(s) ago without a later inbound communication.`, recommended_action: 'Open the buyer lead and prepare a catalog follow-up.', action_href: `/leads/${share.lead_id}`, priority: 'medium', metadata: { catalog_share_id: share.id } });
  }

  for (const rfq of rfqs) {
    const lead = leads.find((item: any) => item.id === rfq.lead_id);
    if (!lead || String(lead.lead_type ?? '').toLowerCase() !== 'supplier') continue;
    const overdueByDate = rfq.validity_date && Date.parse(rfq.validity_date) < nowMs();
    const stalePending = !['completed', 'closed', 'approved'].includes(String(rfq.status ?? '').toLowerCase()) && ageDays(rfq.updated_at) >= 7;
    if (!overdueByDate && !stalePending) continue;
    push({ org_id: orgId, entity_type: 'rfq', entity_id: rfq.id, recommendation_type: 'supplier_rfq_overdue', title: 'Review an overdue supplier RFQ', summary: 'A supplier cost request needs attention.', reason: overdueByDate ? 'The RFQ validity date has passed.' : `The RFQ has not been updated for ${ageDays(rfq.updated_at)} day(s).`, recommended_action: 'Open the supplier RFQ and request or review the response.', action_href: `/leads/${rfq.lead_id}/rfq`, priority: overdueByDate ? 'urgent' : 'high', metadata: { lead_id: rfq.lead_id } });
  }

  const generatedKeys = new Set(generated.map(keyOf));
  let completed = 0;
  let expired = 0;
  for (const existing of existingOpen) {
    const existingKey = keyOf(existing as GeneratedRecommendation);
    const isExpired = ageDays(existing.created_at) >= 30;
    if (!isExpired && generatedKeys.has(existingKey)) continue;
    const status = isExpired ? 'expired' : 'completed';
    const patch = status === 'expired' ? { status, expired_at: new Date().toISOString() } : { status, completed_at: new Date().toISOString() };
    const { error } = await client.from('ai_recommendations').update(patch).eq('id', existing.id).eq('org_id', orgId).eq('status', 'open');
    if (error) throw error;
    if (status === 'expired') expired += 1;
    else completed += 1;
  }

  const existingKeys = new Set(existingOpen.map((item: any) => keyOf(item)));
  const toInsert = generated.filter((item) => !existingKeys.has(keyOf(item)));
  let inserted = 0;
  let skippedDuplicates = generated.length - toInsert.length;
  for (const recommendation of toInsert) {
    const { error } = await client.from('ai_recommendations').insert(recommendation);
    if (!error) inserted += 1;
    else if (error.code === '23505') skippedDuplicates += 1;
    else throw error;
  }

  return { generated: generated.length, inserted, completed, expired, skippedDuplicates };
}
