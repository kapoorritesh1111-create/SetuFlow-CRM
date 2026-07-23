import { createClient } from '@/lib/supabase/server';
import { getIcpProfile, type IcpProfile } from '@/lib/setu-guru/icp';

export type FitScoreResult = {
  score: number; // 0-100
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

const DAY_MS = 24 * 60 * 60 * 1000;
const ageDays = (value?: string | null) => (value ? Math.floor((Date.now() - Date.parse(value)) / DAY_MS) : null);

function normalize(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function overlaps(a: string[], b: string[]) {
  const setB = new Set(b.map(normalize));
  return a.some((item) => setB.has(normalize(item)));
}

export function scoreFitAgainstIcp(
  lead: { country?: string | null; products_or_needs?: string | null; lead_type?: string | null; main_product_category?: string | null },
  icp: IcpProfile | null,
): FitScoreResult | null {
  if (!icp) return null;

  const reasons: string[] = [];
  let score = 40; // baseline: CRM record exists, no ICP contradiction yet

  const matchedCountry = Boolean(icp.target_countries.length) && overlaps([lead.country ?? ''], icp.target_countries);
  if (matchedCountry) {
    score += 25;
    reasons.push(`Located in a target market (${lead.country}).`);
  }

  const leadProductTerms = [lead.products_or_needs ?? '', lead.main_product_category ?? '']
    .join(' ')
    .split(/[,/;]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const matchedProduct = Boolean(icp.products.length) && leadProductTerms.some((term) =>
    icp.products.some((product) => normalize(term).includes(normalize(product)) || normalize(product).includes(normalize(term))),
  );
  if (matchedProduct) {
    score += 20;
    reasons.push('Product interest overlaps with your ICP product list.');
  }

  const matchedBuyerType = Boolean(icp.buyer_types.length) && overlaps([lead.lead_type ?? ''], icp.buyer_types);
  if (matchedBuyerType) {
    score += 15;
    reasons.push('Buyer type matches a target buyer type in your ICP.');
  }

  if (!matchedCountry && icp.target_countries.length) {
    reasons.push('Outside your configured target countries.');
  }
  if (!matchedProduct && icp.products.length) {
    reasons.push('No clear overlap with your configured product list yet.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedCountry,
    matchedProduct,
    matchedBuyerType,
    reasons,
  };
}

export async function generateBuyerResearch(orgId: string, leadId: string): Promise<EntityResearchResult | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const [{ data: lead, error: leadError }, icp] = await Promise.all([
    client
      .from('leads')
      .select('id,company_name,contact_name,country,lead_type,products_or_needs,main_product_category,last_contacted_at,intro_sent,trade_event_id,created_at')
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
  if (!lead.products_or_needs) missingInformation.push('Product interest or needs');
  if (!lead.contact_name) missingInformation.push('Contact name');

  const summaryParts: string[] = [];
  if (fitScore) {
    summaryParts.push(
      fitScore.score >= 65
        ? `This buyer looks like a strong fit (fit score ${fitScore.score}/100).`
        : fitScore.score >= 40
          ? `This buyer is a moderate fit (fit score ${fitScore.score}/100).`
          : `This buyer does not clearly match your configured ICP yet (fit score ${fitScore.score}/100).`,
    );
    if (fitScore.reasons.length) summaryParts.push(fitScore.reasons.join(' '));
  } else {
    summaryParts.push('Set up your ICP profile so Setu Guru can score how well this buyer fits your target market.');
  }
  if (lead.trade_event_id) summaryParts.push('This lead was captured from a trade event.');
  if (hasQuote) summaryParts.push('A quote already exists for this buyer.');
  if (hasCatalogOpen) summaryParts.push('The buyer has opened a shared catalog.');

  const recommendedProducts = icp && fitScore?.matchedProduct ? icp.products.slice(0, 5) : [];

  let recommendedNextAction = 'Open the buyer lead and confirm the next CRM step.';
  let suggestedFollowUpTiming: string | null = null;
  if (!lead.last_contacted_at && !lead.intro_sent) {
    recommendedNextAction = 'Prepare the first approved outreach message.';
    suggestedFollowUpTiming = 'Today';
  } else if (hasCatalogOpen && !lastInbound) {
    recommendedNextAction = 'Follow up after the catalog was opened with no reply yet.';
    suggestedFollowUpTiming = 'Within 2 days';
  } else if (hasQuote) {
    recommendedNextAction = 'Check in on the open quote and offer to answer questions.';
    suggestedFollowUpTiming = 'Within 3 days of the quote being sent';
  }

  const suggestedAngle = icp?.outreach_style
    ? icp.outreach_style
    : recommendedProducts.length
      ? `Lead with ${recommendedProducts[0]} and reference why it matches their market.`
      : null;

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
  const complianceStatus: EntityResearchResult['complianceStatus'] = requiredDocs.length === 0
    ? 'unknown'
    : missingDocuments.length
      ? 'gaps_found'
      : 'ok';

  const openRfq = (rfqs ?? []).find((rfq: any) => !['completed', 'closed', 'approved'].includes(String(rfq.status ?? '').toLowerCase()));
  const rfqReadiness: EntityResearchResult['rfqReadiness'] = complianceStatus === 'gaps_found'
    ? 'needs_input'
    : (rfqs ?? []).length
      ? 'ready'
      : 'unknown';

  const missingInformation: string[] = [];
  if (!lead.country) missingInformation.push('Country');
  if (!lead.products_or_needs) missingInformation.push('Capability or product category');

  const summaryParts: string[] = [];
  if (fitScore) {
    summaryParts.push(
      fitScore.score >= 65
        ? `This supplier looks like a strong sourcing fit (fit score ${fitScore.score}/100).`
        : `This supplier is a partial sourcing fit (fit score ${fitScore.score}/100).`,
    );
    if (fitScore.reasons.length) summaryParts.push(fitScore.reasons.join(' '));
  } else {
    summaryParts.push('Set up your ICP profile so Setu Guru can score supplier fit against your sourcing needs.');
  }
  if (complianceStatus === 'gaps_found') {
    summaryParts.push('Required compliance documents are missing or expired.');
  } else if (complianceStatus === 'ok') {
    summaryParts.push('Required documents are on file.');
  }
  if (openRfq) summaryParts.push('An RFQ with this supplier is still open.');

  const recommendedNextAction = complianceStatus === 'gaps_found'
    ? 'Request the missing or expired compliance documents before moving forward.'
    : openRfq
      ? 'Review the open RFQ response and confirm next steps.'
      : 'Confirm supplier capability details and consider creating an RFQ.';

  return {
    entityId: lead.id,
    entityType: 'supplier',
    label,
    fitSummary: summaryParts.join(' '),
    fitScore,
    recommendedProducts: [],
    suggestedAngle: null,
    missingInformation,
    recommendedNextAction,
    suggestedFollowUpTiming: openRfq ? 'As soon as possible' : null,
    complianceStatus,
    missingDocuments,
    rfqReadiness,
  };
}
