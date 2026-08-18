import { createClient } from '@/lib/supabase/server';
import { getTradeShowTrialCapabilityState } from '@/lib/trial/trade-show-trial-capabilities';
import { formatDate } from '@/lib/utils';

function dateLabel(start?: string | null, end?: string | null) {
  if (!start && !end) return 'Dates not set';
  if (start && (!end || start === end)) return formatDate(start);
  if (!start && end) return formatDate(end);
  return `${formatDate(start)} to ${formatDate(end)}`;
}

export async function getTradeEventCapturePageData(organizationId: string, requestedEventId = '') {
  const supabase = await createClient();
  const db: any = supabase;
  const [eventsResult, termsResult, industryResult, trialState] = await Promise.all([
    db.from('trade_events').select('id, name, city, country, starts_on, ends_on').eq('organization_id', organizationId).order('starts_on', { ascending: true, nullsFirst: false }),
    db.from('trade_event_terms').select('id, kind, display_term, usage_count').eq('organization_id', organizationId).order('last_used_at', { ascending: false }).limit(24),
    db.from('organization_industry_profiles').select('industry_key').eq('organization_id', organizationId).maybeSingle(),
    getTradeShowTrialCapabilityState(supabase as any, organizationId),
  ]);

  const eventRows = [...(eventsResult.data ?? [])].sort((left: any, right: any) => {
    if (requestedEventId && left.id === requestedEventId) return -1;
    if (requestedEventId && right.id === requestedEventId) return 1;
    return 0;
  });
  const events = eventRows.map((event: any) => ({ id: String(event.id), name: String(event.name), locationLabel: [event.city, event.country].filter(Boolean).join(', ') || 'Location TBD', dateLabel: dateLabel(event.starts_on, event.ends_on) }));
  const reusableTerms = (termsResult.data ?? []).map((term: any) => ({ id: String(term.id), kind: term.kind as 'product' | 'category', displayTerm: String(term.display_term), usageCount: Number(term.usage_count ?? 0) }));
  return {
    events,
    reusableTerms,
    isTradeShowTrial: Boolean(trialState?.isTradeShowTrial),
    showPackaging: String(industryResult.data?.industry_key ?? '').toLowerCase().includes('packag'),
    eventError: eventsResult.error?.message ?? '',
    termsError: termsResult.error?.message ?? '',
  };
}
