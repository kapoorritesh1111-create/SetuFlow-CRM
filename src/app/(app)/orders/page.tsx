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
import { cn, formatDateTime } from '@/lib/utils';
import { workspaceHeroClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { inferOrderTradeWorkflow } from '@/features/trade-workflow/logic';
import { predictOrderDelay } from '@/features/ai/logic/intelligence';
import { AICompactActionBrief, AIInsightCard, AIOrderDelayPanel } from '@/features/ai/ui/intelligence-panels';
import { TradeSignalGrid } from '@/features/trade-workflow/ui';
import { extractLineContinuityNote, parseTradeAttributes } from '@/lib/trade-attributes';
import { getCommercialLockStateLabel, parseContractCommercialSnapshot } from '@/lib/contract-lock';
import { evaluateOrderExecution, getOrderExecutionStateLabel } from '@/lib/order-execution';
import { buildOrderOperationalControlState, type OrderOperationalControlState } from '@/lib/order-operations';
import type { DocumentRequirementRule } from '@/lib/document-requirements';
import { progressOrderExecution, uploadOrderDocumentInline } from '@/features/orders/server/actions';

// ─── Explicit row types (avoids Supabase generic inference issues) ────────────

type QuoteRow = {
  id: string;
  status: string;
  currency: string | null;
  updated_at: string;
  lead_id: string;
  current_version_id: string | null;
  accepted_version_id: string | null;
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
  accepted_quote_version_id: string | null;
  commercial_snapshot_mode: string | null;
  commercial_handoff_at: string | null;
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
  source_quote_version_line_item_id: string | null;
  continuity_source_mode: string | null;
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
  currentVersionId: string | null;
  acceptedVersionId: string | null;
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
    sourceQuoteVersionLineItemId: string | null;
    continuitySourceMode: string | null;
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

function formatMoneyValue(amount: number | null, currency: string | null): string {
  if (amount == null) return 'Value pending';
  return `${currency ?? 'USD'} ${Number(amount).toLocaleString()}`;
}

const EXECUTION_STAGES = [
  { key: 'draft', label: 'Order confirmed' },
  { key: 'ready', label: 'Docs ready' },
  { key: 'released', label: 'Dispatch ready' },
  { key: 'dispatched', label: 'Shipped' },
  { key: 'completed', label: 'Delivered' },
];

function OrderStageStepper({ state, blocked }: { state: string; blocked: boolean }) {
  const currentIndex = Math.max(0, EXECUTION_STAGES.findIndex((stage) => stage.key === state));
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {EXECUTION_STAGES.map((stage, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const tone = blocked && current ? 'border-rose-200 bg-rose-50 text-rose-700' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : current ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-500';
        return (
          <div key={stage.key} className={`rounded-xl border px-3 py-2 text-center text-[11px] font-semibold ${tone}`}>
            <div className="mx-auto mb-1 h-2 w-2 rounded-full bg-current" />
            {stage.label}
          </div>
        );
      })}
    </div>
  );
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

export default async function OrdersPage({ searchParams }: { searchParams?: { notice?: string | string[]; mode?: string | string[]; handoff?: string | string[]; quoteId?: string | string[]; leadId?: string | string[] } }) {
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
    .select('id, status, currency, updated_at, lead_id, current_version_id, accepted_version_id')
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
          actions={[]}
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
      .select('id, quote_id, status, accepted_quote_version_id, commercial_snapshot_mode, commercial_handoff_at, signed_at, starts_on, ends_on, commercial_lock_state, pricing_basis, quote_currency, approval_required, approval_state, commercial_snapshot, execution_state, execution_blockers, execution_snapshot, ready_at, released_at, dispatched_at, completed_at')
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
    ? await db.from('contract_line_items').select('id, contract_id, source_quote_version_line_item_id, continuity_source_mode, product_id, product_variant_id, quantity, unit_price, currency, notes, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason').in('contract_id', contractIds)
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
        sourceQuoteVersionLineItemId: line.source_quote_version_line_item_id,
        continuitySourceMode: line.continuity_source_mode,
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
      currentVersionId: q.current_version_id ?? null,
      acceptedVersionId: q.accepted_version_id ?? null,
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
  const handoffKey = Array.isArray(searchParams?.handoff) ? searchParams?.handoff[0] ?? null : searchParams?.handoff ?? null;
  const focusQuoteId = Array.isArray(searchParams?.quoteId) ? searchParams?.quoteId[0] ?? null : searchParams?.quoteId ?? null;
  const focusLeadId = Array.isArray(searchParams?.leadId) ? searchParams?.leadId[0] ?? null : searchParams?.leadId ?? null;
  const modeParam = Array.isArray(searchParams?.mode) ? searchParams?.mode[0] ?? 'all' : searchParams?.mode ?? 'all';
  const perspectiveMode = modeParam === 'buyers' || modeParam === 'suppliers' ? modeParam : 'all';
  const perspectiveAccepted = accepted.filter((order) => perspectiveMode === 'all' ? true : perspectiveMode === 'buyers' ? order.leadType === 'buyer' : order.leadType === 'supplier');
  const focusedOrder = focusQuoteId ? accepted.find((order) => order.quoteId === focusQuoteId) ?? null : focusLeadId ? accepted.find((order) => order.leadId === focusLeadId) ?? null : perspectiveAccepted[0] ?? null;
  const handoffMessage = handoffKey === 'quote-to-orders' ? { title: 'Quote handoff continues here', description: 'The commercial decision is finished. Stay in Orders to confirm documents, compliance, and release readiness on the accepted record.', tone: 'success' as const } : handoffKey === 'dashboard-execution' ? { title: 'Dashboard routed you into execution', description: 'This jump preserved your active mode so you can work the next accepted record instead of reopening the watchtower.', tone: 'success' as const } : handoffKey === 'approval-send-open-orders' ? { title: 'Sending hands off to execution here', description: 'Use Orders when the next question is fulfilment readiness, release evidence, or dispatch posture.', tone: 'success' as const } : handoffKey === 'dashboard-open-orders' ? { title: 'Order queue opened from Overview', description: 'The next working route is now in focus. Open the accepted record instead of scanning every card first.', tone: 'success' as const } : null;
  const perspectiveOrders = orders.filter((order) => perspectiveMode === 'all' ? true : perspectiveMode === 'buyers' ? order.leadType === 'buyer' : order.leadType === 'supplier');


  // ── NORTHSTAR RENDER ────────────────────────────────────────────────────────
  const dispatchedCount = perspectiveAccepted.filter(o => o.executionState === 'dispatched' || o.executionState === 'completed').length;
  const blockedCount = perspectiveAccepted.filter(o => o.executionBlockers.length > 0).length;
  const docsPendingCount = perspectiveAccepted.filter(o => o.operationalControls.documentRequirementSummary.blockerCount > 0).length;
  const inExecutionCount = perspectiveAccepted.filter(o => o.executionBlockers.length === 0 && !['completed'].includes(o.executionState)).length;
  const execValue = perspectiveAccepted.reduce((s, o) => s + (o.dealValue ?? 0), 0);
  const avgCycle = 34; // demo value

  const EXECUTION_STAGES_NS = [
    { key: 'draft', label: 'Quote\nAccepted' },
    { key: 'confirmed', label: 'Order\nConfirmed' },
    { key: 'ready', label: 'Docs\nRequired' },
    { key: 'released', label: 'Dispatch\nReady' },
    { key: 'dispatched', label: 'Shipped' },
    { key: 'completed', label: 'Delivered' },
  ];

  function getStageState(stageKey: string, orderState: string, blocked: boolean) {
    const stageOrder = ['draft','confirmed','ready','released','dispatched','completed'];
    const stageIdx = stageOrder.indexOf(stageKey);
    const orderIdx = stageOrder.indexOf(orderState);
    if (orderIdx === -1) return 'upcoming';
    if (stageIdx < orderIdx) return 'done';
    if (stageIdx === orderIdx) return blocked ? 'blocked' : 'current';
    return 'upcoming';
  }

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',fontSize:'13px',lineHeight:'1.5',color:'#1e293b',background:'#f0f4f8',minHeight:'100vh'}}>

      {/* TOPBAR */}
      <header style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 12px',borderRadius:'6px',background:'rgba(31,72,124,.06)',border:'1px solid rgba(31,72,124,.12)'}}>
            <div><div style={{fontSize:'11px',fontWeight:800,color:'#1F487C',letterSpacing:'-.1px'}}>SETU <span style={{color:'#279491'}}>Flow</span> CRM</div><div style={{fontSize:'8px',color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase'}}>SETU Groups LLC</div></div>
          </div>
          <div style={{width:'1px',height:'24px',background:'#e2e8f0'}}/>
          <div><div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#0c7fff'}}>Execution</div><div style={{fontSize:'16px',fontWeight:700,color:'#1e293b',letterSpacing:'-.3px'}}>Orders Desk</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{display:'flex',background:'#f1f5f9',borderRadius:'6px',padding:'3px',border:'1px solid #e2e8f0',gap:'2px'}}>
            {['all','buyers','suppliers'].map(m=>(
              <Link key={m} href={m==='all'?PRODUCT_ROUTES.app.orders:`${PRODUCT_ROUTES.app.orders}?mode=${m}`} style={{padding:'4px 11px',borderRadius:'5px',fontSize:'11px',fontWeight:600,textDecoration:'none',background:perspectiveMode===m?'#0b2e4a':'transparent',color:perspectiveMode===m?'white':'#64748b'}}>{m.charAt(0).toUpperCase()+m.slice(1)}</Link>
            ))}
          </div>
          <Link href="/quotes?export=csv" style={{padding:'7px 12px',borderRadius:'6px',border:'1px solid #e2e8f0',background:'white',fontSize:'12px',fontWeight:600,color:'#334155',textDecoration:'none'}}>Export</Link>
        </div>
      </header>

      {/* FILTER BAR */}
      <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'10px 24px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 10px',height:'32px',gap:'6px',cursor:'pointer',minWidth:'130px'}}>
          <div><div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#94a3b8',lineHeight:1}}>Execution state</div><div style={{fontSize:'11px',fontWeight:600,color:'#1e293b',lineHeight:'1.4'}}>All states</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 10px',height:'32px',gap:'6px',cursor:'pointer',minWidth:'110px'}}>
          <div><div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#94a3b8',lineHeight:1}}>Compliance</div><div style={{fontSize:'11px',fontWeight:600,color:'#1e293b',lineHeight:'1.4'}}>All</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 10px',height:'32px',gap:'6px',cursor:'pointer',minWidth:'110px'}}>
          <div><div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#94a3b8',lineHeight:1}}>Owner</div><div style={{fontSize:'11px',fontWeight:600,color:'#1e293b',lineHeight:'1.4'}}>All owners</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 10px',height:'32px',gap:'6px',cursor:'pointer',minWidth:'110px'}}>
          <div><div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#94a3b8',lineHeight:1}}>Market</div><div style={{fontSize:'11px',fontWeight:600,color:'#1e293b',lineHeight:'1.4'}}>All markets</div></div>
        </div>
        {blockedCount>0&&<span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'999px',fontSize:'10px',fontWeight:700,background:'#fff1f2',border:'1px solid #fecaca',color:'#9f1239',cursor:'pointer'}}>Dispatch blocked ({blockedCount})</span>}
        {docsPendingCount>0&&<span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'999px',fontSize:'10px',fontWeight:700,background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e',cursor:'pointer'}}>Docs pending ({docsPendingCount})</span>}
        <span style={{marginLeft:'auto',fontSize:'10px',fontWeight:600,color:'#94a3b8'}}>{perspectiveAccepted.length} active orders · {execValue>0?`$${Math.round(execValue/1000)}K`:''} execution value</span>
      </div>

      {/* STATS STRIP */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',padding:'16px 24px 0'}}>
        {[
          {label:'Dispatch blocked',value:blockedCount,meta:'Compliance doc missing',accent:'#dc2626'},
          {label:'Docs pending',value:docsPendingCount,meta:'Upload required',accent:'#d97706'},
          {label:'In execution',value:inExecutionCount,meta:'Docs complete, dispatching',accent:'#0c7fff'},
          {label:'Delivered',value:dispatchedCount,meta:'Awaiting payment confirmation',accent:'#059669'},
          {label:'Execution value',value:execValue>0?`$${Math.round(execValue/1000)}K`:'—',meta:'All active orders',accent:'#7c3aed'},
          {label:'Avg cycle time',value:`${avgCycle}d`,meta:'Accepted to delivered',accent:'#cbd5e1'},
        ].map(sc=>(
          <div key={sc.label} style={{position:'relative',overflow:'hidden',borderRadius:'16px',border:'1px solid #e2e8f0',background:'white',padding:'13px 15px',boxShadow:'0 1px 3px rgba(15,23,42,.06)',cursor:'pointer'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:sc.accent,borderRadius:'16px 16px 0 0'}}/>
            <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'7px'}}>{sc.label}</div>
            <div style={{fontSize:'22px',fontWeight:800,letterSpacing:'-.03em',color:'#0f172a',lineHeight:1}}>{sc.value}</div>
            <div style={{fontSize:'10px',color:'#94a3b8',marginTop:'4px',fontWeight:600}}>{sc.meta}</div>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{padding:'14px 24px 40px',display:'flex',flexDirection:'column',gap:'14px'}}>
        {notice&&<div style={{padding:'12px 16px',borderRadius:'12px',border:'1px solid #a7f3d0',background:'#ecfdf5',fontSize:'13px',color:'#065f46'}}><strong>{notice.title}</strong> — {notice.description}</div>}
        {handoffMessage&&<div style={{padding:'12px 16px',borderRadius:'12px',border:'1px solid #a7f3d0',background:'#ecfdf5',fontSize:'13px',color:'#065f46'}}><strong>{handoffMessage.title}</strong> — {handoffMessage.description}</div>}

        {perspectiveAccepted.length===0?(
          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',padding:'48px',textAlign:'center'}}>
            <p style={{fontSize:'16px',fontWeight:700,color:'#1e293b',marginBottom:'8px'}}>No active orders</p>
            <p style={{fontSize:'13px',color:'#64748b',marginBottom:'20px'}}>Orders appear here when quotes are accepted.</p>
            <Link href={PRODUCT_ROUTES.app.leads} style={{display:'inline-block',padding:'9px 18px',background:'#0b2e4a',color:'white',borderRadius:'8px',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>Go to Leads</Link>
          </div>
        ):perspectiveAccepted.map(order=>{
          const gate = dispatchGate(order.operationalControls);
          const isBlocked = gate.tone==='danger'||gate.tone==='warning';
          const borderLeft = order.executionBlockers.length>0?'4px solid #dc2626':order.operationalControls.documentRequirementSummary.blockerCount>0?'4px solid #d97706':'4px solid #059669';
          const executionStateForStage = order.executionState||'draft';
          
          // Map execution state to stage key
          const stageOrder = ['draft','ready','released','dispatched','completed'];
          const currentStageIdx = stageOrder.indexOf(executionStateForStage);

          // Compliance items
          const allDocs = order.documents;
          const compItems = order.complianceItems;
          const docBlockers = order.operationalControls.documentRequirementSummary.expected.filter((item: any)=>!['approved','complete','ready'].includes(item.status));
          const docOk = order.operationalControls.documentRequirementSummary.expected.filter((item: any)=>['approved','complete','ready'].includes(item.status));

          return (
            <div key={order.quoteId} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',overflow:'hidden',boxShadow:'0 1px 3px rgba(15,23,42,.06)',cursor:'pointer',transition:'box-shadow .12s',borderLeft}}>
              {/* Header */}
              <div style={{padding:'16px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',borderBottom:'1px solid #e2e8f0'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'9px',background:order.executionBlockers.length>0?'linear-gradient(135deg,#5b21b6,#7c3aed)':'linear-gradient(135deg,#0c7fff,#2da0ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:800,color:'white',flexShrink:0}}>{order.companyName.split(' ').map((w: string)=>w[0]).slice(0,2).join('')}</div>
                    <div style={{fontSize:'17px',fontWeight:800,color:'#0f172a'}}>{order.companyName}</div>
                    <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontWeight:700,border:'1px solid',background:order.executionBlockers.length>0?'#fff1f2':order.operationalControls.documentRequirementSummary.blockerCount>0?'#fffbeb':'#ecfdf5',borderColor:order.executionBlockers.length>0?'#fecaca':order.operationalControls.documentRequirementSummary.blockerCount>0?'#fde68a':'#a7f3d0',color:order.executionBlockers.length>0?'#9f1239':order.operationalControls.documentRequirementSummary.blockerCount>0?'#92400e':'#059669'}}>
                      {order.executionBlockers.length>0?'Dispatch blocked':order.operationalControls.documentRequirementSummary.blockerCount>0?'Docs pending':'In transit'}
                    </span>
                  </div>
                  <div style={{fontSize:'11px',color:'#64748b'}}>{order.country} · {order.leadType} · {order.lines[0]?.productName??'No product'}{order.lines.length>1?` + ${order.lines.length-1} more`:''} · FOB</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px',flexShrink:0}}>
                  <div style={{fontSize:'20px',fontWeight:800,color:'#0b2e4a',letterSpacing:'-.4px'}}>{formatMoneyValue(order.dealValue,order.dealCurrency??order.currency)}</div>
                  <div style={{fontSize:'9px',color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase'}}>{(order.currency??'USD')} · FOB</div>
                  <div style={{display:'flex',gap:'6px',marginTop:'4px'}}>
                    <Link href={`${PRODUCT_ROUTES.app.quotes}?quoteId=${order.quoteId}`} style={{padding:'6px 14px',borderRadius:'6px',border:'1px solid #e2e8f0',background:'white',fontSize:'12px',fontWeight:700,color:'#334155',textDecoration:'none'}}>View quote</Link>
                    <Link href={`#order-${order.quoteId}`} style={{padding:'6px 14px',borderRadius:'6px',background:'#0b2e4a',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>Open order</Link>
                  </div>
                </div>
              </div>

              {/* State machine strip */}
              <div style={{display:'flex',alignItems:'center',gap:0,padding:'10px 20px',borderBottom:'1px solid #e2e8f0',overflowX:'auto'}}>
                {EXECUTION_STAGES_NS.map((stage,idx)=>{
                  const stageOrd = ['draft','confirmed','ready','released','dispatched','completed'];
                  const stageI = stageOrd.indexOf(stage.key);
                  const orderI = stageOrd.indexOf(executionStateForStage);
                  const isDone = stageI < orderI;
                  const isCurrent = stageI === orderI;
                  const isBlk = isCurrent && order.executionBlockers.length>0;
                  const isUpcoming = stageI > orderI;
                  const dotColor = isDone?'#059669':isCurrent?(isBlk?'#dc2626':'#0c7fff'):'#cbd5e1';
                  const labelColor = isDone?'#059669':isCurrent?(isBlk?'#dc2626':'#0c7fff'):isUpcoming?'#94a3b8':'#64748b';
                  const bg = isDone?'#ecfdf5':isCurrent?(isBlk?'#fff1f2':'rgba(12,127,255,.08)'):'transparent';
                  const border = isCurrent?(isBlk?'1px solid #fecaca':isBlk?'':'1px solid rgba(12,127,255,.2)'):'none';
                  return (
                    <div key={stage.key} style={{display:'flex',alignItems:'center',gap:0,flexShrink:0}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',padding:'4px 10px',borderRadius:'6px',cursor:'pointer',minWidth:'90px',background:bg,border}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:dotColor,boxShadow:isCurrent&&!isBlk?'0 0 0 3px rgba(12,127,255,.2)':undefined}}/>
                        <div style={{fontSize:'9px',fontWeight:700,textAlign:'center',letterSpacing:'.04em',lineHeight:'1.3',color:labelColor,whiteSpace:'pre-line'}}>{stage.label}</div>
                      </div>
                      {idx<EXECUTION_STAGES_NS.length-1&&<span style={{color:'#cbd5e1',fontSize:'14px',flexShrink:0,paddingBottom:'8px',margin:'0 2px'}}>›</span>}
                    </div>
                  );
                })}
              </div>

              {/* Signal grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderTop:'1px solid #e2e8f0'}}>
                {[
                  {
                    label:'Execution state',
                    badge:order.executionBlockers.length>0?'Dispatch blocked':order.operationalControls.documentRequirementSummary.blockerCount>0?'Docs pending':'In execution',
                    badgeTone:order.executionBlockers.length>0?'block':order.operationalControls.documentRequirementSummary.blockerCount>0?'warn':'ok',
                    sub:order.executionBlockers[0]??order.executionState,
                  },
                  {
                    label:'Commercial lock',
                    badge:order.contract?.commercial_lock_state==='locked'?'Locked':'Pending',
                    badgeTone:order.contract?.commercial_lock_state==='locked'?'ok':'warn',
                    sub:order.contract?`v1 accepted · ${formatMoneyValue(order.dealValue,order.currency)}`:'Contract pending',
                  },
                  {
                    label:'Documents',
                    badge:`${order.operationalControls.documentRequirementSummary.satisfiedCount}/${order.operationalControls.documentRequirementSummary.applicableCount||docOk.length+docBlockers.length} docs`,
                    badgeTone:docBlockers.length>0?'block':'ok',
                    sub:docBlockers[0]?.title??'All docs present',
                  },
                  {
                    label:'Payment status',
                    badge:'30% received',
                    badgeTone:'ok',
                    sub:`${formatMoneyValue((order.dealValue??0)*0.3,order.currency)} of ${formatMoneyValue(order.dealValue,order.currency)}`,
                  },
                ].map((sig,i)=>{
                  const bc = sig.badgeTone==='block'?{bg:'#fff1f2',border:'#fecaca',color:'#9f1239'}:sig.badgeTone==='warn'?{bg:'#fffbeb',border:'#fde68a',color:'#92400e'}:{bg:'#ecfdf5',border:'#a7f3d0',color:'#059669'};
                  return (
                    <div key={sig.label} style={{padding:'12px 16px',borderRight:i<3?'1px solid #e2e8f0':undefined}}>
                      <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'5px'}}>{sig.label}</div>
                      <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontWeight:700,border:'1px solid',background:bc.bg,borderColor:bc.border,color:bc.color}}>{sig.badge}</span>
                      <div style={{fontSize:'10px',color:'#94a3b8',marginTop:'2px'}}>{sig.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Compliance checklist */}
              <div style={{padding:'12px 20px',borderTop:'1px solid #e2e8f0',display:'flex',flexDirection:'column',gap:'6px'}}>
                {/* OK items */}
                {docOk.slice(0,3).map((item: any)=>(
                  <div key={item.code} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'8px',border:'1px solid #a7f3d0',background:'#ecfdf5'}}>
                    <span style={{fontSize:'14px',flexShrink:0}}>✓</span>
                    <span style={{flex:1,fontSize:'12px',fontWeight:600,color:'#059669'}}>{item.title}</span>
                    <span style={{fontSize:'10px',color:'#059669'}}>Uploaded</span>
                  </div>
                ))}
                {/* Blocked items */}
                {docBlockers.slice(0,3).map((item: any)=>(
                  <div key={item.code} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'8px',border:'1px solid #fecaca',background:'#fff1f2'}}>
                    <span style={{fontSize:'14px',flexShrink:0}}>✗</span>
                    <span style={{flex:1,fontSize:'12px',fontWeight:600,color:'#9f1239'}}>{item.title} — required for import clearance</span>
                    <form action={uploadOrderDocumentInline} style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',justifyContent:'flex-end'}}>
                      <input type="hidden" name="contract_id" value={order.contract?.id ?? ''} />
                      <input type="hidden" name="requirement_code" value={item.code} />
                      <input type="hidden" name="doc_type" value={item.doc_type ?? item.code ?? 'compliance_doc'} />
                      <input type="file" name="file" required style={{maxWidth:'160px',fontSize:'10px',color:'#9f1239'}} />
                      <button type="submit" style={{fontSize:'10px',fontWeight:700,padding:'3px 9px',borderRadius:'5px',border:'1px solid #fecaca',background:'white',color:'#dc2626',whiteSpace:'nowrap'}}>Upload {item.title}</button>
                    </form>
                  </div>
                ))}
                {/* Execution blockers */}
                {order.executionBlockers.slice(0,2).map((blocker: string)=>(
                  <div key={blocker} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'8px',border:'1px solid #fde68a',background:'#fffbeb'}}>
                    <span style={{fontSize:'14px',flexShrink:0}}>⏳</span>
                    <span style={{flex:1,fontSize:'12px',fontWeight:600,color:'#92400e'}}>{blocker}</span>
                    <button style={{fontSize:'10px',fontWeight:700,padding:'3px 9px',borderRadius:'5px',border:'1px solid #fde68a',background:'white',color:'#d97706',cursor:'pointer',whiteSpace:'nowrap'}}>Resolve</button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div id={`order-${order.quoteId}`} style={{padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f8fafc',borderTop:'1px solid #e2e8f0'}}>
                <div style={{fontSize:'11px',color:'#64748b'}}>
                  Updated {new Date(order.updatedAt).toLocaleDateString()} ·&nbsp;
                  {order.executionBlockers.length>0?<strong style={{color:'#dc2626'}}>Blocked: {order.executionBlockers[0]?.slice(0,60)}</strong>:'On track'}
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  {order.executionBlockers.length>0&&<button style={{padding:'6px 14px',borderRadius:'6px',fontSize:'12px',fontWeight:700,border:'1px solid #fecaca',background:'#fff1f2',color:'#dc2626',cursor:'pointer'}}>Mark on hold</button>}
                  <form action={progressOrderExecution} title={order.operationalControls.documentRequirementSummary.blockerCount > 0 ? `${order.operationalControls.documentRequirementSummary.blockerCount} documents required before dispatch` : undefined}>
                    <input type="hidden" name="contract_id" value={order.contract?.id ?? ''} />
                    <input type="hidden" name="quote_id" value={order.quoteId} />
                    <input type="hidden" name="next_state" value={order.nextExecutionState ?? "completed"} />
                    <button type="submit" disabled={order.operationalControls.documentRequirementSummary.blockerCount > 0} style={{padding:'6px 14px',borderRadius:'6px',fontSize:'12px',fontWeight:700,background:order.operationalControls.documentRequirementSummary.blockerCount>0?'#cbd5e1':'#0b2e4a',color:'white',border:'none',cursor:order.operationalControls.documentRequirementSummary.blockerCount>0?'not-allowed':'pointer',opacity:order.operationalControls.documentRequirementSummary.blockerCount>0 ? .75 : 1}}>
                      {order.executionBlockers.length>0?'Upload required doc':'Mark delivered'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}

        {perspectiveAccepted.length>0&&<div style={{textAlign:'center',padding:'14px',color:'#94a3b8',fontSize:'12px',fontWeight:600}}>+ {Math.max(0,orders.length-perspectiveAccepted.length)} more orders (delivered, closed) · <span style={{color:'#0c7fff',cursor:'pointer'}}>Load all</span></div>}
      </div>
    </div>
  );
}
