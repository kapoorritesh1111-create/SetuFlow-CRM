import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';
import { scoreFitAgainstIcp, type FitScoreResult } from '@/lib/setu-guru/entity-research';

export type OpportunityCard = {
  leadId: string;
  label: string;
  country: string | null;
  leadType: 'buyer' | 'supplier';
  signalSource: string;
  fitScore: FitScoreResult;
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

/**
 * Phase 1 sources only: existing CRM leads. Public enrichment, trade directories,
 * and market signal scoring are phase 3 per the build plan and are intentionally
 * not implemented here.
 */
export async function listTopFitOpportunities(orgId: string, limit = 8): Promise<{
  opportunities: OpportunityCard[];
  icpConfigured: boolean;
}> {
  const supabase = await createClient();
  const client = supabase as any;

  const icp = await getIcpProfile(orgId);
  if (!icp) {
    return { opportunities: [], icpConfigured: false };
  }

  const { data: leads, error } = await client
    .from('leads')
    .select('id,company_name,contact_name,country,lead_type,products_or_needs,main_product_category,source_type,trade_event_id,last_contacted_at,intro_sent,created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  const scored = (leads ?? [])
    .map((lead: any) => {
      const fitScore = scoreFitAgainstIcp(lead, icp);
      return { lead, fitScore };
    })
    .filter((item: any) => item.fitScore && item.fitScore.score >= 40)
    .sort((a: any, b: any) => b.fitScore.score - a.fitScore.score)
    .slice(0, limit);

  const opportunities: OpportunityCard[] = scored.map(({ lead, fitScore }: any) => {
    const isSupplier = String(lead.lead_type ?? '').toLowerCase() === 'supplier';
    const noOutreach = !lead.last_contacted_at && !lead.intro_sent;
    return {
      leadId: lead.id,
      label: lead.company_name || lead.contact_name || 'Untitled record',
      country: lead.country,
      leadType: isSupplier ? 'supplier' : 'buyer',
      signalSource: signalLabel(lead.source_type, lead.trade_event_id),
      fitScore,
      recommendedAction: noOutreach
        ? (isSupplier ? 'Open the supplier record and request an RFQ.' : 'Open the buyer record and prepare the first outreach.')
        : 'Open the record and review the fit before the next step.',
    };
  });

  return { opportunities, icpConfigured: true };
}
