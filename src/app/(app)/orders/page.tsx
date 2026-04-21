/**
 * Orders — execution workspace
 *
 * Live Supabase query: accepted quotes with documents,
 * compliance items, and contract status per order card.
 */

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { inferOrderTradeWorkflow } from '@/features/trade-workflow/logic';
import { predictOrderDelay } from '@/features/ai/logic/intelligence';
import { AIInsightCard, AIOrderDelayPanel } from '@/features/ai/ui/intelligence-panels';
import { TradeSignalGrid } from '@/features/trade-workflow/ui';
import { extractLineContinuityNote, parseTradeAttributes } from '@/lib/trade-attributes';
import { getCommercialLockStateLabel, parseContractCommercialSnapshot } from '@/lib/contract-lock';
import { evaluateOrderExecution, getOrderExecutionStateLabel } from '@/lib/order-execution';
import { buildOrderOperationalControlState, type OrderOperationalControlState } from '@/lib/order-operations';
import type { DocumentRequirementRule } from '@/lib/document-requirements';
import { progressOrderExecution } from '@/features/orders/server/actions';

// ─── Explicit row types (avoids Supabase generic inference issues) ────────────

type QuoteRow = {
  id: string;
  status: string;
  currency: string | null;
  updated_at: string;
  lead_id: string;
};

type LeadRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  country: string | null;
  deal_value: number | null;
  deal_currency: string | null;
  lead_type: 'buyer' | 'supplier' | null;
};

type DocRow = {
  id: string;
  file_name: string;
  doc_type: string;
  status: string;
  uploaded_at: string;
  version: number;
  related_id: string;
  related_entity: string | null;
  requirement_code: string | null;
  expires_at: string | null;
  review_notes: string | null;
};

type ComplianceRow = {
  id: string;
  lead_id: string;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  compliance_item_id: string;
};

type ContractRow = {
  id: string;
  quote_id: string;
  status: string;
  signed_at: string | null;
  starts_on: string | null;
  ends_on: string | null;
  commercial_lock_state: string | null;
  pricing_basis: string | null;
  quote_currency: string | null;
  approval_required: boolean;
  approval_state: string;
  commercial_snapshot: unknown;
  execution_state: string | null;
  execution_blockers: unknown;
  execution_snapshot: unknown;
  ready_at: string | null;
  released_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
};

type ContractLineRow = {
  id: string;
  contract_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
  unit_price: number | null;
  currency: string | null;
  notes: string | null;
  catalog_price_amount: number | null;
  catalog_price_currency: string | null;
  is_price_overridden: boolean | null;
  override_reason: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  name: string | null;
  pack_label: string | null;
  sku_code: string | null;
  source_payload: unknown;
};

type LeadMarketRow = { lead_id: string; market_id: string };
type LeadProductInterestRow = { lead_id: string; product_id: string };

