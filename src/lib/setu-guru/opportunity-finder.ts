import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';
<<<<<<< HEAD
import { scoreFitAgainstIcp, type FitScoreResult } from '@/lib/setu-guru/fit-scoring';
=======
import { scoreFitAgainstIcp, type FitScoreResult } from '@/lib/setu-guru/entity-research';
import { scorePackagingFit } from '@/lib/setu-guru/packaging-intelligence-core';
>>>>>>> origin/main

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
  icpProfileId: string;
  icpProfileName: string;
  icpProfileVersion: number;
  matchedCriteria: string[];
  missingCriteria: string[];
};

const SIGNAL_LABELS: Record<string, string> = {
  trade_event: 'Trade event lead', imported: 'Imported lead list', referral: 'Referral', website: 'Website inquiry', rfq: 'Supplier RFQ',
};

function signalLabel(sourceType?: string | null, tradeEventId?: string | null) {
  if (tradeEventId) return SIGNAL_LABELS.trade_event;
  const key = String(sourceType ?? '').toLowerCase();
  return SIGNAL_LABELS[key] ?? (sourceType || 'Existing CRM contact');
}

function missingFields(lead: any, packagingMissing: string[] = []) {
  const missing: string[] = [];
  if (!lead.country) missing.push('country');
  if (!lead.company_name) missing.push('company name');
  if (!lead.email && !lead.phone && !lead.whatsapp_number) missing.push('contact details');
  if (!lead.products_or_needs && !lead.main_product_category) missing.push('packaging need');
  return Array.from(new Set([...missing, ...packagingMissing.map((item) => item.toLowerCase())]));
}

function packagingScoreAsFit(lead: any, icp: any): { fitScore: FitScoreResult; matchedCriteria: string[]; missingCriteria: string[]; missingData: string[] } {
  const result = scorePackagingFit({
    country: lead.country,
    companyType: lead.industry_metadata?.company_type || lead.industry_metadata?.buyer_type || null,
    jobTitle: lead.job_title,
    productsOrNeeds: lead.products_or_needs,
    mainProductCategory: lead.main_product_category,
    industryMetadata: lead.industry_metadata,
  }, icp);
  // Keep the explicit result name as a stable contract for Growth Center evaluation,
  // analytics, and future card-level evidence display.
  const matchedPackagingCategories = result.matchedCategories;
  const fitScore: FitScoreResult = {
    score: result.score,
    matchedCountry: result.reasons.some((reason) => reason.toLowerCase().includes('target market')),
    matchedProduct: matchedPackagingCategories.length > 0,
    matchedBuyerType: result.reasons.some((reason) => reason.toLowerCase().includes('company type')),
    reasons: [...result.reasons, ...result.penalties],
  };
  const matchedCriteria = [
    matchedPackagingCategories.length ? `Packaging family: ${matchedPackagingCategories.join(', ')}` : null,
    result.matchedUseCases.length ? `End use: ${result.matchedUseCases.join(', ')}` : null,
    result.decisionMakerRoles.length ? 'Relevant decision-maker' : null,
    result.buyerNeedSignals.length ? `Buying signal: ${result.buyerNeedSignals.join(', ')}` : null,
    fitScore.matchedCountry ? 'Target country' : null,
    fitScore.matchedBuyerType ? 'Target buyer type' : null,
  ].filter(Boolean) as string[];
  return { fitScore, matchedCriteria, missingCriteria: result.missingData, missingData: result.missingData };
}

export async function listTopFitOpportunities(orgId: string, limit = 500, profileId?: string | null): Promise<{ opportunities: OpportunityCard[]; icpConfigured: boolean }> {
  const supabase = await createClient();
  const client = supabase as any;
  const icp = await getIcpProfile(orgId, profileId);
  if (!icp) return { opportunities: [], icpConfigured: false };
  const packaging = String(icp.vertical_profile?.vertical ?? '').toLowerCase() === 'packaging';

  const { data: leads, error } = await client
    .from('leads')
    .select('id,company_name,contact_name,country,lead_type,job_title,products_or_needs,main_product_category,source_type,trade_event_id,last_contacted_at,intro_sent,email,phone,whatsapp_number,owner_user_id,created_at,industry_metadata')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 1000));
  if (error) throw error;

  const scoredAt = new Date().toISOString();
  const opportunities = (leads ?? [])
    .map((lead: any) => {
      if (packaging) return { lead, ...packagingScoreAsFit(lead, icp) };
      const fitScore = scoreFitAgainstIcp(lead, icp);
      return {
        lead,
        fitScore,
        matchedCriteria: fitScore ? [fitScore.matchedCountry ? 'Target country' : null, fitScore.matchedProduct ? 'Product overlap' : null, fitScore.matchedBuyerType ? 'Target record type' : null].filter(Boolean) : [],
        missingCriteria: fitScore ? [!fitScore.matchedCountry && icp.target_countries.length ? 'Target country' : null, !fitScore.matchedProduct && icp.products.length ? 'Product overlap' : null, !fitScore.matchedBuyerType && icp.buyer_types.length ? 'Target record type' : null].filter(Boolean) : [],
        missingData: [],
      };
    })
    .filter((item: any) => item.fitScore && item.fitScore.score >= (packaging ? 25 : 40) && !item.lead.industry_metadata?.crm_match_archived_at)
    .sort((a: any, b: any) => b.fitScore.score - a.fitScore.score)
    .map(({ lead, fitScore, matchedCriteria, missingCriteria, missingData }: any) => {
      const isSupplier = String(lead.lead_type ?? '').toLowerCase() === 'supplier';
      const noOutreach = !lead.last_contacted_at && !lead.intro_sent;
      return {
        leadId: lead.id,
        label: lead.company_name || lead.contact_name || 'Untitled record',
        country: lead.country,
        leadType: isSupplier ? 'supplier' : 'buyer',
        companyType: lead.industry_metadata?.company_type || lead.main_product_category || null,
        ownerUserId: lead.owner_user_id || null,
        signalSource: signalLabel(lead.source_type, lead.trade_event_id),
        fitScore,
        scoreVersion: packaging ? `icp-${icp.version ?? 1}-s50-packaging-v1` : `icp-${icp.version ?? 1}-s48-v1`,
        scoredAt,
        missingData: missingFields(lead, missingData),
        lastContactedAt: lead.last_contacted_at,
        contactState: noOutreach ? 'not_contacted' : 'contacted',
        recommendedAction: noOutreach
          ? (isSupplier ? 'Open the supplier record and prepare an RFQ request.' : packaging ? 'Open the buyer record, complete the Packaging discovery checklist, and prepare the first approved outreach.' : 'Open the buyer record and prepare the first outreach.')
          : 'Open the record and review the fit before the next step.',
        icpProfileId: icp.id,
        icpProfileName: icp.name,
        icpProfileVersion: icp.version ?? 1,
        matchedCriteria,
        missingCriteria,
      } satisfies OpportunityCard;
    });

  return { opportunities, icpConfigured: true };
}