import { buildOrderOperationalControlState } from '@/lib/order-operations';
import { evaluateOrderExecution } from '@/lib/order-execution';
import { parseTradeAttributes } from '@/lib/trade-attributes';
import type { DocumentRequirementRule } from '@/lib/document-requirements';

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

export type GovernedSyncPayloadResult = {
  continuityKey: string;
  targetKey: string;
  provider: string;
  targetType: 'contract';
  targetId: string;
  summary: string;
  blockedReasons: string[];
  payload: Record<string, unknown>;
};

export async function buildGovernedContractSyncPayload(params: {
  db: any;
  organizationId: string;
  contractId: string;
  provider: string;
}) : Promise<GovernedSyncPayloadResult | null> {
  const { db, organizationId, contractId, provider } = params;
  const { data: contract } = await db
    .from('contracts')
    .select('id, organization_id, lead_id, quote_id, status, signed_at, commercial_lock_state, execution_state, released_at, dispatched_at, completed_at, commercial_snapshot')
    .eq('organization_id', organizationId)
    .eq('id', contractId)
    .maybeSingle();

  if (!contract?.id) return null;

  const leadId = contract.lead_id as string;
  const quoteId = contract.quote_id as string;
  const [quoteRes, leadRes, docsRes, complianceRes, lineRes, marketRes, productRes, ruleRes] = await Promise.all([
    db.from('quotes').select('id, status').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle(),
    db.from('leads').select('id, company_name, lead_type').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(),
    db.from('documents').select('id, file_name, doc_type, status, uploaded_at, related_id, related_entity, requirement_code, expires_at').eq('organization_id', organizationId).in('related_entity', ['quote', 'lead', 'contract']).in('related_id', [quoteId, leadId, contractId]),
    db.from('lead_compliance_items').select('id, lead_id, status, compliance_item_id, submitted_at, approved_at').eq('organization_id', organizationId).eq('lead_id', leadId),
    db.from('contract_line_items').select('id, contract_id, product_id, product_variant_id, quantity, unit_price, currency').eq('contract_id', contractId),
    db.from('lead_markets').select('lead_id, market_id').eq('lead_id', leadId),
    db.from('lead_product_interests').select('lead_id, product_id').eq('lead_id', leadId),
    db.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', organizationId).eq('is_active', true),
  ]);

  const lines = asArray(lineRes.data);
  const variantIds = lines.map((line: any) => line.product_variant_id).filter(Boolean);
  const productIds = Array.from(new Set(lines.map((line: any) => line.product_id).filter(Boolean)));
  const [variantRes, catalogRes] = await Promise.all([
    variantIds.length ? db.from('product_variants').select('id, source_payload').in('id', variantIds) : Promise.resolve({ data: [], error: null }),
    productIds.length ? db.from('products').select('id, name').in('id', productIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const variantById = new Map(asArray(variantRes.data).map((item: any) => [item.id, item]));
  const productById = new Map(asArray(catalogRes.data).map((item: any) => [item.id, item]));

  const lineSignals = lines.map((line: any) => {
    const variant = line.product_variant_id ? variantById.get(line.product_variant_id) ?? null : null;
    const product = line.product_id ? productById.get(line.product_id) ?? null : null;
    const trade = parseTradeAttributes(variant?.source_payload ?? null);
    return {
      countryOfOrigin: trade.countryOfOrigin,
      exportMetadata: trade.exportMetadata,
      shipmentNotes: trade.shipmentNotes,
      productName: product?.name ?? null,
      quantity: line.quantity,
      unitPrice: line.unit_price,
      currency: line.currency,
    };
  });

  const controls = buildOrderOperationalControlState({
    documents: asArray(docsRes.data),
    complianceItems: asArray(complianceRes.data),
    requirementRules: asArray(ruleRes.data) as DocumentRequirementRule[],
    leadType: leadRes.data?.lead_type ?? null,
    marketIds: asArray(marketRes.data).map((item: any) => item.market_id).filter(Boolean),
    productIds: Array.from(new Set([...asArray(productRes.data).map((item: any) => item.product_id).filter(Boolean), ...productIds])),
    lines: lineSignals.map((line) => ({
      countryOfOrigin: line.countryOfOrigin,
      exportMetadata: line.exportMetadata,
      shipmentNotes: line.shipmentNotes,
    })),
  });

  const execution = evaluateOrderExecution({
    quoteAccepted: normalize(quoteRes.data?.status) === 'accepted',
    hasContract: true,
    contractStatus: contract.status,
    contractSignedAt: contract.signed_at,
    commercialLockState: contract.commercial_lock_state,
    lineCount: lineSignals.length,
    openDocumentBlockers: 0,
    openComplianceBlockers: 0,
    documentRequirementReasons: controls.documentRequirementSummary.blockerReasons,
    complianceRequirementReasons: controls.complianceSummary.blockerReasons,
    releaseArtifactReasons: controls.releaseArtifactReasons,
    dispatchArtifactReasons: controls.dispatchArtifactReasons,
    completionArtifactReasons: controls.completionArtifactReasons,
    currentState: contract.execution_state,
    releasedAt: contract.released_at,
    dispatchedAt: contract.dispatched_at,
    completedAt: contract.completed_at,
  });

  const companyName = leadRes.data?.company_name ?? 'Contract';
  const continuityKey = `contract:${contract.id}:${provider}`;
  const targetKey = continuityKey;
  const erpBlocked = [
    normalize(contract.commercial_lock_state) !== 'locked' ? 'Commercial lock snapshot is not yet locked.' : null,
    !contract.signed_at ? 'Contract is not yet signed.' : null,
    ...controls.documentRequirementSummary.blockerReasons,
  ].filter(Boolean) as string[];
  const freightBlocked = [
    !['released', 'dispatched', 'completed'].includes(execution.currentState) ? 'Order is not yet in a released-or-later execution posture.' : null,
    ...execution.releaseBlockers,
    ...(execution.currentState === 'released' ? execution.dispatchBlockers : []),
    ...(execution.currentState === 'dispatched' ? execution.completionBlockers.slice(0, 1) : []),
  ].filter(Boolean) as string[];
  const blockedReasons = provider === 'erp_mock' ? erpBlocked : provider === 'freight_mock' ? freightBlocked : [];
  const summary = provider === 'erp_mock'
    ? `${companyName} commercial continuity is ${blockedReasons.length ? 'not yet safe' : 'ready'} for governed ERP sync.`
    : `${companyName} execution continuity is ${blockedReasons.length ? 'not yet safe' : 'ready'} for governed freight sync.`;

  return {
    continuityKey,
    targetKey,
    provider,
    targetType: 'contract',
    targetId: contract.id,
    summary,
    blockedReasons,
    payload: provider === 'erp_mock'
      ? {
          contract_id: contract.id,
          quote_id: quoteId,
          lead_id: leadId,
          company_name: companyName,
          commercial_lock_state: contract.commercial_lock_state,
          execution_state: execution.currentState,
          commercial_snapshot: contract.commercial_snapshot,
          document_blockers: controls.documentRequirementSummary.blockerReasons,
          compliance_blockers: controls.complianceSummary.blockerReasons,
          line_items: lineSignals.map((line) => ({
            product_name: line.productName,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            currency: line.currency,
          })),
          recommended_action: blockedReasons.length ? blockedReasons[0] : 'Push governed commercial continuity to ERP.',
        }
      : {
          contract_id: contract.id,
          quote_id: quoteId,
          lead_id: leadId,
          company_name: companyName,
          execution_state: execution.currentState,
          release_blockers: execution.releaseBlockers,
          dispatch_blockers: execution.dispatchBlockers,
          completion_blockers: execution.completionBlockers,
          dispatch_artifacts: controls.dispatchArtifacts,
          line_items: lineSignals.map((line) => ({
            product_name: line.productName,
            country_of_origin: line.countryOfOrigin,
            export_metadata: line.exportMetadata,
            shipment_notes: line.shipmentNotes,
          })),
          recommended_action: blockedReasons.length ? blockedReasons[0] : 'Push governed execution continuity to freight.',
        },
  };
}

export async function buildInboundGovernanceImpact(params: {
  db: any;
  organizationId: string;
  provider: string;
  contractId?: string | null;
  quoteId?: string | null;
}) {
  const contractId = params.contractId ?? null;
  if (contractId) {
    const payload = await buildGovernedContractSyncPayload({
      db: params.db,
      organizationId: params.organizationId,
      contractId,
      provider: params.provider,
    });
    if (!payload) return { safeToApply: false, summary: 'No governed target matched this inbound event.', blockedReasons: ['Contract target could not be resolved.'] };
    return {
      safeToApply: payload.blockedReasons.length === 0,
      summary: payload.summary,
      blockedReasons: payload.blockedReasons,
      targetKey: payload.targetKey,
    };
  }

  if (params.quoteId) {
    const { data: contract } = await params.db
      .from('contracts')
      .select('id')
      .eq('organization_id', params.organizationId)
      .eq('quote_id', params.quoteId)
      .maybeSingle();
    if (contract?.id) {
      return buildInboundGovernanceImpact({
        db: params.db,
        organizationId: params.organizationId,
        provider: params.provider,
        contractId: contract.id,
      });
    }
  }

  return { safeToApply: false, summary: 'No governed target matched this inbound event.', blockedReasons: ['Contract or quote target is required for safe inbound workflow alignment.'] };
}