type OrderRecord = {
  quoteId: string;
  quoteStatus: string;
  currency: string | null;
  updatedAt: string;
  leadId: string;
  companyName: string;
  contactName: string | null;
  country: string | null;
  dealValue: number | null;
  dealCurrency: string | null;
  leadType: 'buyer' | 'supplier' | 'mixed';
  documents: DocRow[];
  complianceItems: ComplianceRow[];
  contract: ContractRow | null;
  executionState: string;
  executionBlockers: string[];
  executionActionItems: string[];
  nextExecutionState: string | null;
  canAdvanceExecution: boolean;
  operationalControls: OrderOperationalControlState;
  lines: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    skuCode: string | null;
    quantity: number;
    unitPrice: number | null;
    currency: string | null;
    catalogPriceAmount: number | null;
    catalogPriceCurrency: string | null;
    isPriceOverridden: boolean;
    overrideReason: string | null;
    notes: string | null;
    continuityNote: string | null;
    countryOfOrigin: string | null;
    exportMetadata: string | null;
    packaging: string | null;
    shipmentNotes: string | null;
  }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusClasses(s: string): string {
  const v = s.toLowerCase();
  if (['approved', 'complete', 'ready', 'signed', 'active'].includes(v))
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['rejected', 'expired', 'missing', 'terminated'].includes(v))
    return 'border-rose-200 bg-rose-50 text-rose-700';
  if (['submitted', 'in_review', 'pending_review', 'sent'].includes(v))
    return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function titleCase(v: string): string {
  return v.split(/[_\s-]+/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function dispatchGate(controls: OrderOperationalControlState): { label: string; tone: 'success' | 'warning' | 'danger' } {
  const blocked = controls.documentRequirementSummary.blockerReasons.length
    + controls.complianceSummary.blockerReasons.length
    + controls.releaseArtifactReasons.length
    + controls.dispatchArtifactReasons.length;
  if (blocked === 0) return { label: 'Dispatch ready', tone: 'success' };
  if (blocked <= 3) return { label: `${blocked} blocker${blocked > 1 ? 's' : ''}`, tone: 'warning' };
  return { label: `${blocked} blockers`, tone: 'danger' };
}

function decodeNotice(noticeKey: string | null) {
  if (!noticeKey) return null;
  if (noticeKey === 'quote-accepted') {
    return { title: 'Quote moved into Orders', description: 'The accepted quote is now visible in the order workspace so the team can verify documents, compliance, and execution readiness.', tone: 'success' as const };
  }
  if (noticeKey.startsWith('order-state-progressed:')) {
    const state = noticeKey.split(':')[1] ?? 'updated';
    return { title: 'Order execution updated', description: `Execution posture moved to ${getOrderExecutionStateLabel(state)}.`, tone: 'success' as const };
  }
  if (noticeKey.startsWith('order-state-blocked:')) {
    return { title: 'Order execution is blocked', description: noticeKey.slice('order-state-blocked:'.length).split(' | ').join(' '), tone: 'warning' as const };
  }
  if (noticeKey.startsWith('order-readonly:')) {
    return { title: 'Order execution is read-only', description: noticeKey.slice('order-readonly:'.length), tone: 'warning' as const };
  }
  const map: Record<string, { title: string; description: string; tone: 'warning' | 'danger' }> = {
    'order-state-out-of-sequence': { title: 'Execution state is out of sequence', description: 'Refresh the order workspace and use the next allowed transition only.', tone: 'warning' },
    'order-action-invalid': { title: 'Order action is invalid', description: 'The order progression payload was incomplete.', tone: 'danger' },
    'order-contract-missing': { title: 'Linked contract is missing', description: 'Orders can only progress execution when the contract handoff exists.', tone: 'danger' },
    'order-update-failed': { title: 'Order execution update failed', description: 'The contract execution state could not be saved.', tone: 'danger' },
    'order-auth-error': { title: 'Authentication required', description: 'Sign in with an active workspace membership to continue.', tone: 'danger' },
    'order-config-error': { title: 'Configuration required', description: 'Supabase environment variables are not set.', tone: 'danger' },
  };
  return map[noticeKey] ?? null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function OrdersPage({ searchParams }: { searchParams?: { notice?: string | string[]; mode?: string | string[] } }) {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return (
      <EmptyState
        title="Workspace required"
        description="Sign in with an active organization membership to view orders."
      />
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <EmptyState
        title="Configuration required"
        description="Supabase environment variables are not set."
      />
    );
  }

  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const orgId = workspace.organization.id;
  const normalizedRoles = new Set((workspace.currentRoles ?? []).map((role) => String(role).trim().toLowerCase()).filter(Boolean));
  const primaryOperationalContext = normalizedRoles.has('sourcing') || normalizedRoles.has('procurement')
    ? 'supplier'
    : normalizedRoles.has('sales')
      ? 'buyer'
      : 'mixed';

  // 1. Fetch accepted quotes only — orders should represent won commercial work
  const { data: rawQuotes, error: quotesError } = await db
    .from('quotes')
    .select('id, status, currency, updated_at, lead_id')
    .eq('organization_id', orgId)
    .in('status', ['accepted'])
    .order('updated_at', { ascending: false })
    .limit(50);

  if (quotesError) {
    return (
      <EmptyState
        title="Could not load orders"
        description={String(quotesError.message ?? 'Unknown error')}
      />
    );
  }

  const quotes: QuoteRow[] = Array.isArray(rawQuotes) ? (rawQuotes as QuoteRow[]) : [];

  if (quotes.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <StateMessage
          title={primaryOperationalContext === 'supplier' ? 'Supplier execution context is active' : primaryOperationalContext === 'buyer' ? 'Buyer execution context is active' : 'Mixed execution context is active'}
          description={primaryOperationalContext === 'supplier' ? 'Orders is now the execution workspace for supplier-side fulfilment. The primary action is to open one accepted record and clear blockers.' : primaryOperationalContext === 'buyer' ? 'Orders is now the execution workspace for buyer-side fulfilment. The primary action is to open one accepted record and keep execution moving.' : 'Orders is showing accepted work across buyer and supplier activity. Focus on one accepted record at a time and clear blockers first.'}
          tone="neutral"
        />
        <PageHeader
          eyebrow="Orders / Execution"
          title="Orders / Execution"
          description="Accepted quotes become operational orders here with documents, compliance, and execution status in one place."
          badge="Live"
          status="No orders yet"
          actions={[{ label: 'Go to Follow-up', href: PRODUCT_ROUTES.app.leads }]}
        />
        <SectionCard
          eyebrow="No orders yet"
          title="Orders appear here when quotes are accepted"
          description="Accept a quote from the lead quote workspace and it will appear here with its full execution context."
        >
          <Link
            href={PRODUCT_ROUTES.app.leads}
            className="inline-flex rounded-2xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Go to Leads
          </Link>
        </SectionCard>
      </div>
    );
  }

  const quoteIds: string[] = quotes.map(q => q.id);
  const leadIds: string[] = [...new Set(quotes.map(q => q.lead_id))];

  // 2–10. Parallel fetch: leads, documents, compliance, contracts, and line continuity
  const [leadsResult, docsResult, complianceResult, contractsResult, productsResult, variantsResult, leadMarketsResult, leadProductInterestsResult, requirementRulesResult] = await Promise.all([
    db.from('leads')
      .select('id, company_name, contact_name, country, deal_value, deal_currency, lead_type')
      .eq('organization_id', orgId)
      .in('id', leadIds),

    db.from('documents')
      .select('id, file_name, doc_type, status, uploaded_at, version, related_id, related_entity, requirement_code, expires_at, review_notes')
      .eq('organization_id', orgId)
      .in('related_entity', ['quote', 'lead'])
      .in('related_id', [...quoteIds, ...leadIds])
      .order('uploaded_at', { ascending: false }),

    db.from('lead_compliance_items')
      .select('id, lead_id, status, submitted_at, approved_at, compliance_item_id')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false }),

    db.from('contracts')
      .select('id, quote_id, status, signed_at, starts_on, ends_on, commercial_lock_state, pricing_basis, quote_currency, approval_required, approval_state, commercial_snapshot, execution_state, execution_blockers, execution_snapshot, ready_at, released_at, dispatched_at, completed_at')
      .eq('organization_id', orgId)
      .in('quote_id', quoteIds),

    db.from('products')
      .select('id, name, sku')
      .eq('organization_id', orgId),

    db.from('product_variants')
      .select('id, product_id, name, pack_label, sku_code, source_payload, country_of_origin, export_metadata, packaging_type, packaging_unit, units_per_case, net_weight_kg, shipment_notes, shipment_attributes, pricing_mode_default')
      .eq('organization_id', orgId),

    db.from('lead_markets')
      .select('lead_id, market_id')
      .in('lead_id', leadIds),

    db.from('lead_product_interests')
      .select('lead_id, product_id')
      .in('lead_id', leadIds),

    db.from('document_requirement_rules')
      .select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active')
      .eq('organization_id', orgId)
      .eq('is_active', true),
  ]);

  // Build lookup maps with explicit typing
  const leadMap = new Map<string, LeadRow>();
  (Array.isArray(leadsResult.data) ? leadsResult.data as LeadRow[] : [])
    .forEach(l => leadMap.set(l.id, l));

  const docsByQuote = new Map<string, DocRow[]>();
  const docsByLead = new Map<string, DocRow[]>();
  (Array.isArray(docsResult.data) ? docsResult.data as DocRow[] : [])
    .forEach(d => {
      if (d.related_entity === 'quote') {
        const arr = docsByQuote.get(d.related_id) ?? [];
        arr.push(d);
        docsByQuote.set(d.related_id, arr);
      }
      if (d.related_entity === 'lead') {
        const arr = docsByLead.get(d.related_id) ?? [];
        arr.push(d);
        docsByLead.set(d.related_id, arr);
      }
    });

  const complianceByLead = new Map<string, ComplianceRow[]>();
  (Array.isArray(complianceResult.data) ? complianceResult.data as ComplianceRow[] : [])
    .forEach(c => {
      const arr = complianceByLead.get(c.lead_id) ?? [];
      arr.push(c);
      complianceByLead.set(c.lead_id, arr);
    });

  const contractRows: ContractRow[] = Array.isArray(contractsResult.data) ? (contractsResult.data as ContractRow[]) : [];
  const contractByQuote = new Map<string, ContractRow>();
  contractRows.forEach(c => contractByQuote.set(c.quote_id, c));

  const contractIds = contractRows.map((contract) => contract.id);
  const contractLineItemsData = contractIds.length
    ? await db.from('contract_line_items').select('id, contract_id, product_id, product_variant_id, quantity, unit_price, currency, notes, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason').in('contract_id', contractIds)
    : { data: [], error: null };

  const productsById = new Map<string, ProductRow>();
  (Array.isArray(productsResult.data) ? productsResult.data as ProductRow[] : []).forEach((product) => productsById.set(product.id, product));
  const variantsById = new Map<string, ProductVariantRow>();
  (Array.isArray(variantsResult.data) ? variantsResult.data as ProductVariantRow[] : []).forEach((variant) => variantsById.set(variant.id, variant));
  const linesByContract = new Map<string, ContractLineRow[]>();
  (Array.isArray(contractLineItemsData.data) ? contractLineItemsData.data as ContractLineRow[] : []).forEach((line) => {
    const arr = linesByContract.get(line.contract_id) ?? [];
    arr.push(line);
    linesByContract.set(line.contract_id, arr);
  });

  const leadMarketIdsByLead = new Map<string, string[]>();
  (Array.isArray(leadMarketsResult.data) ? leadMarketsResult.data as LeadMarketRow[] : []).forEach((entry) => {
    const arr = leadMarketIdsByLead.get(entry.lead_id) ?? [];
    arr.push(entry.market_id);
    leadMarketIdsByLead.set(entry.lead_id, arr);
  });
  const leadProductIdsByLead = new Map<string, string[]>();
  (Array.isArray(leadProductInterestsResult.data) ? leadProductInterestsResult.data as LeadProductInterestRow[] : []).forEach((entry) => {
    const arr = leadProductIdsByLead.get(entry.lead_id) ?? [];
    arr.push(entry.product_id);
    leadProductIdsByLead.set(entry.lead_id, arr);
  });
  const requirementRules = Array.isArray(requirementRulesResult.data) ? requirementRulesResult.data as DocumentRequirementRule[] : [];

  // Assemble order records
  const orders: OrderRecord[] = quotes.map((q) => {
    const lead = leadMap.get(q.lead_id);
    const contract = contractByQuote.get(q.id) ?? null;
    const quoteDocuments = docsByQuote.get(q.id) ?? [];
    const leadDocuments = docsByLead.get(q.lead_id) ?? [];
    const complianceItems = complianceByLead.get(q.lead_id) ?? [];
    const lineItems = ((contract?.id ? linesByContract.get(contract.id) : []) ?? []).map((line) => {
      const product = line.product_id ? productsById.get(line.product_id) : null;
      const variant = line.product_variant_id ? variantsById.get(line.product_variant_id) : null;
      const tradeAttributes = parseTradeAttributes({ ...(variant ?? {}), source_payload: variant?.source_payload ?? null });
      return {
        id: line.id,
        productName: product?.name ?? 'Unmapped product',
        variantName: variant?.pack_label ?? variant?.name ?? null,
        skuCode: variant?.sku_code ?? product?.sku ?? null,
        quantity: line.quantity,
        unitPrice: line.unit_price,
        currency: line.currency,
        catalogPriceAmount: line.catalog_price_amount,
        catalogPriceCurrency: line.catalog_price_currency,
        isPriceOverridden: Boolean(line.is_price_overridden),
        overrideReason: line.override_reason,
        notes: line.notes,
        continuityNote: extractLineContinuityNote(line.notes),
        countryOfOrigin: tradeAttributes.countryOfOrigin,
        exportMetadata: tradeAttributes.exportMetadata,
        packaging: [tradeAttributes.packagingType, tradeAttributes.packagingUnit].filter(Boolean).join(' · ') || null,
        shipmentNotes: tradeAttributes.shipmentNotes,
      };
    });

    const allDocuments = [...quoteDocuments, ...leadDocuments].sort((left, right) => String(right.uploaded_at ?? '').localeCompare(String(left.uploaded_at ?? '')));
    const operationalControls = buildOrderOperationalControlState({
      documents: allDocuments,
      complianceItems,
      requirementRules,
      leadType: lead?.lead_type ?? null,
      marketIds: leadMarketIdsByLead.get(q.lead_id) ?? [],
      productIds: leadProductIdsByLead.get(q.lead_id) ?? [],
      lines: lineItems.map((line) => ({
        countryOfOrigin: line.countryOfOrigin,
        exportMetadata: line.exportMetadata,
        shipmentNotes: line.shipmentNotes,
      })),
    });

    const executionEvaluation = evaluateOrderExecution({
      quoteAccepted: String(q.status ?? '').toLowerCase() === 'accepted',
      hasContract: Boolean(contract),
      contractStatus: contract?.status,
      contractSignedAt: contract?.signed_at,
      commercialLockState: contract?.commercial_lock_state,
      lineCount: lineItems.length,
      openDocumentBlockers: allDocuments.filter((doc) => !['approved', 'complete', 'ready', 'completed'].includes(doc.status.toLowerCase())).length,
      openComplianceBlockers: complianceItems.filter((item) => !['approved', 'complete', 'waived', 'completed'].includes(item.status.toLowerCase())).length,
      documentRequirementReasons: operationalControls.documentRequirementSummary.blockerReasons,
      complianceRequirementReasons: operationalControls.complianceSummary.blockerReasons,
      releaseArtifactReasons: operationalControls.releaseArtifactReasons,
      dispatchArtifactReasons: operationalControls.dispatchArtifactReasons,
      completionArtifactReasons: operationalControls.completionArtifactReasons,
      currentState: contract?.execution_state,
      releasedAt: contract?.released_at,
      dispatchedAt: contract?.dispatched_at,
      completedAt: contract?.completed_at,
    });

    return {
      quoteId: q.id,
      quoteStatus: q.status,
      currency: q.currency,
      updatedAt: q.updated_at,
      leadId: q.lead_id,
      companyName: lead?.company_name ?? 'Unknown buyer',
      contactName: lead?.contact_name ?? null,
      country: lead?.country ?? null,
      dealValue: lead?.deal_value ?? null,
      dealCurrency: lead?.deal_currency ?? null,
      leadType: lead?.lead_type === 'buyer' || lead?.lead_type === 'supplier' ? lead.lead_type : 'mixed',
      documents: allDocuments,
      complianceItems,
      contract,
      executionState: executionEvaluation.currentState,
      executionBlockers: executionEvaluation.blockers,
      executionActionItems: executionEvaluation.actionItems,
      nextExecutionState: executionEvaluation.nextState,
      canAdvanceExecution: executionEvaluation.canAdvance,
      operationalControls,
      lines: lineItems,
    };
  });

  const accepted = orders.filter(o => o.quoteStatus === 'accepted');

  const noticeKey = Array.isArray(searchParams?.notice) ? searchParams?.notice[0] ?? null : searchParams?.notice ?? null;
  const notice = decodeNotice(noticeKey);
  const modeParam = Array.isArray(searchParams?.mode) ? searchParams?.mode[0] ?? 'all' : searchParams?.mode ?? 'all';
  const perspectiveMode = modeParam === 'buyers' || modeParam === 'suppliers' ? modeParam : 'all';
  const perspectiveAccepted = accepted.filter((order) => perspectiveMode === 'all' ? true : perspectiveMode === 'buyers' ? order.leadType === 'buyer' : order.leadType === 'supplier');
  const perspectiveOrders = orders.filter((order) => perspectiveMode === 'all' ? true : perspectiveMode === 'buyers' ? order.leadType === 'buyer' : order.leadType === 'supplier');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <StateMessage
        title={primaryOperationalContext === 'supplier' ? 'Supplier execution context is active' : primaryOperationalContext === 'buyer' ? 'Buyer execution context is active' : 'Mixed execution context is active'}
        description={primaryOperationalContext === 'supplier' ? 'Orders is now the execution workspace for supplier-side fulfilment. The primary action is to open one accepted record and clear blockers.' : primaryOperationalContext === 'buyer' ? 'Orders is now the execution workspace for buyer-side fulfilment. The primary action is to open one accepted record and keep execution moving.' : 'Orders is showing accepted work across buyer and supplier activity. Focus on one accepted record at a time and clear blockers first.'}
        tone="neutral"
      />
      <PageHeader
        eyebrow="Orders / Execution"
        title="Orders / Execution"
        description="Accepted quotes become live execution records here with contract-grade continuity, compliance requirements, document controls, and dispatch evidence visible per order."
        badge="Live"
        status={`${perspectiveOrders.length} active`}
        meta={[`${perspectiveAccepted.length} accepted`, perspectiveMode === 'all' ? 'All workspace' : perspectiveMode === 'buyers' ? 'Buyer perspective' : 'Supplier perspective', 'Execution ready only']}
        actions={[{ label: 'Go to Follow-up', href: PRODUCT_ROUTES.app.leads }]}
      />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Execution desk perspective</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Accepted quote truth is not execution truth</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Filter the desk by All, Buyers, or Suppliers without leaving the workflow. Orders now has to prove commercial lock, documentary readiness, release posture, and dispatch evidence before the operator can trust execution.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'buyers', label: 'Buyers' },
              { key: 'suppliers', label: 'Suppliers' },
            ].map((option) => {
              const active = perspectiveMode === option.key;
              const href = option.key === 'all' ? PRODUCT_ROUTES.app.orders : `${PRODUCT_ROUTES.app.orders}?mode=${option.key}`;
              return (
                <Link
                  key={option.key}
                  href={href}
                  className={active ? 'rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white' : 'rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Visible orders</p><p className="mt-2 text-2xl font-semibold text-slate-900">{perspectiveOrders.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Execution ready</p><p className="mt-2 text-2xl font-semibold text-slate-900">{perspectiveAccepted.filter((order) => dispatchGate(order.operationalControls).tone === 'success').length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Blocked records</p><p className="mt-2 text-2xl font-semibold text-slate-900">{perspectiveAccepted.filter((order) => order.executionBlockers.length > 0).length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Next-action pressure</p><p className="mt-2 text-2xl font-semibold text-slate-900">{perspectiveAccepted.reduce((sum, order) => sum + order.executionActionItems.length, 0)}</p></div>
        </div>
      </section>

      <StateMessage
        title="What to do next in Orders"
        description="Orders only represent accepted commercial work. Review blockers first, then open the linked quote if pricing or acceptance context still needs operator confirmation."
        tone="neutral"
      />

      {perspectiveAccepted.length > 0 ? (
        <TradeSignalGrid
          title="Trade execution readiness"
          signals={[
            { label: 'Buyer / supplier clarity', value: primaryOperationalContext === 'mixed' ? 'Mixed mode' : primaryOperationalContext === 'supplier' ? 'Supplier mode' : 'Buyer mode', tone: 'neutral', detail: 'Orders keeps execution lanes visible so trade work does not collapse into a generic CRM state.' },
            { label: 'Freight readiness', value: `${perspectiveAccepted.filter((order) => order.operationalControls.documentRequirementSummary.blockerCount === 0 && order.operationalControls.releaseArtifactReasons.length === 0).length}/${perspectiveAccepted.length} ready`, tone: perspectiveAccepted.some((order) => order.operationalControls.documentRequirementSummary.blockerCount > 0 || order.operationalControls.releaseArtifactReasons.length > 0) ? 'warning' : 'success', detail: 'Release now depends on required compliance documents and release artifacts, not commercial acceptance alone.' },
            { label: 'Compliance blockers', value: String(perspectiveAccepted.reduce((sum, order) => sum + order.operationalControls.complianceSummary.openCount, 0)), tone: perspectiveAccepted.some((order) => order.operationalControls.complianceSummary.openCount > 0) ? 'warning' : 'success', detail: 'Open compliance items stay visible and now feed explicit execution-stage blocker reasons.' },
            { label: 'Dispatch readiness', value: `${perspectiveAccepted.filter((order) => dispatchGate(order.operationalControls).tone === 'success').length}/${perspectiveAccepted.length} ready`, tone: perspectiveAccepted.some((order) => dispatchGate(order.operationalControls).tone !== 'success') ? 'warning' : 'success', detail: 'Dispatch readiness now combines contract, document, compliance, and order-state progression in one execution view.' },
          ]}
        />
      ) : null}

      {perspectiveAccepted.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          {perspectiveAccepted
            .map((order) => predictOrderDelay({
              quoteId: order.quoteId,
              companyName: order.companyName,
              updatedAt: order.updatedAt,
              blockers: order.executionBlockers,
            }))
            .sort((left, right) => right.score - left.score)
            .slice(0, 3)
            .map((prediction) => (
              <AIInsightCard key={prediction.quoteId} title={`${prediction.companyName} · ${prediction.label}`} score={prediction.score} level={prediction.level} reasons={prediction.reasons} />
            ))}
        </section>
      ) : null}

      {perspectiveAccepted.length > 0 && (
        <SectionCard
          eyebrow="Commercially accepted"
          title="Execution desk"
          description="Confirmed quote lines are shown as one execution desk. Operators can now prove commercial lock, clear blockers, and progress draft, ready, release, dispatch, and completion posture with explicit evidence requirements on each order."
        >
          <div className="space-y-6">
            {perspectiveAccepted.map(order => (
              <OrderCard key={order.quoteId} order={order} tone="accepted" />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, tone }: { order: OrderRecord; tone: 'accepted' | 'sent' }) {
  const gate = dispatchGate(order.operationalControls);
  const executionLabel = getOrderExecutionStateLabel(order.executionState);
  const tradeWorkflow = inferOrderTradeWorkflow({
    leadType: order.leadType,
    documentBlockers: order.operationalControls.documentRequirementSummary.blockerReasons.length + order.operationalControls.releaseArtifactReasons.length + order.operationalControls.dispatchArtifactReasons.length,
    complianceBlockers: order.operationalControls.complianceSummary.openCount,
    hasContract: Boolean(order.contract),
    quoteStatus: order.quoteStatus,
  });
  const borderClass = tone === 'accepted' ? 'border-emerald-100' : 'border-amber-100';
  const bgClass = tone === 'accepted' ? 'bg-emerald-50/40' : 'bg-amber-50/30';
  const orderDelayPrediction = predictOrderDelay({
    quoteId: order.quoteId,
    companyName: order.companyName,
    updatedAt: order.updatedAt,
    blockers: order.executionBlockers,
  });

  return (
    <div className={`rounded-2xl border ${borderClass} ${bgClass} p-4`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{order.companyName}</p>
            <StatusBadge
              label={tone === 'accepted' ? 'Accepted' : 'Sent'}
              tone={tone === 'accepted' ? 'success' : 'warning'}
            />
            <StatusBadge label={gate.label} tone={gate.tone} />
            <StatusBadge label={executionLabel} tone={order.executionState === 'completed' ? 'success' : order.canAdvanceExecution ? 'neutral' : 'warning'} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
            {order.contactName && <span>{order.contactName}</span>}
            {order.country && <span>{order.country}</span>}
            <span>Updated {formatDateTime(order.updatedAt)}</span>
            <span>{tradeWorkflow.journeyLabel}</span>
            <span className="font-mono text-slate-400">ref {order.quoteId.slice(0, 8)}</span>
            {order.dealValue != null && (
              <span className="font-semibold text-slate-700">
                {order.dealCurrency ?? order.currency ?? 'USD'}{' '}
                {order.dealValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`${PRODUCT_ROUTES.app.leads}/${order.leadId}/quote`}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            tone === 'accepted'
              ? 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
              : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
          }`}
        >
          View quote
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Execution state machine</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{executionLabel}</p>
            <p className="mt-1 text-xs text-slate-500">Contract-grade commercial continuity stays upstream, while order state is now the operator control plane downstream.</p>
          </div>
          {order.contract && order.nextExecutionState ? (
            <form action={progressOrderExecution} className="flex flex-col items-end gap-2">
              <input type="hidden" name="contract_id" value={order.contract.id} />
              <input type="hidden" name="next_state" value={order.nextExecutionState} />
              <button
                type="submit"
                disabled={!order.canAdvanceExecution}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Mark {getOrderExecutionStateLabel(order.nextExecutionState)}
              </button>
              {!order.canAdvanceExecution ? <p className="max-w-xs text-right text-[10px] text-amber-700">Resolve the blockers below before the next execution transition.</p> : null}
            </form>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Current blockers</p>
            {order.executionBlockers.length === 0 ? (
              <p className="mt-2 text-xs text-emerald-700">No blockers are stopping the next execution transition.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {order.executionBlockers.map((item) => (
                  <li key={item} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">{item}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Next actions</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {order.executionActionItems.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-white px-2 py-1">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Confirmed quote lines</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{order.lines.length}</span>
        </div>
        {order.lines.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">No confirmed quote lines were copied into the order contract yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2">Pack</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Catalog</th>
                  <th className="px-2 py-2">Final</th>
                  <th className="px-2 py-2">Posture</th><th className="px-2 py-2">Execution context</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-slate-700">
                      <div className="font-medium text-slate-900">{line.productName}</div>
                      {line.skuCode ? <div className="text-[10px] text-slate-500">SKU {line.skuCode}</div> : null}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{line.variantName ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-600">{line.quantity}</td>
                    <td className="px-2 py-2 text-slate-600">{line.catalogPriceAmount != null ? `${line.catalogPriceCurrency ?? line.currency ?? 'USD'} ${line.catalogPriceAmount.toFixed(2)}` : '—'}</td>
                    <td className="px-2 py-2 text-slate-600">{line.unitPrice != null ? `${line.currency ?? 'USD'} ${line.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="px-2 py-2 text-slate-600">{line.isPriceOverridden ? (line.overrideReason?.trim() ? `Override · ${line.overrideReason}` : 'Override approved') : 'Catalog baseline'}</td>
                    <td className="px-2 py-2 text-slate-600">
                      <div>{line.countryOfOrigin ? `Origin ${line.countryOfOrigin}` : 'Origin pending'}</div>
                      {line.packaging ? <div className="text-[10px] text-slate-500">{line.packaging}</div> : null}
                      {line.exportMetadata ? <div className="text-[10px] text-slate-500">{line.exportMetadata}</div> : null}
                      {line.continuityNote ? <div className="text-[10px] text-slate-400">{line.continuityNote}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contract progression requirements</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{order.operationalControls.documentRequirementSummary.satisfiedCount}/{order.operationalControls.documentRequirementSummary.applicableCount || 0}</span>
          </div>
          {order.operationalControls.documentRequirementSummary.expected.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No contract-progression document rules were inferred for this order.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {order.operationalControls.documentRequirementSummary.expected.map((item) => (
                <div key={item.code} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-800">{item.title}</p>
                    <p className="text-[10px] text-slate-400">{item.code}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(item.status)}`}>
                    {titleCase(item.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dispatch artifact orchestration</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{order.operationalControls.dispatchArtifacts.length}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {order.operationalControls.dispatchArtifacts.map((artifact) => (
              <div key={artifact.key} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{artifact.title}</p>
                    <p className="text-[10px] text-slate-400">Needed by {artifact.stage === 'released' ? 'release' : artifact.stage === 'dispatched' ? 'dispatch' : 'completion'}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(artifact.status)}`}>
                    {titleCase(artifact.status)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{artifact.reason}</p>
                {artifact.matchedDocumentNames.length > 0 ? <p className="mt-1 text-[10px] text-slate-400">{artifact.matchedDocumentNames[0]}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Operational evidence summary</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{order.executionBlockers.length}</span>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">{order.operationalControls.documentRequirementSummary.blockerCount} document-rule blocker{order.operationalControls.documentRequirementSummary.blockerCount === 1 ? '' : 's'}</li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">{order.operationalControls.complianceSummary.openCount} open compliance item{order.operationalControls.complianceSummary.openCount === 1 ? '' : 's'}</li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">{order.operationalControls.releaseArtifactReasons.length + order.operationalControls.dispatchArtifactReasons.length + order.operationalControls.completionArtifactReasons.length} artifact evidence blocker{order.operationalControls.releaseArtifactReasons.length + order.operationalControls.dispatchArtifactReasons.length + order.operationalControls.completionArtifactReasons.length === 1 ? '' : 's'}</li>
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">Execution now keeps contract-grade commercial continuity visible while forcing compliance documents and dispatch evidence to clear in sequence.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          tradeWorkflow.freightReadiness,
          tradeWorkflow.complianceReadiness,
          tradeWorkflow.dispatchReadiness,
          tradeWorkflow.handoffVisibility,
        ].map((signal) => (
          <div key={signal.label} className={`rounded-xl border p-3 ${statusClasses(signal.tone === 'success' ? 'ready' : signal.tone === 'warning' ? 'pending_review' : signal.tone === 'danger' ? 'missing' : 'draft')}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{signal.label}</p>
            <p className="mt-2 text-sm font-semibold">{signal.value}</p>
            <p className="mt-1 text-xs opacity-90">{signal.detail}</p>
          </div>
        ))}
        <AIOrderDelayPanel prediction={orderDelayPrediction} />
      </div>

      {/* Three-panel grid: Documents · Compliance · Contract */}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {/* Documents */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Documents
            {order.documents.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {order.documents.length}
              </span>
            )}
          </p>
          {order.documents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No documents linked yet.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {order.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-800">{doc.file_name}</p>
                    <p className="text-[10px] text-slate-400">
                      {titleCase(doc.doc_type)} · v{doc.version}{doc.related_entity ? ` · ${titleCase(doc.related_entity)}` : ''}{doc.requirement_code ? ` · ${doc.requirement_code}` : ''}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(doc.status)}`}>
                    {titleCase(doc.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Compliance
            {order.complianceItems.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {order.complianceItems.length}
              </span>
            )}
          </p>
          {order.complianceItems.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No compliance items linked yet.</p>
          ) : (
            <>
              {order.operationalControls.complianceSummary.blockerReasons.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {order.operationalControls.complianceSummary.blockerReasons.map((reason) => (
                    <p key={reason} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">{reason}</p>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 space-y-1.5">
                {order.complianceItems.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-slate-600">
                      {item.compliance_item_id.slice(0, 16)}
                      {item.submitted_at && (
                        <span className="ml-1 text-slate-400">
                          · {formatDateTime(item.submitted_at)}
                        </span>
                      )}
                    </p>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(item.status)}`}>
                      {titleCase(item.status)}
                    </span>
                  </div>
                ))}
                {order.complianceItems.length > 5 && (
                  <p className="text-[10px] text-slate-400">
                    +{order.complianceItems.length - 5} more — view in Lead
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Contract */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contract</p>
          {!order.contract ? (
            <p className="mt-2 text-xs text-slate-400">No contract on record.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">Status</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(order.contract.status)}`}>
                  {titleCase(order.contract.status)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">Commercial lock</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(order.contract.commercial_lock_state ?? 'draft')}`}>
                  {getCommercialLockStateLabel(order.contract.commercial_lock_state)}
                </span>
              </div>
              {(() => {
                const snapshot = parseContractCommercialSnapshot(order.contract.commercial_snapshot);
                return (
                  <>
                    <p className="text-xs text-slate-500">Pricing basis {snapshot.pricingBasisLabel}</p>
                    <p className="text-xs text-slate-500">Approval posture {snapshot.approvalLabel}</p>
                  </>
                );
              })()}
              {order.contract.signed_at && (
                <p className="text-xs text-slate-500">
                  Signed {formatDateTime(order.contract.signed_at)}
                </p>
              )}
              {order.contract.starts_on && (
                <p className="text-xs text-slate-500">Starts {order.contract.starts_on}</p>
              )}
              {order.contract.ends_on && (
                <p className="text-xs text-slate-500">Ends {order.contract.ends_on}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
