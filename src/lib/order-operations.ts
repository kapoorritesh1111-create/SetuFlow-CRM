import { buildLeadDocumentRequirementState, getApplicableRequirementRules, type DocumentRequirementRule } from '@/lib/document-requirements';

export type OrderOperationalDocument = {
  id: string;
  file_name: string;
  doc_type: string;
  status: string;
  uploaded_at?: string | null;
  version?: number | null;
  related_entity?: string | null;
  related_id?: string | null;
  requirement_code?: string | null;
  expires_at?: string | null;
  review_notes?: string | null;
};

export type OrderOperationalComplianceItem = {
  id: string;
  status: string;
  compliance_item_id: string;
  submitted_at?: string | null;
  approved_at?: string | null;
};

export type OrderOperationalLineSignal = {
  countryOfOrigin?: string | null;
  exportMetadata?: string | null;
  shipmentNotes?: string | null;
};

export type OrderDispatchArtifactState = {
  key: string;
  title: string;
  stage: 'released' | 'dispatched' | 'completed';
  status: 'satisfied' | 'pending' | 'missing';
  reason: string;
  matchedDocumentNames: string[];
};

export type OrderOperationalControlState = {
  documentRequirementSummary: {
    applicableCount: number;
    satisfiedCount: number;
    blockerCount: number;
    blockerReasons: string[];
    expected: Array<{
      code: string;
      title: string;
      status: 'satisfied' | 'pending' | 'missing' | 'expired';
    }>;
  };
  complianceSummary: {
    openCount: number;
    blockerReasons: string[];
  };
  dispatchArtifacts: OrderDispatchArtifactState[];
  releaseArtifactReasons: string[];
  dispatchArtifactReasons: string[];
  completionArtifactReasons: string[];
};

const APPROVED_STATUSES = new Set(['approved', 'complete', 'completed', 'ready', 'signed', 'active']);
const PENDING_STATUSES = new Set(['pending', 'submitted', 'in_review', 'pending_review', 'sent', 'revision_requested']);
const CLEAR_COMPLIANCE_STATUSES = new Set(['approved', 'complete', 'completed', 'waived']);

