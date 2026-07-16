import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';
import { scoreFitAgainstIcp, type FitScoreResult } from '@/lib/setu-guru/entity-research';

export type OpportunityCard = {
  leadId: string;
  label: string;
  country: string | null;
  leadType: 'buyer' | 'supplier';
  companyType: string | null;
  ownerUserId: string | null;
  signalSource: string;
  fitScore: FitScoreResult;
  scoreVersion: string;
  scoredAt: string;
  missingData: string[];
  lastContactedAt: string | null;
  contactState: 'not_contacted' | 'contacted';
  recommendedAction: string;
};

const SIGNAL_LABELS: Record<string, string> = {
  trade_event: 'Trade event lead',
  imported: 'Imported lead list',
  referral: 'Referral',
  website: 'Website inquiry',
  rfq: 'Supplier RFQ',
};

function signalLabel(sourceType?: string | null, tradeEventId?: string | null) {
  if (tradeEventId) return SIGNAL_LABELS.trade_event;
  const key = String(sourceType ?? '').toLowerCase();
  return SIGNAL_LABELS[key] ?? (sourceType || 'Existing CRM contact');
}

function missingFields(lead: any) {
  const missing: string[] = [];
  if (!lead.country) missing.push('country');
  if (!lead.company_name) missing.push('company name');
  if (!lead.email && !lead.phone && !lead.whatsapp_number) missing.push('contact details');
  if (!lead.products_or_needs && !lead.main_product_category) missing.push('product interest');
  return missing;
}

export async function listTopFitOpportunities(orgId: string, limit = 500): Promise<{
  opportunities: OpportunityCard[];
  icpConfigured: boolean;
}> {
  const supabase = await createClient();
  const client = supabase as any;
  const icp = await getIcpProfile(orgId);
  if (!icp) return { opportunities: [], icpConfigured: false };

  // S48-GROWTH-006/009 fix: the previous select referenced `status` and `buyer_type`, neither of
  // which exists on public.leads (verified live 2026-07-16). That caused PostgREST to reject the
  // query with a 400 and CRM Matches to silently render empty/broken in production. `lead_type`
  // already distinguishes buyer vs supplier; `owner_user_id` powers the new owner filter.
  const { data: leads, error } = await client
    .from('leads')
    .select('id,company_name,contact_name,country,lead_type,products_or_needs,main_product_category,source_type,trade_event_id,last_contacted_at,intro_sent,email,phone,whatsapp_number,owner_user_id,created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 1000));
  if (error) throw error;

  const scoredAt = new Date().toISOString();
  const opportunities = (leads ?? [])
    .map((lead: any) => ({ lead, fitScore: scoreFitAgainstIcp(lead, icp) }))
    .filter((item: any) => item.fitScore && item.fitScore.score >= 40)
    .sort((a: any, b: any) => b.fitScore.score - a.fitScore.score)
    .map(({ lead, fitScore }: any) => {
      const isSupplier = String(lead.lead_type ?? '').toLowerCase() === 'supplier';
      const noOutreach = !lead.last_contacted_at && !lead.intro_sent;
      return {
        leadId: lead.id,
        label: lead.company_name || lead.contact_name || 'Untitled record',
        country: lead.country,
        leadType: isSupplier ? 'supplier' : 'buyer',
        companyType: lead.main_product_category || null,
        ownerUserId: lead.owner_user_id || null,
        signalSource: signalLabel(lead.source_type, lead.trade_event_id),
        fitScore,
        scoreVersion: `icp-${icp.version ?? 1}-s48-v1`,
        scoredAt,
        missingData: missingFields(lead),
        lastContactedAt: lead.last_contacted_at,
        contactState: noOutreach ? 'not_contacted' : 'contacted',
        recommendedAction: noOutreach
          ? (isSupplier ? 'Open the supplier record and prepare an RFQ request.' : 'Open the buyer record and prepare the first outreach.')
          : 'Open the record and review the fit before the next step.',
      } satisfies OpportunityCard;
    });

  return { opportunities, icpConfigured: true };
}
