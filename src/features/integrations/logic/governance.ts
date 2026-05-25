import { evaluateOrderExecution } from '@/lib/order-execution';
import { buildOrderOperationalControlState } from '@/lib/order-operations';
import type { IntegrationsWorkspaceData } from '@/lib/queries/integrations';
import { parseTradeAttributes } from '@/lib/trade-attributes';
import type { GovernedSyncCandidate, IntegrationEventRecord, IntegrationGovernanceAlert } from '@/features/integrations/types/connectors';

type GovernedContractSyncState = {
  contractId: string;
  quoteId: string;
  leadId: string;
  companyName: string;
  executionState: string;
  commercialLockState: string | null;
  erpReady: boolean;
  freightReady: boolean;
  erpReasons: string[];
  freightReasons: string[];
  releaseBlockers: string[];
  dispatchBlockers: string[];
  completionBlockers: string[];
  lineNames: string[];
};

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function entityKey(entity: string, id: string) {
  return `${entity}:${id}`;
}

function readPayloadRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readNestedRecord(value: unknown, key: string) {
  const record = readPayloadRecord(value);
  const nested = record[key];
  return nested && typeof nested === 'object' && !Array.isArray(nested) ? (nested as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function buildGovernedContractSyncStates(data: IntegrationsWorkspaceData): GovernedContractSyncState[] {
  const leadById = new Map(data.leads.map((lead) => [lead.id, lead]));
  const quoteById = new Map(data.quotes.map((quote) => [quote.id, quote]));
  const documentsByKey = new Map<string, IntegrationsWorkspaceData['documents']>();
  const complianceByLead = new Map<string, IntegrationsWorkspaceData['complianceItems']>();
  const contractLinesByContract = new Map<string, IntegrationsWorkspaceData['contractLineItems']>();
  const marketIdsByLeadId = new Map<string, string[]>();
  const productIdsByLeadId = new Map<string, string[]>();
  const variantById = new Map(data.productVariants.map((variant) => [variant.id, variant]));
  const productById = new Map(data.products.map((product) => [product.id, product]));

  data.documents.forEach((document) => {
    if (!document.related_entity || !document.related_id) return;
    const key = entityKey(document.related_entity, document.related_id);
    const bucket = documentsByKey.get(key) ?? [];
    bucket.push(document);
    documentsByKey.set(key, bucket);
  });
  data.complianceItems.forEach((item) => {
    const bucket = complianceByLead.get(item.lead_id) ?? [];
    bucket.push(item);
    complianceByLead.set(item.lead_id, bucket);
  });
  data.contractLineItems.forEach((line) => {
    const bucket = contractLinesByContract.get(line.contract_id) ?? [];
    bucket.push(line);
    contractLinesByContract.set(line.contract_id, bucket);
  });
  data.leadMarkets.forEach((item) => {
    const bucket = marketIdsByLeadId.get(item.lead_id) ?? [];
    if (item.market_id) bucket.push(item.market_id);
    marketIdsByLeadId.set(item.lead_id, bucket);
  });
  data.leadProductInterests.forEach((item) => {
    const bucket = productIdsByLeadId.get(item.lead_id) ?? [];
    if (item.product_id) bucket.push(item.product_id);
    productIdsByLeadId.set(item.lead_id, bucket);
  });

  return data.contracts.flatMap((contract) => {
    const quote = quoteById.get(contract.quote_id);
    const lead = leadById.get(contract.lead_id);
    if (!quote || !lead) return [];
    if (normalize(quote.status) !== 'accepted') return [];

    const quoteDocuments = documentsByKey.get(entityKey('quote', quote.id)) ?? [];
    const leadDocuments = documentsByKey.get(entityKey('lead', lead.id)) ?? [];
    const contractDocuments = documentsByKey.get(entityKey('contract', contract.id)) ?? [];
    const lineItems = (contractLinesByContract.get(contract.id) ?? []).map((line) => {
      const variant = line.product_variant_id ? variantById.get(line.product_variant_id) ?? null : null;
      const trade = parseTradeAttributes(variant?.source_payload ?? null);
      const product = line.product_id ? productById.get(line.product_id) ?? null : null;
      return {
        countryOfOrigin: trade.countryOfOrigin,
        exportMetadata: trade.exportMetadata,
        shipmentNotes: trade.shipmentNotes,
        productName: product?.name ?? null,
      };
    });

    const controls = buildOrderOperationalControlState({
      documents: [...quoteDocuments, ...leadDocuments, ...contractDocuments].map((document) => ({
        id: document.id,
        file_name: document.file_name,
        doc_type: document.doc_type,
        status: document.status,
        uploaded_at: document.uploaded_at,
        related_entity: document.related_entity,
        related_id: document.related_id,
        requirement_code: document.requirement_code,
        expires_at: document.expires_at,
      })),
      complianceItems: (complianceByLead.get(lead.id) ?? []).map((item) => ({
        id: item.id,
        status: item.status,
        compliance_item_id: item.compliance_item_id,
        submitted_at: item.submitted_at,
        approved_at: item.approved_at,
      })),
      requirementRules: data.documentRequirementRules,
      leadType: lead.lead_type,
      marketIds: marketIdsByLeadId.get(lead.id) ?? [],
      productIds: productIdsByLeadId.get(lead.id) ?? [],
      lines: lineItems.map((line) => ({
        countryOfOrigin: line.countryOfOrigin,
        exportMetadata: line.exportMetadata,
        shipmentNotes: line.shipmentNotes,
      })),
    });

    const execution = evaluateOrderExecution({
      quoteAccepted: true,
      hasContract: true,
      contractStatus: contract.status,
      contractSignedAt: contract.signed_at,
      commercialLockState: contract.commercial_lock_state,
      lineCount: lineItems.length,
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

    const erpReasons: string[] = [];
    if (!['accepted_locked', 'contract_locked', 'locked'].includes(normalize(contract.commercial_lock_state))) erpReasons.push('Commercial lock snapshot is not yet locked.');
    if (!contract.signed_at) erpReasons.push('Contract is not yet signed.');
    if (controls.documentRequirementSummary.blockerReasons.length) erpReasons.push('Contract-progression document requirements still have blockers.');

    const freightReasons: string[] = [];
    if (!['released', 'dispatched', 'completed'].includes(execution.currentState)) freightReasons.push('Order is not yet in a released-or-later execution posture.');
    freightReasons.push(...execution.releaseBlockers);
    if (execution.currentState === 'released') freightReasons.push(...execution.dispatchBlockers);
    if (execution.currentState === 'dispatched') freightReasons.push(...execution.completionBlockers.slice(0, 1));

    return [{
      contractId: contract.id,
      quoteId: quote.id,
      leadId: lead.id,
      companyName: lead.company_name,
      executionState: execution.currentState,
      commercialLockState: contract.commercial_lock_state,
      erpReady: erpReasons.length === 0,
      freightReady: freightReasons.length === 0,
      erpReasons,
      freightReasons,
      releaseBlockers: execution.releaseBlockers,
      dispatchBlockers: execution.dispatchBlockers,
      completionBlockers: execution.completionBlockers,
      lineNames: lineItems.map((line) => line.productName).filter((value): value is string => Boolean(value)),
    } satisfies GovernedContractSyncState];
  });
}

function lastEventForCandidate(candidate: GovernedContractSyncState, provider: string, events: IntegrationsWorkspaceData['integrationEvents']) {
  const key = `contract:${candidate.contractId}:${provider}`;
  return events.find((event) => {
    const continuity = readNestedRecord(event.payload, 'continuity');
    const metadata = readNestedRecord(event.payload, 'metadata');
    return readString(continuity.key) === key || readString(metadata.target_key) === key;
  }) ?? null;
}

export function buildGovernedSyncCandidates(data: IntegrationsWorkspaceData): GovernedSyncCandidate[] {
  const integrationsByProvider = new Map(data.integrations.map((integration) => [integration.provider, integration]));
  const states = buildGovernedContractSyncStates(data);
  const candidates: GovernedSyncCandidate[] = [];

  states.forEach((state) => {
    const erpIntegration = integrationsByProvider.get('erp_mock');
    if (erpIntegration) {
      const lastEvent = lastEventForCandidate(state, 'erp_mock', data.integrationEvents);
      const lastStatus = normalize(lastEvent?.status);
      if (state.erpReady && lastStatus !== 'processed' && lastStatus !== 'validated') {
        candidates.push({
          integrationId: erpIntegration.id,
          provider: erpIntegration.provider,
          targetType: 'contract',
          targetId: state.contractId,
          quoteId: state.quoteId,
          leadId: state.leadId,
          title: `${state.companyName} · ERP commercial continuity sync`,
          reason: 'Commercial lock and contract progression posture are clear enough to push governed commercial continuity outward.',
          stageLabel: state.executionState,
          readiness: 'ready',
          payloadHint: `${state.lineNames.slice(0, 2).join(', ') || 'Commercial lines'} · lock ${state.commercialLockState ?? 'pending'}`,
        });
      } else if (!state.erpReady) {
        candidates.push({
          integrationId: erpIntegration.id,
          provider: erpIntegration.provider,
          targetType: 'contract',
          targetId: state.contractId,
          quoteId: state.quoteId,
          leadId: state.leadId,
          title: `${state.companyName} · ERP sync blocked`,
          reason: state.erpReasons[0] ?? 'Commercial continuity is not yet safe to sync.',
          stageLabel: state.executionState,
          readiness: 'blocked',
          payloadHint: 'Governed ERP payload withheld until commercial controls clear.',
        });
      }
    }

    const freightIntegration = integrationsByProvider.get('freight_mock');
    if (freightIntegration) {
      const lastEvent = lastEventForCandidate(state, 'freight_mock', data.integrationEvents);
      const lastStatus = normalize(lastEvent?.status);
      if (state.freightReady && lastStatus !== 'processed' && lastStatus !== 'validated') {
        candidates.push({
          integrationId: freightIntegration.id,
          provider: freightIntegration.provider,
          targetType: 'contract',
          targetId: state.contractId,
          quoteId: state.quoteId,
          leadId: state.leadId,
          title: `${state.companyName} · Freight execution sync`,
          reason: 'Release/dispatch evidence is clear enough to push governed execution continuity outward.',
          stageLabel: state.executionState,
          readiness: 'ready',
          payloadHint: `${state.lineNames.slice(0, 2).join(', ') || 'Shipment lines'} · state ${state.executionState}`,
        });
      } else if (!state.freightReady) {
        candidates.push({
          integrationId: freightIntegration.id,
          provider: freightIntegration.provider,
          targetType: 'contract',
          targetId: state.contractId,
          quoteId: state.quoteId,
          leadId: state.leadId,
          title: `${state.companyName} · Freight sync blocked`,
          reason: state.freightReasons[0] ?? 'Execution evidence is not yet safe to sync.',
          stageLabel: state.executionState,
          readiness: 'blocked',
          payloadHint: 'Governed freight payload withheld until execution evidence clears.',
        });
      }
    }
  });

  return candidates;
}

export function buildIntegrationGovernanceAlerts(candidates: GovernedSyncCandidate[]): IntegrationGovernanceAlert[] {
  return candidates
    .filter((candidate) => candidate.readiness === 'blocked')
    .slice(0, 6)
    .map((candidate) => ({
      id: `${candidate.provider}:${candidate.targetId}`,
      provider: candidate.provider,
      title: candidate.title,
      reason: candidate.reason,
      severity: candidate.provider === 'freight_mock' ? 'high' : 'medium',
      ctaHref: '/orders',
      ctaLabel: candidate.provider === 'freight_mock' ? 'Open orders' : 'Open contracts',
    }));
}

export function readIntegrationEventAttemptCount(event: IntegrationEventRecord) {
  const metadata = readNestedRecord(event.payload, 'metadata');
  const attempts = metadata.attempt_count;
  if (typeof attempts === 'number' && Number.isFinite(attempts)) return attempts;
  if (typeof attempts === 'string' && attempts.trim() && Number.isFinite(Number(attempts))) return Number(attempts);
  return 1;
}

export function readIntegrationEventContinuityKey(event: IntegrationEventRecord) {
  const continuity = readNestedRecord(event.payload, 'continuity');
  const metadata = readNestedRecord(event.payload, 'metadata');
  return readString(continuity.key) ?? readString(metadata.target_key) ?? null;
}

export function readIntegrationImpactSummary(event: IntegrationEventRecord) {
  const impact = readNestedRecord(event.payload, 'impact');
  const mapped = readNestedRecord(event.payload, 'mapped_payload');
  return readString(impact.summary) ?? readString(mapped.recommended_action) ?? 'Governed sync event recorded.';
}

export function readIntegrationValidationLabel(event: IntegrationEventRecord) {
  const validation = readNestedRecord(event.payload, 'validation');
  if (readString(validation.label)) return String(validation.label);
  const status = normalize(event.status);
  if (status === 'failed' || status === 'error') return 'Validation failed';
  if (status === 'queued') return 'Queued for replay';
  if (status === 'needs_review') return 'Needs operator review';
  return 'Validated';
}
