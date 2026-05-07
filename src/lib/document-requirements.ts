export type DocumentRequirementRule = {
  id: string;
  organization_id?: string | null;
  market_id: string | null;
  product_id: string | null;
  lead_type: string | null;
  progression_scope: string | null;
  requirement_code: string;
  title: string | null;
  doc_type: string | null;
  applies_to_entity: string | null;
  is_mandatory: boolean | null;
  is_active: boolean | null;
};

export type LeadRequirementDocument = {
  id: string;
  requirement_code: string | null;
  status: string | null;
  expires_at: string | null;
  related_entity?: string | null;
  related_id?: string | null;
};

export type LeadRequirementState = {
  applicableRuleCount: number;
  satisfiedRuleCount: number;
  missingRuleCount: number;
  pendingRuleCount: number;
  expiredRuleCount: number;
  blockerCount: number;
  blockerReasons: string[];
  missingRequirementCodes: string[];
  pendingRequirementCodes: string[];
  expiredRequirementCodes: string[];
};

const APPROVED_DOC_STATUSES = new Set(['approved', 'complete', 'completed', 'ready', 'waived']);
const PENDING_DOC_STATUSES = new Set(['pending', 'submitted', 'in_review', 'pending_review', 'revision_requested']);
const ACTIVE_SCOPES = new Set(['general', 'quote_send', 'contract_progression']);

