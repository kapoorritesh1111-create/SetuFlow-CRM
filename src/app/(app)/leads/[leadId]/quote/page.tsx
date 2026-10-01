import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getLeadProfileData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import WorkflowToast from '@/features/leads/canonical/WorkflowToast';
import CanonicalQuoteBuilderApprovalQueueV2 from '@/features/quotes/canonical/CanonicalQuoteBuilderApprovalQueueV2';
import PricingV4SalesConfigurator from '@/features/packaging/components/pricing-v4-sales-configurator';
import PremiumPackagingQuoteBuilderV5 from '@/features/packaging/components/premium-packaging-quote-builder-v5';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingFamilies, getPackagingTemplates, getQuoteOptionalCharges, getPackagingSavedSpecs } from '@/lib/packaging/queries';
import { isPackagingPricingV4EnabledForOrg, listSalesPackagingPricingV4Options } from '@/lib/packaging-pricing/sales-options';
import { isPackagingPricingV5EnabledForOrg, listSalesPackagingPricingV5Options } from '@/lib/packaging-pricing-v5/sales-options';
import { listSalesPackagingFramePricingV5Options } from '@/lib/packaging-pricing-v5/frame-sales-options';
import { listPricingV5SavedLineSummaries } from '@/lib/packaging-pricing-v5/saved-line';
import { listPricingV5FrameSavedLineSummaries } from '@/lib/packaging-pricing-v5/frame-saved-line';
import ManualPackagingQuoteSection from '@/features/packaging/components/manual-packaging-quote-section';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function quoteFeedback(searchParams?: { quoteDraftError?: string | string[]; quoteActionError?: string | string[]; saved?: string | string[] }) {
  const actionError = readParam(searchParams?.quoteActionError).trim();
  const draftError = readParam(searchParams?.quoteDraftError).trim();
  const saved = readParam(searchParams?.saved).trim();
  if (actionError) return { kind: 'error' as const, message: `Action could not finish: ${decodeURIComponent(actionError)}` };
  if (draftError) return { kind: 'warning' as const, message: `Quote action needs attention: ${decodeURIComponent(draftError)}` };
  if (saved) return { kind: 'success' as const, message: `Saved ${saved}.` };
  return null;
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: { leadId: string };
  searchParams?: { quoteId?: string | string[]; step?: string | string[]; quoteDraftError?: string | string[]; quoteActionError?: string | string[]; saved?: string | string[] };
}) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;
  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values in the current environment." />;
  }

  if (!workspace?.membership || !workspace?.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const data = await getLeadProfileData(workspace.organization.id, params.leadId);
  if (!data?.lead) {
    return <EmptyState title="Lead not found" description="The requested lead could not be loaded from the active workspace." />;
  }

  if (String(data.lead.lead_type || '').toLowerCase() === 'supplier') {
    redirect(`/leads/${params.leadId}?mode=suppliers&quoteDraftError=${encodeURIComponent('Supplier records use Cost Requests, not buyer quotes.')}`);
  }

  const quoteId = readParam(searchParams?.quoteId).trim() || null;
  const selectedQuote = quoteId ? data.quotes.find((quote: any) => quote.id === quoteId) : null;
  if (selectedQuote && String(selectedQuote.status || '').toLowerCase() === 'sent') {
    redirect(`/quotes?status=sent&mode=buyers&quoteId=${selectedQuote.id}`);
  }
  const feedback = quoteFeedback(searchParams);
  const sortedQuotes = [...data.quotes].sort((a: any, b: any) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
  const activeQuote = (quoteId ? sortedQuotes.find((quote: any) => quote.id === quoteId) : null) ?? sortedQuotes[0] ?? null;

  // Pricing v5 is additive and has precedence only when its own flag is enabled,
  // a published/rated v5 model is available, and the quote is editable. If any
  // v5 gate fails, the existing v4 route is retained unchanged for rollback.
  let packaging: { enabled: boolean; families: any[]; templates: any[]; charges: any[]; savedSpecs: any[] } | null = null;
  let pricingV5Options: any | null = null;
  let pricingV5FrameOptions: any | null = null;
  let pricingV4Options: any | null = null;
  try {
    const supabase = await createClient();
    const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
    if (verticals.packagingEnabled) {
      const [families, templates, charges, savedSpecs] = await Promise.all([
        getPackagingFamilies(workspace.organization.id, supabase),
        getPackagingTemplates(workspace.organization.id, supabase),
        activeQuote ? getQuoteOptionalCharges(workspace.organization.id, activeQuote.id, supabase) : Promise.resolve([]),
        getPackagingSavedSpecs(workspace.organization.id, params.leadId, supabase),
      ]);
      packaging = { enabled: true, families, templates, charges, savedSpecs };

      const editableQuote = Boolean(activeQuote && !['sent','accepted','rejected','expired','cancelled','declined'].includes(String(activeQuote.status ?? '').toLowerCase()));
      if (editableQuote) {
        const v5Enabled = await isPackagingPricingV5EnabledForOrg(workspace.organization.id);
        if (v5Enabled) {
          const [options,frameOptions] = await Promise.all([
            listSalesPackagingPricingV5Options(workspace.organization.id),
            listSalesPackagingFramePricingV5Options(workspace.organization.id),
          ]);
          if (options.families.length && options.templates.length && options.sizes.length && options.constructions.length) pricingV5Options = options;
          if (frameOptions.families.length && frameOptions.templates.length) pricingV5FrameOptions = frameOptions;
        }

        if (!pricingV5Options && !pricingV5FrameOptions) {
          const v4Enabled = await isPackagingPricingV4EnabledForOrg(workspace.organization.id);
          if (v4Enabled) {
            const options = await listSalesPackagingPricingV4Options(workspace.organization.id);
            if (options.families.length && options.templates.length) pricingV4Options = options;
          }
        }
      }
    }
  } catch {
    // A v5 readiness/query failure cannot break quoting. Fall back to the
    // existing v4/legacy packaging behavior rather than exposing partial v5.
    pricingV5Options = null;
    pricingV5FrameOptions = null;
    pricingV4Options = null;
  }

  const canonicalPackaging = pricingV5Options || pricingV5FrameOptions || pricingV4Options ? null : packaging;
  const savedPricingV5Lines = activeQuote ? listPricingV5SavedLineSummaries(activeQuote.lineItems as any[]) : [];
  const savedPricingV5FrameLines = activeQuote ? listPricingV5FrameSavedLineSummaries(activeQuote.lineItems as any[]) : [];
  const quoteCurrency = String(activeQuote?.currency || data.lead?.deal_currency || 'INR').toUpperCase();
  const pricingLineTotal = activeQuote ? (activeQuote.lineItems as any[]).reduce((sum:number,line:any)=>sum+(Number(line.quantity||0)*Number(line.unit_price||line.catalog_price_amount||0)),0) : 0;
  const optionalChargeTotal = (packaging?.charges ?? []).reduce((sum:number,item:any)=>sum+Math.max(0,Number(item.amount??0)),0);
  const v5TaxTotal = activeQuote ? (activeQuote.lineItems as any[]).reduce((sum:number,line:any)=>sum+(Number(line.calculation_version)===5?Math.max(0,Number(line.pricing_breakdown_json?.selling_price?.gst??0)):0),0) : 0;
  const liveQuoteTotal = pricingLineTotal + optionalChargeTotal + v5TaxTotal;
  const manualPricingFamilies = (packaging?.families ?? []).filter((family:any)=>family.is_quoteable===true && !family.pricing_engine_type && family.slug==='spout-pouches');
  const manualPackagingLines = activeQuote ? (activeQuote.lineItems as any[]).filter((line:any)=>line.line_type==='packaging' && manualPricingFamilies.some((family:any)=>family.id===line.packaging_family_id) && line.input_snapshot_json?.source==='manual_packaging_price') : [];

  return (
    <>
      {feedback ? <WorkflowToast kind={feedback.kind} message={feedback.message} /> : null}
      {activeQuote && manualPricingFamilies.length ? (
        <ManualPackagingQuoteSection
          quoteId={activeQuote.id}
          leadId={params.leadId}
          currency={quoteCurrency}
          families={manualPricingFamilies}
          lines={manualPackagingLines}
        />
      ) : null}
      {(pricingV5Options || pricingV5FrameOptions) && activeQuote ? (
        <PremiumPackagingQuoteBuilderV5
          quoteId={activeQuote.id}
          leadId={params.leadId}
          buyerName={String(data.lead.company_name || data.lead.contact_name || 'Buyer quote')}
          quoteNumber={String(activeQuote.quote_number || ('Q-'+activeQuote.id.slice(0,8).toUpperCase()))}
          status={String(activeQuote.status || 'draft').replaceAll('_',' ')}
          currency={quoteCurrency}
          supOptions={pricingV5Options}
          frameOptions={pricingV5FrameOptions}
          supSavedLines={savedPricingV5Lines}
          frameSavedLines={savedPricingV5FrameLines}
          quoteTotal={liveQuoteTotal}
        />
      ) : null}
      {!pricingV5Options && !pricingV5FrameOptions && pricingV4Options && activeQuote ? (
        <div className="mb-4">
          <PricingV4SalesConfigurator quoteId={activeQuote.id} leadId={params.leadId} options={pricingV4Options} />
        </div>
      ) : null}
      <div id="quote-commercial-review">
      <CanonicalQuoteBuilderApprovalQueueV2
        data={data}
        quoteId={quoteId}
        step={readParam(searchParams?.step).trim() || null}
        quoteDraftError={readParam(searchParams?.quoteDraftError).trim() ? decodeURIComponent(readParam(searchParams?.quoteDraftError).trim()) : null}
        quoteActionError={readParam(searchParams?.quoteActionError).trim() ? decodeURIComponent(readParam(searchParams?.quoteActionError).trim()) : null}
        saved={readParam(searchParams?.saved).trim() || null}
        packaging={canonicalPackaging}
        quoteOptionalCharges={packaging?.charges ?? []}
      />
      </div>
    </>
  );
}
