import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';
import { scoreFitAgainstIcp } from '@/lib/setu-guru/entity-research';

export type TradeEventLeadCard = {
  leadId: string;
  label: string;
  country: string | null;
  fitScore: number | null;
  reason: string;
};

export type TradeEventAssistant = {
  eventId: string;
  eventName: string;
  phase: 'pre_show' | 'during_show' | 'post_show';
  totalLeads: number;
  hotLeadCount: number;
  quotesNeeded: number;
  followUpsDue: number;
  preShowPriorityList: TradeEventLeadCard[];
  postShowFollowUpQueue: TradeEventLeadCard[];
  summary: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ageDays = (value?: string | null) => (value ? Math.floor((Date.now() - Date.parse(value)) / DAY_MS) : null);

function phaseFor(startsOn: string | null, endsOn: string | null): TradeEventAssistant['phase'] {
  const now = Date.now();
  if (startsOn && now < Date.parse(startsOn)) return 'pre_show';
  if (endsOn && now > Date.parse(endsOn)) return 'post_show';
  return 'during_show';
}

/**
 * Read-only across leads/quotes/rfqs/trade_events. Never sends anything and
 * never creates or edits CRM records — only surfaces which leads deserve
 * attention before, during, or after the event.
 */
export async function getTradeEventAssistant(orgId: string, eventId: string): Promise<TradeEventAssistant | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const [{ data: event, error: eventError }, icp] = await Promise.all([
    client.from('trade_events').select('id,name,starts_on,ends_on').eq('organization_id', orgId).eq('id', eventId).maybeSingle(),
    getIcpProfile(orgId),
  ]);

  if (eventError) throw eventError;
  if (!event) return null;

  const { data: leads, error: leadsError } = await client
    .from('leads')
    .select('id,company_name,contact_name,country,products_or_needs,lead_type,last_contacted_at,intro_sent,created_at')
    .eq('organization_id', orgId)
    .eq('trade_event_id', eventId)
    .limit(500);

  if (leadsError) throw leadsError;

  const leadRows = leads ?? [];
  const leadIds = leadRows.map((lead: any) => lead.id);

  const [{ data: quotes }, { data: shares }, { data: communications }] = await Promise.all([
    leadIds.length
      ? client.from('quotes').select('id,lead_id,sent_at,last_customer_response_at').eq('organization_id', orgId).in('lead_id', leadIds).limit(1000)
      : Promise.resolve({ data: [] }),
    leadIds.length
      ? client.from('catalog_shares').select('id,lead_id,last_opened_at').eq('organization_id', orgId).in('lead_id', leadIds).limit(1000)
      : Promise.resolve({ data: [] }),
    leadIds.length
      ? client.from('communications').select('id,lead_id,direction,created_at').eq('organization_id', orgId).in('lead_id', leadIds).limit(2000)
      : Promise.resolve({ data: [] }),
  ]);

  const quotesByLead = new Map<string, any[]>();
  for (const quote of quotes ?? []) {
    quotesByLead.set(quote.lead_id, [...(quotesByLead.get(quote.lead_id) ?? []), quote]);
  }
  const sharesByLead = new Map<string, any[]>();
  for (const share of shares ?? []) {
    sharesByLead.set(share.lead_id, [...(sharesByLead.get(share.lead_id) ?? []), share]);
  }
  const inboundByLead = new Map<string, any[]>();
  for (const communication of communications ?? []) {
    if (communication.direction !== 'inbound') continue;
    inboundByLead.set(communication.lead_id, [...(inboundByLead.get(communication.lead_id) ?? []), communication]);
  }

  const scoredLeads: Array<{ lead: any; fitScore: ReturnType<typeof scoreFitAgainstIcp> }> = leadRows.map((lead: any) => ({ lead, fitScore: scoreFitAgainstIcp(lead, icp) }));
  const hotLeadCount = scoredLeads.filter((item) => (item.fitScore?.score ?? 0) >= 65).length;
  const quotesNeeded = leadRows.filter((lead: any) => String(lead.lead_type ?? '').toLowerCase() !== 'supplier' && lead.products_or_needs && (quotesByLead.get(lead.id) ?? []).length === 0).length;

  const phase = phaseFor(event.starts_on, event.ends_on);

  const preShowPriorityList: TradeEventLeadCard[] = [...scoredLeads]
    .sort((a, b) => (b.fitScore?.score ?? 0) - (a.fitScore?.score ?? 0))
    .slice(0, 10)
    .map(({ lead, fitScore }) => ({
      leadId: lead.id,
      label: lead.company_name || lead.contact_name || 'Untitled lead',
      country: lead.country,
      fitScore: fitScore?.score ?? null,
      reason: fitScore ? fitScore.reasons.join(' ') || 'Scored against your ICP profile.' : 'Set up your ICP profile to prioritize this list.',
    }));

  const postShowFollowUpQueue: TradeEventLeadCard[] = leadRows
    .filter((lead: any) => {
      const noOutreach = !lead.last_contacted_at && !lead.intro_sent;
      const catalogOpenedNoReply = (sharesByLead.get(lead.id) ?? []).some((share: any) => share.last_opened_at) && !(inboundByLead.get(lead.id) ?? []).length;
      const quoteRequested = (quotesByLead.get(lead.id) ?? []).some((quote: any) => quote.sent_at && !quote.last_customer_response_at);
      return noOutreach || catalogOpenedNoReply || quoteRequested;
    })
    .map((lead: any) => {
      const noOutreach = !lead.last_contacted_at && !lead.intro_sent;
      const reason = noOutreach
        ? `No outreach sent since capture (${ageDays(lead.created_at) ?? 0} day(s) ago).`
        : (quotesByLead.get(lead.id) ?? []).some((quote: any) => quote.sent_at && !quote.last_customer_response_at)
          ? 'Quote sent, no response yet.'
          : 'Catalog opened, no reply yet.';
      return {
        leadId: lead.id,
        label: lead.company_name || lead.contact_name || 'Untitled lead',
        country: lead.country,
        fitScore: null,
        reason,
      };
    })
    .slice(0, 25);

  const followUpsDue = postShowFollowUpQueue.length;
  const supplierCount = leadRows.filter((lead: any) => String(lead.lead_type ?? '').toLowerCase() === 'supplier').length;

  const summaryParts = [
    `${leadRows.length} lead(s) captured at ${event.name}.`,
    hotLeadCount ? `${hotLeadCount} score as a strong ICP fit.` : icp ? 'None scored as a strong ICP fit yet.' : 'Set up your ICP profile for fit scoring.',
    quotesNeeded ? `${quotesNeeded} buyer(s) have product interest but no quote yet.` : '',
    followUpsDue ? `${followUpsDue} lead(s) need a follow-up action.` : 'No follow-ups are overdue right now.',
    supplierCount ? `${supplierCount} supplier lead(s) were also captured at this event.` : '',
  ].filter(Boolean);

  return {
    eventId: event.id,
    eventName: event.name,
    phase,
    totalLeads: leadRows.length,
    hotLeadCount,
    quotesNeeded,
    followUpsDue,
    preShowPriorityList,
    postShowFollowUpQueue,
    summary: summaryParts.join(' '),
  };
}