function normalize(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function requirementLabel(rule: DocumentRequirementRule) {
  return String(rule.title || rule.requirement_code || 'Required document').trim();
}

function uniqueByCode(rules: DocumentRequirementRule[]) {
  const map = new Map<string, DocumentRequirementRule>();
  for (const rule of rules) {
    const code = String(rule.requirement_code ?? '').trim();
    if (!code) continue;
    const existing = map.get(code);
    if (!existing) {
      map.set(code, rule);
      continue;
    }
    const currentScore = Number(Boolean(rule.market_id)) + Number(Boolean(rule.product_id)) + Number(Boolean(rule.lead_type)) + Number(rule.is_mandatory === true);
    const existingScore = Number(Boolean(existing.market_id)) + Number(Boolean(existing.product_id)) + Number(Boolean(existing.lead_type)) + Number(existing.is_mandatory === true);
    if (currentScore >= existingScore) map.set(code, rule);
  }
  return Array.from(map.values());
}

export function getApplicableRequirementRules(input: {
  rules: DocumentRequirementRule[];
  leadType: string | null | undefined;
  marketIds?: string[];
  productIds?: string[];
  scope?: 'general' | 'quote_send' | 'contract_progression';
}) {
  const marketIdSet = new Set((input.marketIds ?? []).filter(Boolean));
  const productIdSet = new Set((input.productIds ?? []).filter(Boolean));
  const leadType = normalize(input.leadType);
  const scope = normalize(input.scope ?? 'general');

  const applicable = input.rules.filter((rule) => {
    if (rule.is_active === false) return false;
    const ruleScope = normalize(rule.progression_scope || 'general');
    if (!ACTIVE_SCOPES.has(ruleScope)) return false;
    if (!(ruleScope === 'general' || ruleScope === scope)) return false;
    if (rule.lead_type && normalize(rule.lead_type) !== leadType) return false;
    if (rule.market_id && !marketIdSet.has(rule.market_id)) return false;
    if (rule.product_id && !productIdSet.has(rule.product_id)) return false;
    return true;
  });

  return uniqueByCode(applicable);
}

export function buildLeadDocumentRequirementState(input: {
  rules: DocumentRequirementRule[];
  leadType: string | null | undefined;
  marketIds?: string[];
  productIds?: string[];
  documents?: LeadRequirementDocument[];
  scope?: 'general' | 'quote_send' | 'contract_progression';
}): LeadRequirementState {
  const applicableRules = getApplicableRequirementRules(input);
  const mandatoryApplicableRules = applicableRules.filter((rule) => rule.is_mandatory === true);
  const documents = input.documents ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const missingRequirementCodes: string[] = [];
  const pendingRequirementCodes: string[] = [];
  const expiredRequirementCodes: string[] = [];
  const missingLabels: string[] = [];
  const pendingLabels: string[] = [];
  const expiredLabels: string[] = [];

  for (const rule of mandatoryApplicableRules) {
    const code = String(rule.requirement_code ?? '').trim();
    if (!code) continue;
    const label = requirementLabel(rule);
    const matchingDocuments = documents.filter((document) => String(document.requirement_code ?? '').trim() === code);
    const nonExpired = matchingDocuments.filter((document) => !document.expires_at || document.expires_at >= today);
    const approved = nonExpired.some((document) => APPROVED_DOC_STATUSES.has(normalize(document.status)));
    const pending = !approved && nonExpired.some((document) => PENDING_DOC_STATUSES.has(normalize(document.status)));
    const expired = !approved && matchingDocuments.some((document) => Boolean(document.expires_at) && String(document.expires_at) < today);

    if (approved) continue;
    if (pending) {
      pendingRequirementCodes.push(code);
      pendingLabels.push(label);
    } else if (expired) {
      expiredRequirementCodes.push(code);
      expiredLabels.push(label);
    } else {
      missingRequirementCodes.push(code);
      missingLabels.push(label);
    }
  }

  const blockerReasons: string[] = [];
  if (missingLabels.length) blockerReasons.push(`Missing required document: ${missingLabels.slice(0, 3).join(', ')}${missingLabels.length > 3 ? ' +' + (missingLabels.length - 3) + ' more' : ''}`);
  if (pendingLabels.length) blockerReasons.push(`Required document review pending: ${pendingLabels.slice(0, 3).join(', ')}${pendingLabels.length > 3 ? ' +' + (pendingLabels.length - 3) + ' more' : ''}`);
  if (expiredLabels.length) blockerReasons.push(`Required document expired: ${expiredLabels.slice(0, 3).join(', ')}${expiredLabels.length > 3 ? ' +' + (expiredLabels.length - 3) + ' more' : ''}`);

  return {
    // This count is intentionally mandatory-only. Advisory documents can guide dispatch preparation,
    // but they must not create the red quote-prep "items need attention" state.
    applicableRuleCount: mandatoryApplicableRules.length,
    satisfiedRuleCount: Math.max(0, mandatoryApplicableRules.length - missingRequirementCodes.length - pendingRequirementCodes.length - expiredRequirementCodes.length),
    missingRuleCount: missingRequirementCodes.length,
    pendingRuleCount: pendingRequirementCodes.length,
    expiredRuleCount: expiredRequirementCodes.length,
    blockerCount: blockerReasons.length,
    blockerReasons,
    missingRequirementCodes,
    pendingRequirementCodes,
    expiredRequirementCodes,
  };
}

export async function getLeadProgressionGuard(db: { from: (table: string) => any }, input: {
  organizationId: string;
  leadId: string;
  leadType: string;
  scope: 'quote_send' | 'contract_progression';
}) {
  const [leadMarketsResult, leadProductsResult, documentsResult, complianceResult, rulesResult] = await Promise.all([
    db.from('lead_markets').select('market_id').eq('lead_id', input.leadId),
    db.from('lead_product_interests').select('product_id').eq('lead_id', input.leadId),
    db.from('documents').select('id, requirement_code, status, expires_at, related_entity, related_id').eq('organization_id', input.organizationId).eq('related_entity', 'lead').eq('related_id', input.leadId),
    db.from('lead_compliance_items').select('status, compliance_checklist_items(code, description, is_mandatory)').eq('organization_id', input.organizationId).eq('lead_id', input.leadId),
    db.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', input.organizationId).eq('is_active', true),
  ]);

  const marketIds = Array.isArray(leadMarketsResult.data) ? leadMarketsResult.data.map((item: any) => item.market_id).filter(Boolean) : [];
  const productIds = Array.isArray(leadProductsResult.data) ? leadProductsResult.data.map((item: any) => item.product_id).filter(Boolean) : [];
  const documents = Array.isArray(documentsResult.data) ? documentsResult.data : [];
  const rules = Array.isArray(rulesResult.data) ? rulesResult.data : [];
  const documentState = buildLeadDocumentRequirementState({
    rules,
    leadType: input.leadType,
    marketIds,
    productIds,
    documents,
    scope: input.scope,
  });
  const openComplianceItems = Array.isArray(complianceResult.data)
    ? complianceResult.data.filter((item: any) => {
        const status = normalize(item.status);
        const mandatory = item.compliance_checklist_items?.is_mandatory !== false;
        return mandatory && !['approved', 'waived', 'complete', 'completed'].includes(status);
      })
    : [];
  const blockerReasons = [...documentState.blockerReasons];
  if (openComplianceItems.length > 0) {
    const labels = openComplianceItems.map((item: any) => item.compliance_checklist_items?.description || item.compliance_checklist_items?.code || 'Compliance item');
    blockerReasons.push(`Open mandatory compliance item: ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? ' +' + (labels.length - 3) + ' more' : ''}`);
  }
  return {
    blockerCount: documentState.blockerCount + (openComplianceItems.length > 0 ? 1 : 0),
    blockerReasons,
    documentState,
    openComplianceCount: openComplianceItems.length,
  };
}
