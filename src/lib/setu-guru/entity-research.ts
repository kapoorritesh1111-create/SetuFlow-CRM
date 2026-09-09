import { createClient } from '@/lib/supabase/server';
import { getIcpProfile, type IcpProfile } from '@/lib/setu-guru/icp';

export type FitScoreResult = {
  score: number;
  matchedCountry: boolean;
  matchedProduct: boolean;
  matchedBuyerType: boolean;
  reasons: string[];
};

export type EntityResearchResult = {
  entityId: string;
  entityType: 'buyer' | 'supplier';
  label: string;
  fitSummary: string;
  fitScore: FitScoreResult | null;
  recommendedProducts: string[];
  suggestedAngle: string | null;
  missingInformation: string[];
  recommendedNextAction: string;
  suggestedFollowUpTiming: string | null;
  complianceStatus?: 'ok' | 'gaps_found' | 'unknown';
  missingDocuments?: string[];
  rfqReadiness?: 'ready' | 'needs_input' | 'unknown';
};

function normalize(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function textMatches(haystack: string, candidates: string[]) {
  const normalized = normalize(haystack);
  return candidates.some((candidate) => {
    const needle = normalize(candidate);
    return Boolean(needle) && (normalized.includes(needle) || needle.includes(normalized));
  });
}

function verticalList(icp: IcpProfile, key: string) {
  const raw = (icp.vertical_profile ?? {})[key];
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

function scoreWeight(icp: IcpProfile, key: string, fallback: number) {
  const scoring = (icp.vertical_profile ?? {}).scoring;
  if (!scoring || typeof scoring !== 'object' || Array.isArray(scoring)) return fallback;
  const value = Number((scoring as Record<string, unknown>)[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function scoreFitAgainstIcp(
  lead: {
    country?: string | null;
    products_or_needs?: string | null;
    lead_type?: string | null;
    main_product_category?: string | null;
    job_title?: string | null;
    notes?: string | null;
    source_type?: string | null;
    source_label?: string | null;
    contact_name?: string | null;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    industry_metadata?: Record<string, unknown> | null;
  },
  icp: IcpProfile | null,
): FitScoreResult | null {
  if (!icp) return null;

  const reasons: string[] = [];
  let score = 0;
  const profile = icp.vertical_profile ?? {};
  const productWeight = scoreWeight(icp, 'product_fit', 25);
  const industryWeight = scoreWeight(icp, 'industry_fit', 15);
  const authorityWeight = scoreWeight(icp, 'buyer_authority', 15);
  const buyingWeight = scoreWeight(icp, 'buying_signal', 20);
  const geographyWeight = scoreWeight(icp, 'geography', 10);
  const engagementWeight = scoreWeight(icp, 'engagement', 10);
  const qualityWeight = scoreWeight(icp, 'data_quality', 5);

  const matchedCountry = Boolean(icp.target_countries.length) && textMatches(lead.country ?? '', icp.target_countries);
  if (matchedCountry) {
    score += geographyWeight;
    reasons.push(`Target geography: ${lead.country}.`);
  }

  const productText = [lead.products_or_needs, lead.main_product_category, lead.notes].filter(Boolean).join(' ');
  const productTargets = [...icp.products, ...verticalList(icp, 'priority_products')];
  const matchedProduct = Boolean(productTargets.length) && textMatches(productText, productTargets);
  if (matchedProduct) {
    score += productWeight;
    reasons.push('Packaging need matches Stark Packmate’s priority products.');
  }

  const authorityTargets = [...icp.buyer_types, ...verticalList(icp, 'priority_roles')];
  const authorityText = [lead.lead_type, lead.job_title].filter(Boolean).join(' ');
  const matchedBuyerType = textMatches(authorityText, authorityTargets);
  if (matchedBuyerType) {
    score += authorityWeight;
    reasons.push(lead.job_title ? `Decision-maker role: ${lead.job_title}.` : 'Buyer type matches the ICP.');
  }

  const industryTargets = verticalList(icp, 'target_industries');
  const metadataText = lead.industry_metadata ? JSON.stringify(lead.industry_metadata) : '';
  const industryText = [lead.notes, metadataText, lead.company_name].filter(Boolean).join(' ');
  const matchedIndustry = Boolean(industryTargets.length) && textMatches(industryText, industryTargets);
  if (matchedIndustry) {
    score += industryWeight;
    reasons.push('Industry evidence matches Stark Packmate’s target sectors.');
  }

  const commercialText = [lead.products_or_needs, lead.notes].filter(Boolean).join(' ').toLowerCase();
  const buyingSignals: Array<[RegExp, string]> = [
    [/\b\d+\s*(?:k|thousand|lakh|lac|million)?\s*(?:pcs|pieces|units)\b/i, 'quantity'],
    [/\b\d+\s*sku(?:s)?\b/i, 'SKU count'],
    [/\b(?:pack size|\d+\s*(?:gm|g|kg|ml|ltr|litre|liter))\b/i, 'pack size'],
    [/\b(?:artwork|design)\b/i, 'artwork/design'],
    [/\bmoq\b/i, 'MOQ'],
    [/\b(?:price|pricing|quote)\b/i, 'pricing/quote'],
    [/\b(?:sample|sampling)\b/i, 'sample'],
    [/\bmeeting\b/i, 'meeting'],
  ];
  const foundSignals = buyingSignals.filter(([pattern]) => pattern.test(commercialText)).map(([, label]) => label);
  if (foundSignals.length) {
    const signalFraction = Math.min(1, 0.55 + Math.min(3, foundSignals.length - 1) * 0.15);
    score += Math.round(buyingWeight * signalFraction);
    reasons.push(`Buying evidence: ${foundSignals.slice(0, 4).join(', ')}.`);
  }

  const sourceText = `${lead.source_type ?? ''} ${lead.source_label ?? ''} ${lead.notes ?? ''}`;
  const highIntentSources = verticalList(icp, 'high_intent_sources');
  const highIntent = textMatches(sourceText, highIntentSources) || /\bctwa\b/i.test(sourceText);
  if (highIntent) {
    score += engagementWeight;
    reasons.push(/\bctwa\b/i.test(sourceText) ? 'High-intent CTWA/Meta acquisition.' : 'High-intent sales engagement source.');
  }

  const qualityFields = [lead.company_name, lead.contact_name, lead.phone || lead.email, lead.products_or_needs, lead.country];
  const qualityRatio = qualityFields.filter(Boolean).length / qualityFields.length;
  score += Math.round(qualityWeight * qualityRatio);

  if (!matchedCountry && icp.target_countries.length) reasons.push('Target country is not confirmed yet.');
  if (!matchedProduct && productTargets.length) reasons.push('Packaging requirement needs more detail before product fit can be confirmed.');

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedCountry,
    matchedProduct,
    matchedBuyerType,
    reasons,
  };
}

function fitBand(score: number) {
  if (score >= 80) return 'ideal ICP';
  if (score >= 65) return 'strong fit';
  if (score >= 45) return 'potential fit';
  return 'low-evidence fit';
}

export async function generateBuyerResearch(orgId: string, leadId: string): Promise<EntityResearchResult | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const [{ data: lead, error: leadError }, icp] = await Promise.all([
    client
      .from('leads')
      .select('id,company_name,contact_name,job_title,email,phone,country,lead_type,products_or_needs,main_product_category,notes,source_type,source_label,industry_metadata,last_contacted_at,intro_sent,trade_event_id,created_at')
      .eq('organization_id', orgId)
      .eq('id', leadId)
      .maybeSingle(),
    getIcpProfile(orgId),
  ]);

  if (leadError) throw leadError;
  if (!lead) return null;

  const [{ data: quotes }, { data: shares }, { data: communications }] = await Promise.all([
    client.from('quotes').select('id,status,sent_at,last_customer_response_at').eq('organization_id', orgId).eq('lead_id', leadId).limit(20),
    client.from('catalog_shares').select('id,last_opened_at').eq('organization_id', orgId).eq('lead_id', leadId).limit(20),
    client.from('communications').select('id,direction,sent_at,created_at').eq('organization_id', orgId).eq('lead_id', leadId).order('created_at', { ascending: false }).limit(10),
  ]);

  const label = lead.company_name || lead.contact_name || 'This buyer';
  const fitScore = scoreFitAgainstIcp(lead, icp);
  const hasQuote = (quotes ?? []).length > 0;
  const hasCatalogOpen = (shares ?? []).some((share: any) => Boolean(share.last_opened_at));
  const lastInbound = (communications ?? []).find((item: any) => item.direction === 'inbound');

  const missingInformation: string[] = [];
  if (!lead.country) missingInformation.push('Country');
  if (!lead.products_or_needs) missingInformation.push('Packaging requirement');
  if (!lead.contact_name) missingInformation.push('Contact name');
  if (!lead.job_title) missingInformation.push('Buyer role / designation');

  const summaryParts: string[] = [];
  if (fitScore) {
    summaryParts.push(`This buyer is a ${fitBand(fitScore.score)} (fit score ${fitScore.score}/100).`);
    if (fitScore.reasons.length) summaryParts.push(fitScore.reasons.join(' '));
  } else {
    summaryParts.push('Set up your ICP profile so Setu Guru can score how well this buyer fits your target market.');
  }
  if (lead.trade_event_id) summaryParts.push('Captured from a trade event.');
  if (hasQuote) summaryParts.push('A quote already exists.');
  if (hasCatalogOpen) summaryParts.push('The buyer opened a shared catalog.');

  const recommendedProducts = icp && fitScore?.matchedProduct
    ? icp.products.filter((product) => textMatches(`${lead.products_or_needs ?? ''} ${lead.notes ?? ''}`, [product])).slice(0, 5)
    : [];

  let recommendedNextAction = 'Confirm the packaging requirement, quantity and artwork status.';
  let suggestedFollowUpTiming: string | null = 'Today';
  const commercialText = `${lead.products_or_needs ?? ''} ${lead.notes ?? ''}`.toLowerCase();
  if (/\b(?:sample|sampling)\b/.test(commercialText)) {
    recommendedNextAction = 'Follow up on the sample outcome and confirm changes needed before commercial approval.';
    suggestedFollowUpTiming = 'Within 2 business days';
  } else if (/\b(?:quote shared|quote sent|prices shared|price shared)\b/.test(commercialText) || hasQuote) {
    recommendedNextAction = 'Follow up on pricing/quote and confirm decision timing, quantity and any objections.';
    suggestedFollowUpTiming = 'Within 2–3 days';
  } else if (/\b(?:artwork|design)\b/.test(commercialText)) {
    recommendedNextAction = 'Get or review the artwork, then confirm MOQ, structure and pricing.';
    suggestedFollowUpTiming = 'Within 1–2 days';
  } else if (hasCatalogOpen && !lastInbound) {
    recommendedNextAction = 'Follow up after the catalog was opened and ask which packaging format they want priced.';
    suggestedFollowUpTiming = 'Within 2 days';
  } else if (!lead.last_contacted_at && !lead.intro_sent) {
    recommendedNextAction = 'Prepare the first approved outreach focused on their packaging need.';
    suggestedFollowUpTiming = 'Today';
  }

  const suggestedAngle = recommendedProducts.length
    ? `Lead with ${recommendedProducts[0]} and move quickly to quantity, artwork, MOQ and price.`
    : icp?.outreach_style ?? null;

  return {
    entityId: lead.id,
    entityType: 'buyer',
    label,
    fitSummary: summaryParts.join(' '),
    fitScore,
    recommendedProducts,
    suggestedAngle,
    missingInformation,
    recommendedNextAction,
    suggestedFollowUpTiming,
  };
}

export async function generateSupplierResearch(orgId: string, leadId: string): Promise<EntityResearchResult | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const [{ data: lead, error: leadError }, icp] = await Promise.all([
    client
      .from('leads')
      .select('id,company_name,contact_name,country,lead_type,products_or_needs,main_product_category,created_at,updated_at')
      .eq('organization_id', orgId)
      .eq('id', leadId)
      .eq('lead_type', 'supplier')
      .maybeSingle(),
    getIcpProfile(orgId),
  ]);

  if (leadError) throw leadError;
  if (!lead) return null;

  const [{ data: documents }, { data: rfqs }] = await Promise.all([
    client.from('documents').select('id,status,expires_at').eq('organization_id', orgId).eq('related_entity', 'lead').eq('related_id', leadId).limit(50),
    client.from('rfqs').select('id,status,validity_date,updated_at').eq('organization_id', orgId).eq('lead_id', leadId).order('updated_at', { ascending: false }).limit(20),
  ]);

  const label = lead.company_name || lead.contact_name || 'This supplier';
  const fitScore = scoreFitAgainstIcp(lead, icp);
  const requiredDocs = icp?.required_documents ?? [];
  const existingDocs = documents ?? [];
  const now = Date.now();
  const expiredDocs = existingDocs.filter((doc: any) => doc.expires_at && Date.parse(doc.expires_at) < now);
  const missingDocuments = requiredDocs.length && existingDocs.length === 0 ? requiredDocs : expiredDocs.map(() => 'Expired document on file');
  const complianceStatus: EntityResearchResult['complianceStatus'] = requiredDocs.length === 0 ? 'unknown' : missingDocuments.length ? 'gaps_found' : 'ok';
  const openRfq = (rfqs ?? []).find((rfq: any) => !['completed','closed','approved'].includes(String(rfq.status ?? '').toLowerCase()));
  const rfqReadiness: EntityResearchResult['rfqReadiness'] = complianceStatus === 'gaps_found' ? 'needs_input' : (rfqs ?? []).length ? 'ready' : 'unknown';
  const missingInformation: string[] = [];
  if (!lead.country) missingInformation.push('Country');
  if (!lead.products_or_needs) missingInformation.push('Capability or product category');
  const summaryParts = [fitScore ? `This supplier has a sourcing fit score of ${fitScore.score}/100. ${fitScore.reasons.join(' ')}` : 'Set up your ICP profile so Setu Guru can score supplier fit.'];
  if (complianceStatus === 'gaps_found') summaryParts.push('Required compliance documents are missing or expired.');
  if (openRfq) summaryParts.push('An RFQ with this supplier is still open.');
  const recommendedNextAction = complianceStatus === 'gaps_found' ? 'Request the missing or expired compliance documents before moving forward.' : openRfq ? 'Review the open RFQ response and confirm next steps.' : 'Confirm supplier capability details and consider creating an RFQ.';

  return { entityId: lead.id, entityType: 'supplier', label, fitSummary: summaryParts.join(' '), fitScore, recommendedProducts: [], suggestedAngle: null, missingInformation, recommendedNextAction, suggestedFollowUpTiming: openRfq ? 'As soon as possible' : null, complianceStatus, missingDocuments, rfqReadiness };
}
