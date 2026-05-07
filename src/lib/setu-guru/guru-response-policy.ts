export type SetuGuruAnswerSource = 'page_context' | 'live_organization_data' | 'route_help_registry' | 'live_research' | 'generic_guidance';

export const SETU_GURU_RESPONSE_POLICY = {
  answerOrder: ['page_context', 'live_organization_data', 'route_help_registry', 'live_research', 'generic_guidance'] as SetuGuruAnswerSource[],
  usePageContextFirst: true,
  useLiveOrgDataFor: [
    'products',
    'catalog',
    'leads',
    'buyers',
    'suppliers',
    'quotes',
    'orders',
    'documents',
    'compliance',
    'blockers',
    'counts',
    'missing fields',
  ],
  useLiveResearchFor: [
    'HSN',
    'HS code',
    'tariff',
    'duty',
    'customs',
    'country rules',
    'margin benchmark',
    'compliance requirements',
  ],
  humanApprovalRequiredFor: [
    'approve',
    'waive',
    'write back',
    'send',
    'delete',
    'clear compliance',
    'advance order',
    'change pricing defaults',
    'change compliance policy',
  ],
  stageRules: [
    'Separate quote-send blockers from order and dispatch requirements.',
    'Treat COA and Packing List as advisory before dispatch unless an organization rule explicitly makes them quote-send mandatory.',
    'Treat live research as draft guidance until a human reviews the sources.',
  ],
} as const;

const COMPLIANCE_WORDS = ['compliance', 'blocker', 'document', 'evidence', 'certificate', 'coa', 'packing list', 'dispatch', 'ignore', 'waive', 'fix this', 'fix compliance', 'required document'];
const ORG_SEARCH_PHRASES = ['how many product', 'how many buyer', 'how many supplier', 'how many lead', 'in my catalog', 'find buyer', 'find supplier', 'find lead', 'find product', 'search buyer', 'search supplier', 'missing hsn', 'missing hs code', 'filter', 'listed products', 'category'];
const PRICING_DEFAULT_PHRASES = ['pricing calculator', 'calculator default', 'price calculator', 'default margin', 'default markup', 'distributor margin', 'retail margin'];

function includesAny(value: string, phrases: readonly string[]) {
  const normalized = value.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase.toLowerCase()));
}

export function isSetuGuruComplianceQuestion(question: string) {
  return includesAny(question, COMPLIANCE_WORDS);
}

export function isSetuGuruOrgSearchQuestion(question: string) {
  return isSetuGuruComplianceQuestion(question) || includesAny(question, ORG_SEARCH_PHRASES);
}

export function isSetuGuruPricingDefaultQuestion(question: string) {
  return includesAny(question, PRICING_DEFAULT_PHRASES);
}

export function shouldUseLiveOrganizationData(question: string) {
  return includesAny(question, SETU_GURU_RESPONSE_POLICY.useLiveOrgDataFor);
}

export function shouldUseLiveResearch(question: string) {
  return includesAny(question, SETU_GURU_RESPONSE_POLICY.useLiveResearchFor);
}

export function requiresHumanApproval(question: string) {
  return includesAny(question, SETU_GURU_RESPONSE_POLICY.humanApprovalRequiredFor);
}

export function getSetuGuruPolicyReminder(question: string) {
  const reminders: string[] = [];
  if (shouldUseLiveOrganizationData(question)) reminders.push('Use live organization data before generic workflow guidance.');
  if (shouldUseLiveResearch(question)) reminders.push('Use live research with source-backed guidance and human review before write-back.');
  if (requiresHumanApproval(question)) reminders.push('Human approval is required before Setu Guru takes or clears this action.');
  return reminders;
}

export function classifySetuGuruResponse(question: string, pathname = '') {
  return {
    sourceOrder: SETU_GURU_RESPONSE_POLICY.answerOrder,
    shouldUsePageContext: SETU_GURU_RESPONSE_POLICY.usePageContextFirst,
    shouldUseLiveOrgData: shouldUseLiveOrganizationData(`${question} ${pathname}`),
    shouldUseLiveResearch: shouldUseLiveResearch(question),
    requiresHumanApproval: requiresHumanApproval(question),
    reminders: getSetuGuruPolicyReminder(question),
  };
}
