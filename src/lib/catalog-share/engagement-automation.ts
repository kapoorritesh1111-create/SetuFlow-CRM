type SupabaseLike = any;

type AutomationRule =
  | 'no_open_48h'
  | 'warm_lead_views'
  | 'selection_quote_prompt'
  | 'quote_requested'
  | 'pdf_downloaded';

type EvaluateInput = {
  svc: SupabaseLike;
  shareId: string;
  trigger?: string;
};

const TYPE = 'catalog_engagement';
const WINDOW_HOURS = 24;

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function titleFor(rule: AutomationRule) {
  switch (rule) {
    case 'no_open_48h': return 'Catalog not opened after 48h';
    case 'warm_lead_views': return 'Warm catalog lead';
    case 'selection_quote_prompt': return 'Buyer selected catalog products';
    case 'quote_requested': return 'Buyer requested a catalog quote';
    case 'pdf_downloaded': return 'Buyer downloaded catalog PDF';
  }
}

function bodyFor(rule: AutomationRule, buyer: string, count = 0) {
  switch (rule) {
    case 'no_open_48h': return `${buyer} has not opened the shared catalog after 48 hours. Consider resending or switching channel.`;
    case 'warm_lead_views': return `${buyer} viewed multiple catalog products. Treat this as a warm lead and follow up.`;
    case 'selection_quote_prompt': return `${buyer} selected ${count} catalog product${count === 1 ? '' : 's'}. Create a draft quote while interest is active.`;
    case 'quote_requested': return `${buyer} requested a quote from the shared catalog. Review selections and create the quote.`;
    case 'pdf_downloaded': return `${buyer} downloaded the catalog PDF or price list. Follow up with pricing and availability context.`;
  }
}

async function getRecipientIds(svc: SupabaseLike, share: any) {
  if (share.created_by) return [share.created_by];
  const { data } = await svc
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', share.organization_id)
    .eq('is_active', true)
    .limit(10);
  return Array.from(new Set(((data ?? []) as any[]).map((row) => row.user_id).filter(Boolean)));
}

async function alreadyNotified(svc: SupabaseLike, share: any, rule: AutomationRule) {
  const key = `${rule}:${share.id}`;
  const { data } = await svc
    .from('notifications')
    .select('id')
    .eq('organization_id', share.organization_id)
    .eq('type', TYPE)
    .eq('entity_id', share.lead_id || share.id)
    .eq('entity_ref', key)
    .gte('created_at', hoursAgo(WINDOW_HOURS))
    .limit(1);
  return Boolean(data?.length);
}

async function notify(svc: SupabaseLike, share: any, rule: AutomationRule, count = 0) {
  if (await alreadyNotified(svc, share, rule)) return false;
  const recipients = await getRecipientIds(svc, share);
  if (!recipients.length) return false;

  const buyer = share.buyer_company || share.buyer_name || 'A buyer';
  const actionUrl = share.lead_id ? `/leads/${share.lead_id}` : '/catalog';
  const rows = recipients.map((userId: string) => ({
    organization_id: share.organization_id,
    user_id: userId,
    type: TYPE,
    title: titleFor(rule),
    body: bodyFor(rule, buyer, count),
    icon: 'bar-chart-3',
    priority: rule === 'quote_requested' || rule === 'selection_quote_prompt' ? 'high' : 'normal',
    entity_type: 'lead',
    entity_id: share.lead_id || share.id,
    entity_ref: `${rule}:${share.id}`,
    action_url: actionUrl,
    channels_sent: ['in_app'],
  }));

  const { error } = await svc.from('notifications').insert(rows);
  return !error;
}

export async function evaluateCatalogEngagementAutomation({ svc, shareId, trigger }: EvaluateInput) {
  const { data: share } = await svc.from('catalog_shares').select('*').eq('id', shareId).maybeSingle();
  if (!share || !share.organization_id) return { ok: false, reason: 'share_not_found' };

  const [{ data: events }, { data: selections }] = await Promise.all([
    svc.from('catalog_share_events').select('event_type, product_id, occurred_at').eq('catalog_share_id', share.id).limit(200),
    svc.from('buyer_selections').select('product_id').eq('catalog_share_id', share.id),
  ]);

  const ev = (events ?? []) as any[];
  const selected = (selections ?? []) as any[];
  const viewedProductIds = new Set(ev.filter((e) => e.product_id && ['product_viewed', 'product_detail_opened'].includes(e.event_type)).map((e) => e.product_id));
  const rules: AutomationRule[] = [];

  if (trigger === 'pdf_downloaded' || ev.some((e) => e.event_type === 'pdf_downloaded')) rules.push('pdf_downloaded');
  if (trigger === 'quote_requested' || ev.some((e) => e.event_type === 'quote_requested')) rules.push('quote_requested');
  if (selected.length > 0) rules.push('selection_quote_prompt');
  if (viewedProductIds.size >= 3) rules.push('warm_lead_views');

  const createdAt = new Date(share.created_at).getTime();
  if (!share.last_opened_at && !share.use_count && createdAt < Date.now() - 48 * 60 * 60 * 1000) {
    rules.push('no_open_48h');
  }

  let created = 0;
  for (const rule of Array.from(new Set(rules))) {
    const didCreate = await notify(svc, share, rule, rule === 'selection_quote_prompt' ? selected.length : viewedProductIds.size);
    if (didCreate) created += 1;
  }

  return { ok: true, created, evaluated: rules.length };
}