function normalize(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isApproved(status: string | null | undefined) {
  return APPROVED_STATUSES.has(normalize(status));
}

function isPending(status: string | null | undefined) {
  return PENDING_STATUSES.has(normalize(status));
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return String(expiresAt).slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function buildRequirementStatus(documents: OrderOperationalDocument[]) {
  const usable = documents.filter((document) => !isExpired(document.expires_at));
  if (usable.some((document) => isApproved(document.status))) return 'satisfied' as const;
  if (usable.some((document) => isPending(document.status))) return 'pending' as const;
  if (documents.some((document) => isExpired(document.expires_at))) return 'expired' as const;
  return 'missing' as const;
}

function matchArtifactDocuments(documents: OrderOperationalDocument[], aliases: string[]) {
  return documents.filter((document) => {
    const haystack = [document.doc_type, document.requirement_code, document.file_name].map((value) => normalize(value)).join(' ');
    return aliases.some((alias) => haystack.includes(normalize(alias)));
  });
}

export function buildOrderOperationalControlState(input: {
  documents: OrderOperationalDocument[];
  complianceItems: OrderOperationalComplianceItem[];
  requirementRules: DocumentRequirementRule[];
  leadType: string | null | undefined;
  marketIds?: string[];
  productIds?: string[];
  lines?: OrderOperationalLineSignal[];
}) : OrderOperationalControlState {
  const documents = input.documents ?? [];
  const lines = input.lines ?? [];
  const applicableRules = getApplicableRequirementRules({
    rules: input.requirementRules,
    leadType: input.leadType,
    marketIds: input.marketIds,
    productIds: input.productIds,
    scope: 'contract_progression',
  });

  const documentRequirementSummaryBase = buildLeadDocumentRequirementState({
    rules: input.requirementRules,
    leadType: input.leadType,
    marketIds: input.marketIds,
    productIds: input.productIds,
    documents: documents.map((document) => ({
      id: document.id,
      requirement_code: document.requirement_code ?? null,
      status: document.status ?? null,
      expires_at: document.expires_at ?? null,
      related_entity: document.related_entity ?? null,
      related_id: document.related_id ?? null,
    })),
    scope: 'contract_progression',
  });

  const expected = applicableRules.map((rule) => {
    const code = String(rule.requirement_code ?? '').trim();
    const matching = documents.filter((document) => String(document.requirement_code ?? '').trim() === code);
    return {
      code,
      title: String(rule.title ?? code ?? 'Untitled requirement'),
      status: buildRequirementStatus(matching),
    };
  });

  const openComplianceItems = input.complianceItems.filter((item) => !CLEAR_COMPLIANCE_STATUSES.has(normalize(item.status)));
  const complianceSummary = {
    openCount: openComplianceItems.length,
    blockerReasons: openComplianceItems.slice(0, 3).map((item) => `Compliance item ${item.compliance_item_id.slice(0, 12)} is still ${titleCase(String(item.status ?? 'open'))}.`),
  };
  if (openComplianceItems.length > 3) {
    complianceSummary.blockerReasons.push(`${openComplianceItems.length - 3} additional compliance item${openComplianceItems.length - 3 === 1 ? '' : 's'} still need action.`);
  }

  const hasOriginSensitiveLine = lines.some((line) => Boolean(line.countryOfOrigin));
  const hasExportSensitiveLine = lines.some((line) => Boolean(line.exportMetadata) || Boolean(line.shipmentNotes));

  const artifactDefinitions: Array<{ key: string; title: string; stage: 'released' | 'dispatched' | 'completed'; aliases: string[]; required: boolean }> = [
    { key: 'commercial_invoice', title: 'Commercial invoice', stage: 'released', aliases: ['commercial invoice', 'commercial_invoice', 'invoice'], required: true },
    { key: 'packing_list', title: 'Packing list', stage: 'released', aliases: ['packing list', 'packing_list', 'pack list'], required: true },
    { key: 'certificate_of_origin', title: 'Certificate of origin evidence', stage: 'released', aliases: ['certificate of origin', 'certificate_of_origin', 'origin certificate'], required: hasOriginSensitiveLine },
    { key: 'export_clearance', title: 'Export clearance evidence', stage: 'dispatched', aliases: ['export clearance', 'export_clearance', 'export declaration', 'shipping bill', 'customs clearance'], required: hasExportSensitiveLine },
    { key: 'transport_document', title: 'Dispatch transport proof', stage: 'dispatched', aliases: ['bill of lading', 'bol', 'air waybill', 'airway bill', 'awb', 'lorry receipt', 'dispatch note', 'shipment release', 'transport document'], required: true },
    { key: 'proof_of_delivery', title: 'Proof of delivery', stage: 'completed', aliases: ['proof of delivery', 'pod', 'delivery confirmation', 'completion note', 'goods received'], required: true },
  ];

  const dispatchArtifacts = artifactDefinitions
    .filter((definition) => definition.required)
    .map((definition) => {
      const matching = matchArtifactDocuments(documents, definition.aliases);
      const usable = matching.filter((document) => !isExpired(document.expires_at));
      const status = usable.some((document) => isApproved(document.status))
        ? 'satisfied'
        : usable.some((document) => isPending(document.status))
          ? 'pending'
          : 'missing';
      return {
        key: definition.key,
        title: definition.title,
        stage: definition.stage,
        status,
        reason: status === 'satisfied'
          ? `${definition.title} is on file.`
          : status === 'pending'
            ? `${definition.title} is linked but still awaiting approval.`
            : `${definition.title} is still missing.`,
        matchedDocumentNames: matching.map((document) => document.file_name).filter(Boolean),
      } satisfies OrderDispatchArtifactState;
    });

  const releaseArtifactReasons = dispatchArtifacts.filter((artifact) => artifact.stage === 'released' && artifact.status !== 'satisfied').map((artifact) => artifact.reason);
  const dispatchArtifactReasons = dispatchArtifacts.filter((artifact) => artifact.stage === 'dispatched' && artifact.status !== 'satisfied').map((artifact) => artifact.reason);
  const completionArtifactReasons = dispatchArtifacts.filter((artifact) => artifact.stage === 'completed' && artifact.status !== 'satisfied').map((artifact) => artifact.reason);

  return {
    documentRequirementSummary: {
      applicableCount: documentRequirementSummaryBase.applicableRuleCount,
      satisfiedCount: documentRequirementSummaryBase.satisfiedRuleCount,
      blockerCount: documentRequirementSummaryBase.blockerCount,
      blockerReasons: documentRequirementSummaryBase.blockerReasons,
      expected,
    },
    complianceSummary,
    dispatchArtifacts,
    releaseArtifactReasons,
    dispatchArtifactReasons,
    completionArtifactReasons,
  };
}
