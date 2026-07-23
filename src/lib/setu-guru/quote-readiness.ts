import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';

export type QuoteReadiness = {
  leadId: string;
  buyerLabel: string;
  country: string | null;
  products: string[];
  suggestedCurrency: string | null;
  moqNote: string | null;
  missingItems: string[];
  existingQuotes: Array<{
    id: string;
    quote_number: string | null;
    status: string | null;
    sent_at: string | null;
    follow_up_at: string | null;
    last_customer_response_at: string | null;
  }>;
  suggestedFollowUp: string | null;
  readinessLevel: 'ready' | 'needs_input' | 'no_quote_yet';
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ageDays = (value?: string | null) => (value ? Math.floor((Date.now() - Date.parse(value)) / DAY_MS) : null);

/**
 * Read-only. Never creates, updates, or prices a quote — it only summarizes
 * what is already in the CRM so the user can open the existing quote builder
 * (/leads/{leadId}/quote) with full context. Price and quote creation stay
 * inside that user-approved flow, per the Quote Assistant guardrail.
 */
export async function getQuoteReadiness(orgId: string, leadId: string): Promise<QuoteReadiness | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const [{ data: lead, error }, icp, { data: quotes }] = await Promise.all([
    client
      .from('leads')
      .select('id,company_name,contact_name,country,products_or_needs,deal_currency,lead_type')
      .eq('organization_id', orgId)
      .eq('id', leadId)
      .maybeSingle(),
    getIcpProfile(orgId),
    client
      .from('quotes')
      .select('id,quote_number,status,sent_at,follow_up_at,last_customer_response_at')
      .eq('organization_id', orgId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (error) throw error;
  if (!lead) return null;

  const missingItems: string[] = [];
  const products = lead.products_or_needs ? [lead.products_or_needs] : icp?.products.slice(0, 3) ?? [];
  if (!lead.products_or_needs) missingItems.push('Product or need is not recorded on the lead yet');

  const suggestedCurrency = lead.deal_currency || icp?.preferred_currency || null;
  if (!suggestedCurrency) missingItems.push('No currency preference found on the lead or ICP profile');

  const moqNote = typeof icp?.moq_rules?.note === 'string' ? (icp.moq_rules.note as string) : null;
  if (!moqNote) missingItems.push('No MOQ or pricing rule recorded in your ICP profile');

  const existingQuotes = quotes ?? [];
  const openQuote = existingQuotes.find((quote: any) => quote.status !== 'converted' && !quote.last_customer_response_at);

  let readinessLevel: QuoteReadiness['readinessLevel'] = 'ready';
  if (existingQuotes.length === 0) readinessLevel = 'no_quote_yet';
  else if (missingItems.length > 0) readinessLevel = 'needs_input';

  let suggestedFollowUp: string | null = null;
  if (openQuote?.sent_at) {
    const days = ageDays(openQuote.sent_at);
    suggestedFollowUp = days !== null && days >= 3 ? 'Overdue — follow up now' : `Follow up in ${3 - (days ?? 0)} day(s)`;
  }

  return {
    leadId: lead.id,
    buyerLabel: lead.company_name || lead.contact_name || 'This buyer',
    country: lead.country,
    products,
    suggestedCurrency,
    moqNote,
    missingItems,
    existingQuotes,
    suggestedFollowUp,
    readinessLevel,
  };
}
