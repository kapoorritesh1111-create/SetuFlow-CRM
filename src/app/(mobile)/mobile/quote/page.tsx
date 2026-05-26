import { EmptyState } from '@/components/ui/empty-state';
import { buildQuotesPageViewModel } from '@/features/quotes/logic/build-quotes-page-view-model';
import { MobileQuotesList } from '@/features/mobile/components/mobile-quotes-list';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type QuoteRow = {
  id: string;
  lead_id: string;
  status: string | null;
  currency: string | null;
  notes: string | null;
  quote_number: string | null;
  created_at: string;
  updated_at: string;
  current_version_id: string | null;
  approval_required?: boolean | null;
  approved_at?: string | null;
  approved_by?: string | null;
  notes_internal?: string | null;
};

type LeadRow = { id: string; company_name: string | null; contact_name: string | null; lead_type?: 'buyer' | 'supplier' | null };
type QuoteVersionRow = { id: string; quote_id: string | null; version_no: number | null; status: string | null; created_at: string | null; approved_at: string | null; sent_at: string | null };
type NegotiationRow = { id: string; quote_id: string; event_type: string | null; message: string | null; created_at: string | null; actor_name: string | null };
type CommunicationRow = { id: string; quote_id: string | null; subject: string | null; summary: string | null; status: string | null; created_at: string };
type ContractRow = { id: string; quote_id: string | null; status: string | null; signed_at: string | null; starts_on: string | null; commercial_lock_state?: string | null; commercial_snapshot?: unknown };
type QuoteLineItemRow = { id: string; quote_id: string | null; product_id: string | null; quantity: number | string | null; unit_price: number | string | null; currency: string | null; catalog_price_amount: number | string | null; catalog_price_currency: string | null; is_price_overridden: boolean | null; override_reason: string | null; notes: string | null };
type ProductRow = { id: string; name: string | null; sku: string | null };

export default async function MobileQuotePage() {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;
  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="Could not load workspace." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values." />;
  if (!workspace?.organization) return <EmptyState title="Workspace membership needed" description="No active organization membership." />;

  const supabase = await createClient();
  const organizationId = workspace.organization.id;

  const quotesResult = await supabase
    .from('quotes')
    .select('id, lead_id, status, currency, notes, quote_number, created_at, updated_at, current_version_id, approval_required, approved_at, approved_by, notes_internal')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(80);

  if (quotesResult.error) return <EmptyState title="Could not load quotes" description={quotesResult.error.message} />;

  const quotes = (quotesResult.data ?? []) as QuoteRow[];
  if (!quotes.length) return <EmptyState title="No quotes yet" description="Create a quote from a lead, then track status and next steps here on mobile." />;

  const leadIds = Array.from(new Set(quotes.map((quote) => quote.lead_id).filter(Boolean)));
  const quoteIds = quotes.map((quote) => quote.id);

  const [leadsResult, versionsResult, negotiationsResult, communicationsResult, contractsResult, lineItemsResult] = await Promise.all([
    supabase.from('leads').select('id, company_name, contact_name, lead_type').eq('organization_id', organizationId).in('id', leadIds),
    supabase.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    supabase.from('quote_negotiation_events').select('id, quote_id, event_type, message, created_at, actor_name').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    supabase.from('communications').select('id, quote_id, subject, summary, status, created_at').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    supabase.from('contracts').select('id, quote_id, status, signed_at, starts_on, commercial_lock_state, commercial_snapshot').eq('organization_id', organizationId).in('quote_id', quoteIds),
    supabase.from('quote_line_items').select('id, quote_id, product_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').in('quote_id', quoteIds),
  ]);

  const lineItems = (lineItemsResult.data ?? []) as QuoteLineItemRow[];
  const productIds = Array.from(new Set(lineItems.map((line) => line.product_id).filter((id): id is string => Boolean(id))));
  const productsResult = productIds.length ? await supabase.from('products').select('id, name, sku').eq('organization_id', organizationId).in('id', productIds) : { data: [] as ProductRow[] };

  const viewModel = buildQuotesPageViewModel({
    quotes,
    leads: (leadsResult.data ?? []) as LeadRow[],
    versions: (versionsResult.data ?? []) as QuoteVersionRow[],
    negotiations: (negotiationsResult.data ?? []) as NegotiationRow[],
    communications: (communicationsResult.data ?? []) as CommunicationRow[],
    contracts: (contractsResult.data ?? []) as ContractRow[],
    lineItems,
    products: (productsResult.data ?? []) as ProductRow[],
    selectedQuoteId: null,
  });

  return <MobileQuotesList items={viewModel.items} />;
}
