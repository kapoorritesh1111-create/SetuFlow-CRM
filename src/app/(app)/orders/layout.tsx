import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { ApprovedOrdersRedesignWorkspace, type RedesignOrder } from '@/features/orders/components/ApprovedOrdersRedesignWorkspace';

export default async function OrdersLayout() {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return <EmptyState title="Workspace required" description="Sign in with an active organization membership to view orders." />;
  }

  if (!hasSupabaseEnv) {
    return <EmptyState title="Configuration required" description="Supabase environment variables are not set." />;
  }

  const db = (await createClient()) as any;
  const orgId = workspace.organization.id;

  const { data: quotes, error } = await db
    .from('quotes')
    .select('id, status, currency, updated_at, lead_id, accepted_version_id, current_version_id')
    .eq('organization_id', orgId)
    .in('status', ['accepted', 'sent'])
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    return <EmptyState title="Could not load orders" description={String(error.message ?? 'Unknown error')} />;
  }

  const quoteRows = Array.isArray(quotes) ? quotes : [];
  const quoteIds = quoteRows.map((quote: any) => quote.id).filter(Boolean);
  const leadIds = [...new Set(quoteRows.map((quote: any) => quote.lead_id).filter(Boolean))];

  const [leadsResult, docsResult, contractsResult] = await Promise.all([
    leadIds.length
      ? db.from('leads').select('id, company_name, country, deal_value, deal_currency, lead_type').eq('organization_id', orgId).in('id', leadIds)
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('documents').select('id, related_id, related_entity, status').eq('organization_id', orgId).in('related_entity', ['quote', 'lead', 'contract']).order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('contracts').select('id, quote_id, execution_state, execution_blockers, status').eq('organization_id', orgId).in('quote_id', quoteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const leads = new Map((Array.isArray(leadsResult.data) ? leadsResult.data : []).map((lead: any) => [lead.id, lead]));
  const contracts = new Map((Array.isArray(contractsResult.data) ? contractsResult.data : []).map((contract: any) => [contract.quote_id, contract]));
  const documents = Array.isArray(docsResult.data) ? docsResult.data : [];

  const orders: RedesignOrder[] = quoteRows.map((quote: any) => {
    const lead = leads.get(quote.lead_id) as any;
    const contract = contracts.get(quote.id) as any;
    const docCount = documents.filter((doc: any) => doc.related_id === quote.id || doc.related_id === quote.lead_id || doc.related_id === contract?.id).length;
    const blockers = Array.isArray(contract?.execution_blockers) ? contract.execution_blockers : [];
    const leadType = lead?.lead_type === 'buyer' || lead?.lead_type === 'supplier' ? lead.lead_type : 'mixed';
    return {
      quoteId: quote.id,
      leadId: quote.lead_id,
      contractId: contract?.id ?? null,
      companyName: lead?.company_name ?? 'Unmapped buyer',
      country: lead?.country ?? null,
      leadType,
      currency: quote.currency ?? lead?.deal_currency ?? null,
      value: lead?.deal_value ?? null,
      status: quote.status ?? 'accepted',
      executionState: contract?.execution_state ?? 'quote_approved',
      documentCount: docCount,
      blockerCount: blockers.length,
    };
  });

  return <ApprovedOrdersRedesignWorkspace orders={orders} />;
}
