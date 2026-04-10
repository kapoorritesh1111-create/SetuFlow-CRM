import { computeLeadHealth } from '@/lib/lead-health';

export function getPipelineAgingMetrics(records: Array<{ created_at: string; updated_at: string; stage_id?: string | null }>) {
  const now = Date.now();
  const buckets = { under14: 0, days14to30: 0, over30: 0 };
  for (const record of records) {
    const anchor = new Date(record.updated_at || record.created_at).getTime();
    if (!Number.isFinite(anchor)) continue;
    const ageDays = Math.floor((now - anchor) / (1000 * 60 * 60 * 24));
    if (ageDays < 14) buckets.under14 += 1;
    else if (ageDays <= 30) buckets.days14to30 += 1;
    else buckets.over30 += 1;
  }
  return buckets;
}

export function getAccountConversionMetrics(
  leads: Array<{ id: string; stage_id?: string | null }>,
  rfqs: Array<{ lead_id: string | null }>,
  quotes: Array<{ lead_id: string }>,
) {
  const rfqLeadIds = new Set(rfqs.map((rfq) => rfq.lead_id).filter(Boolean));
  const quoteLeadIds = new Set(quotes.map((quote) => quote.lead_id));
  return {
    totalAccounts: leads.length,
    leadsWithRfq: leads.filter((lead) => rfqLeadIds.has(lead.id)).length,
    rfqCount: rfqs.length,
    quoteCount: quotes.length,
    leadsWithQuote: leads.filter((lead) => quoteLeadIds.has(lead.id)).length,
  };
}

export function getResponseTimeMetrics(
  rfqs: Array<{ created_at: string | null; updated_at: string | null }>,
  quotes: Array<{ created_at: string; updated_at: string }>,
) {
  const samples = [...rfqs.map((rfq) => ({ start: rfq.created_at, end: rfq.updated_at })), ...quotes.map((quote) => ({ start: quote.created_at, end: quote.updated_at }))]
    .map((item) => {
      const start = item.start ? new Date(item.start).getTime() : NaN;
      const end = item.end ? new Date(item.end).getTime() : NaN;
      return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / (1000 * 60 * 60) : null;
    })
    .filter((value): value is number => value !== null);

  if (!samples.length) return { sampleSize: 0, medianHours: null as number | null };
  const ordered = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  const medianHours = ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
  return { sampleSize: ordered.length, medianHours: Math.round(medianHours * 10) / 10 };
}

export function getOwnerPerformanceMetrics(
  leads: Array<{ id: string; owner_user_id?: string | null; created_at: string; updated_at: string; next_follow_up_at?: string | null; last_contacted_at?: string | null }>,
  profiles: Array<{ id: string; full_name: string | null; username: string | null }>,
  activities: Array<{ lead_id: string; occurred_at: string }>,
  rfqs: Array<{ lead_id: string | null }>,
  quotes: Array<{ lead_id: string }>,
) {
  const activityMap = new Map<string, string>();
  for (const activity of activities) {
    const current = activityMap.get(activity.lead_id);
    if (!current || activity.occurred_at > current) activityMap.set(activity.lead_id, activity.occurred_at);
  }
  const rfqLeadIds = new Set(rfqs.map((rfq) => rfq.lead_id).filter(Boolean));
  const quoteLeadIds = new Set(quotes.map((quote) => quote.lead_id));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile.full_name ?? profile.username ?? 'Unassigned']));

  const ownerMap = new Map<string, { ownerName: string; activeAccounts: number; leadsWithRfq: number; leadsWithQuote: number; atRisk: number }>();

  for (const lead of leads) {
    const ownerId = lead.owner_user_id ?? 'unassigned';
    const current = ownerMap.get(ownerId) ?? { ownerName: ownerId === 'unassigned' ? 'Unassigned' : profileMap.get(ownerId) ?? 'Unknown owner', activeAccounts: 0, leadsWithRfq: 0, leadsWithQuote: 0, atRisk: 0 };
    current.activeAccounts += 1;
    if (rfqLeadIds.has(lead.id)) current.leadsWithRfq += 1;
    if (quoteLeadIds.has(lead.id)) current.leadsWithQuote += 1;
    const health = computeLeadHealth({
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      next_follow_up_at: lead.next_follow_up_at ?? null,
      last_contacted_at: lead.last_contacted_at ?? null,
      lastActivityAt: activityMap.get(lead.id) ?? null,
    });
    if (health === 'at_risk' || health === 'stalled') current.atRisk += 1;
    ownerMap.set(ownerId, current);
  }

  return Array.from(ownerMap.values()).sort((a, b) => b.activeAccounts - a.activeAccounts);
}
