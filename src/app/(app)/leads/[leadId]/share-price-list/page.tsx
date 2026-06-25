import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getLeadProfileData } from '@/lib/queries/leads';
import { requireWorkspace } from '@/lib/workspace/auth';
import SharePriceListPremium from '@/features/leads/share-price-list/SharePriceListPremium';

export default async function SharePriceListPage({ params }: { params: { leadId: string } }) {
  let workspace: Awaited<ReturnType<typeof requireWorkspace>> | null = null;
  try {
    workspace = await requireWorkspace();
  } catch {
    return <EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values to load this page." />;
  }
  if (!workspace?.membership || !workspace?.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const data = await getLeadProfileData(workspace.organization.id, params.leadId);
  if (!data?.lead) notFound();

  const lead = data.lead;
  const marketName = (data.linkedMarkets as Array<{ name?: string | null }>)[0]?.name ?? null;
  const products = (data.linkedProducts as Array<{ id: string; name: string; sku?: string | null }>).map((p) => ({ id: p.id, name: p.name, sku: p.sku ?? null }));

  return (
    <SharePriceListPremium
      leadId={params.leadId}
      lead={{
        id: lead.id,
        company_name: lead.company_name ?? null,
        contact_name: lead.contact_name ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        whatsapp_number: lead.whatsapp_number ?? null,
        country: lead.country ?? null,
      }}
      products={products}
      marketName={marketName}
    />
  );
}
