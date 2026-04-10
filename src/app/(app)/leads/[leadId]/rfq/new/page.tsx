import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { normalizeQuotesForTimeline } from '@/lib/normalizers/quote-normalizer';
import { getLeadProfileData } from '@/lib/queries/data';
import { hasSupabaseEnv } from '@/lib/env';
import RfqForm from '@/features/rfqs/components/rfq-form';
import { buildLeadActivityTimeline } from '@/lib/activity-timeline';
import { ActivityTimeline } from '@/components/ui/activity-timeline';
import { buildCatalogPricingSnapshot, getPricingReadinessClasses, getPricingReadinessLabel } from '@/lib/catalog-pricing-model';
import { StateMessage } from '@/components/ui/state-message';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export default async function CreateRfqPage({ params }: { params: { leadId: string } }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;
  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local or Vercel project settings." />;
  }

  if (!workspace?.membership || !workspace?.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const leadId = params.leadId;
  let data: Awaited<ReturnType<typeof getLeadProfileData>> | null = null;
  try {
    data = await getLeadProfileData(workspace.organization.id, leadId);
  } catch {
    return <EmptyState title="Error loading lead" description="An unexpected error occurred while loading the lead. Please try again." />;
  }

  if (!data || !data.lead) {
    return <EmptyState title="Lead not found" description="The requested lead could not be loaded from the active workspace." />;
  }

  const lead = data.lead;
  const canManageRfqs = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage');
  const leadCommandHref = `/leads/${leadId}?tab=quotes`;

  const workflow = data.workflow ?? {};
  const qualificationStatus = String(workflow.qualificationStatus ?? 'not_started');
  const mappedProductCount = Array.isArray(data.linkedProducts) ? data.linkedProducts.length : 0;
  const mappedMarketCount = Array.isArray(data.linkedMarkets) ? data.linkedMarkets.length : 0;

  if (qualificationStatus !== 'qualified') {
    return <EmptyState title="Qualification required" description="This lead must be marked as qualified before an RFQ can be created. Update qualification on the lead profile and then return here." />;
  }

  if (mappedProductCount === 0) {
    return <EmptyState title="Product mapping required" description="Link at least one structured product to this qualified lead before creating an RFQ." actionHref={leadCommandHref} actionLabel="Return to lead" />;
  }

  if (mappedMarketCount === 0) {
    return <EmptyState title="Market coverage required" description="Map at least one market to this qualified lead before creating an RFQ so supplier targeting and coverage summaries stay trustworthy." actionHref={leadCommandHref} actionLabel="Return to lead" />;
  }
  const pricingSnapshot = buildCatalogPricingSnapshot({
    linkedProducts: data.linkedProducts,
    variants: data.variants,
    prices: data.prices,
    rules: data.pricingRules,
    rfqLineItems: data.rfqs.flatMap((rfq) => rfq.lineItems),
    quoteLineItems: data.quotes.flatMap((quote) => quote.lineItems),
  });
  const stageNameMap = new Map(data.stages.map((stage) => [stage.id, stage.name]));
  const timelineEvents = buildLeadActivityTimeline({
    lead: { id: lead.id, company_name: lead.company_name, created_at: lead.created_at, updated_at: lead.updated_at, notes: lead.notes },
    activities: data.activities,
    followUps: data.followUps,
    stageHistory: data.stageHistory,
    rfqs: data.rfqs,
    quotes: normalizeQuotesForTimeline(data.quotes),
    complianceItems: data.complianceItems,
    complianceDefinitions: data.complianceDefinitions,
    communications: data.communications.map((item) => ({
      id: item.id,
      lead_id: item.lead_id,
      quote_id: item.quote_id,
      related_entity: item.related_entity,
      related_id: item.related_id,
      communication_type: item.communication_type,
      channel: item.channel,
      subject: item.subject,
      summary: item.summary,
      status: item.status,
      draft_source: item.draft_source,
      created_at: item.created_at,
      sent_at: item.sent_at,
      scheduled_at: item.scheduled_at,
      metadata: item.metadata,
    })),
    stageNameMap,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">RFQ command center</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{lead.company_name}</h2>
          <p className="mt-1 text-sm text-slate-600">Draft qualified buyer demand into an RFQ, validate pricing coverage, and route the request into supplier response tracking without leaving the lead workflow.</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Qualification gate passed · {mappedProductCount} mapped products · {mappedMarketCount} mapped markets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={leadCommandHref} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Lead</Link>
          <Link href={`/leads/${leadId}/quote`} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Quotes</Link>
          <Link href="/pipeline" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Pipeline</Link>
        </div>
      </div>



      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operating rules</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">Qualified leads only</p><p className="mt-2 text-sm text-slate-600">RFQs are created only after qualification and structured product mapping are complete.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">Use pricing coverage</p><p className="mt-2 text-sm text-slate-600">Review catalog pricing readiness before sending supplier requests or drafting quotes.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">Route into quotes</p><p className="mt-2 text-sm text-slate-600">Use RFQ responses and line readiness to move into quote drafting with fewer overrides.</p></div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Next best actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/leads/${leadId}/quote`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white">Open quote workspace</Link>
            <Link href={`/leads/${leadId}#timeline`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white">Review timeline</Link>
            <Link href="/tasks" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white">Follow-ups</Link>
          </div>
          <p className="mt-4 text-sm text-slate-600">Keep the RFQ as the structured bridge between qualified demand and quote-ready commercial work.</p>
        </div>
      </div>

      {readOnlyMessage ? (
        <StateMessage
          tone="warning"
          title="Read-only RFQ workspace"
          description={`${readOnlyMessage} You can review lead context, pricing coverage, and the timeline here, but RFQ creation stays disabled.`}
        />
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-slate-900">Company &amp; Contact</h3>
        <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <p><span className="font-medium text-slate-900">Company:</span> {lead.company_name}</p>
          <p><span className="font-medium text-slate-900">Contact:</span> {lead.contact_name ?? 'No contact'}</p>
          <p><span className="font-medium text-slate-900">Email:</span> {lead.email ?? 'No email'}</p>
          <p><span className="font-medium text-slate-900">Phone:</span> {lead.phone ?? 'No phone'}</p>
          <p><span className="font-medium text-slate-900">Country:</span> {lead.country ?? 'Not set'}</p>
          <p><span className="font-medium text-slate-900">Lead type:</span> {lead.lead_type}</p>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing linkage</p><p className="mt-1 text-sm text-slate-600">Draft the RFQ with clear visibility into which linked products already have catalog pricing coverage.</p></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPricingReadinessClasses(pricingSnapshot.pricingReadiness)}`}>{getPricingReadinessLabel(pricingSnapshot.pricingReadiness)}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Priced products</p><p className="mt-2 text-lg font-semibold text-slate-900">{pricingSnapshot.linkedPricedProductCount}/{pricingSnapshot.linkedProductCount}</p></div><div className="rounded-2xl bg-white px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">RFQ line coverage</p><p className="mt-2 text-lg font-semibold text-slate-900">{pricingSnapshot.rfqPricedLineCount}/{pricingSnapshot.rfqLinkedLineCount || 0}</p></div><div className="rounded-2xl bg-white px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Covered markets</p><p className="mt-2 text-lg font-semibold text-slate-900">{pricingSnapshot.coveredMarketCount}</p></div></div><div className="mt-6">{canManageRfqs ? <RfqForm leadId={leadId} products={data.products.map((p) => ({ id: p.id, name: p.name }))} /> : <EmptyState title="RFQ creation is disabled for this role" description="Switch to a role with lead-manage access to draft an RFQ from this lead." actionHref={leadCommandHref} actionLabel="Return to lead" />}</div></div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Deal timeline</h3>
          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Lead, RFQ, quote, compliance</span>
        </div>
        <div className="mt-4">
          <ActivityTimeline events={timelineEvents} emptyLabel="No activity logged yet." />
        </div>
      </div>
    </div>
  );
}
