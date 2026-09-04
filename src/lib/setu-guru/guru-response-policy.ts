export type SetuGuruAnswerSource = 'page_context' | 'live_organization_data' | 'route_help_registry' | 'live_research' | 'generic_guidance';

export type SetuGuruIntent = 'quote_blockers' | 'quote_lifecycle' | 'order_lifecycle' | 'dispatch_docs' | 'hs_code' | 'compliance' | 'catalog' | 'general';

export const SETU_GURU_RESPONSE_POLICY = {
  answerOrder: ['page_context', 'live_organization_data', 'route_help_registry', 'live_research', 'generic_guidance'] as SetuGuruAnswerSource[],
  usePageContextFirst: true,
  useLiveOrgDataFor: ['products', 'catalog', 'leads', 'buyers', 'suppliers', 'quotes', 'quote lifecycle', 'orders', 'order', 'order lifecycle', 'order status', 'status of order', 'status of the order', 'order state', 'payment status', 'fulfillment status', 'dispatch status', 'documents', 'compliance', 'blockers', 'counts', 'missing fields', 'quote blockers', 'dispatch documents', 'order documents', 'kurti', 'floral', 'address', 'borelli', 'hsn', 'price'],
  useLiveResearchFor: ['HSN', 'HS code', 'HSN code', 'tariff', 'duty', 'customs', 'country rules', 'margin benchmark', 'compliance requirements'],
  humanApprovalRequiredFor: ['approve', 'apply', 'update catalog', 'write back', 'send', 'accept quote', 'reject quote', 'direct order', 'advance order', 'dispatch', 'mark dispatched', 'change pricing defaults', 'change compliance policy'],
  stageRules: [
    'Separate quote-send blockers from order and dispatch requirements.',
    'Sending a quote sets current_version_id and sent_version_id only; acceptance sets accepted_version_id.',
    'Accepted quotes hand off to the canonical orders header.',
    'Treat orders as the canonical execution header after quote acceptance.',
    'Order advancement must follow the canonical stage command and idempotency key.',
    'Treat COA and Packing List as advisory before dispatch unless an active rule makes them quote-send mandatory.',
    'Treat live research as draft guidance until a human reviews the sources.',
    'Never invent HS or HSN codes. Only cite codes from catalog data or source-backed research.',
    'For mixed questions, answer each detected intent separately.',
  ],
} as const;

const COMPLIANCE_WORDS = ['compliance', 'blocker', 'document', 'evidence', 'certificate', 'coa', 'packing list', 'dispatch', 'fix compliance', 'required document'];
const QUOTE_BLOCKER_WORDS = ['quote blocker', 'quote blockers', 'quote send', 'send blocker', 'send blockers', 'review blocker', 'quote review', 'why is quote blocked', 'cannot send quote'];
const QUOTE_LIFECYCLE_WORDS = ['quote lifecycle', 'quote version', 'sent version', 'accepted version', 'sent_version_id', 'accepted_version_id', 'direct order', 'quote accepted', 'quote rejected', 'quote acceptance'];
const ORDER_LIFECYCLE_WORDS = ['check this order status', 'check order status', 'what is the status of the order', 'what is status of order', 'status of the order', 'status of order', 'order status', 'order state', 'order readiness', 'canonical order', 'order lifecycle', 'order stage', 'payment requested', 'partial payment', 'deferred payment', 'post delivery', 'production ready', 'dispatch ready', 'mark dispatched', 'order dispatch'];
const DISPATCH_DOC_WORDS = ['dispatch doc', 'dispatch docs', 'dispatch document', 'dispatch documents', 'packing list', 'coa', 'certificate of analysis', 'before dispatch', 'order dispatch', 'shipment document'];
const HS_CODE_WORDS = ['hs code', 'hs-code', 'hsn', 'hsn code', 'tariff code', 'customs code'];
const PAGE_HELP_WORDS = ['help', 'what can you do', 'what should i do', 'guide me', 'how do i use this page', 'what is this page', 'kpi', 'kpi filter', 'kpi filters', 'explain kpi', 'explain kpi filters'];
const ORG_SEARCH_PHRASES = ['how many product', 'how many buyer', 'how many supplier', 'how many lead', 'in my catalog', 'find buyer', 'find supplier', 'find lead', 'find product', 'search buyer', 'search supplier', 'missing hsn', 'missing hs code', 'what is hsn', 'what is hs code', 'hsn code for', 'hs code for', 'tariff for', 'duty for', 'document requirements for', 'margin benchmark for', 'listed products', 'category', 'quote lifecycle', 'order lifecycle', 'canonical order', 'check this order status', 'check order status', 'what is the status of the order', 'what is status of order', 'status of the order', 'status of order', 'order status', 'order state', 'order readiness', 'payment status', 'fulfillment status', 'dispatch status', 'floral', 'kurti', 'address', 'borelli', 'price', 'what is'];
const PRICING_DEFAULT_PHRASES = ['pricing calculator', 'calculator default', 'price calculator', 'default margin', 'default markup', 'distributor margin', 'retail margin'];

function includesAny(value: string, phrases: readonly string[]) {
  const normalized = value.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase.toLowerCase()));
}

function looksLikeOrderQuestion(question: string) {
  const q = question.toLowerCase();
  return q.includes('order') && (q.includes('status') || q.includes('block') || q.includes('next') || q.includes('dispatch') || q.includes('payment') || q.includes('freight') || q.includes('finance') || q.includes('stage'));
}

export function getSetuGuruIntents(question: string): SetuGuruIntent[] {
  const intents = new Set<SetuGuruIntent>();
  if (includesAny(question, QUOTE_BLOCKER_WORDS)) intents.add('quote_blockers');
  if (includesAny(question, QUOTE_LIFECYCLE_WORDS)) intents.add('quote_lifecycle');
  if (includesAny(question, ORDER_LIFECYCLE_WORDS) || looksLikeOrderQuestion(question)) intents.add('order_lifecycle');
  if (includesAny(question, DISPATCH_DOC_WORDS)) intents.add('dispatch_docs');
  if (includesAny(question, HS_CODE_WORDS)) intents.add('hs_code');
  if (isSetuGuruComplianceQuestion(question)) intents.add('compliance');
  if (includesAny(question, ['product', 'catalog', 'sku', 'moringa', 'powder', 'chips', 'kurti', 'floral'])) intents.add('catalog');
  if (!intents.size) intents.add('general');
  return Array.from(intents);
}

export function isSetuGuruComplianceQuestion(question: string) {
  return includesAny(question, COMPLIANCE_WORDS) || includesAny(question, QUOTE_BLOCKER_WORDS) || includesAny(question, DISPATCH_DOC_WORDS);
}

export function isSetuGuruPageHelpQuestion(question: string) {
  if (looksLikeOrderQuestion(question)) return false;
  return includesAny(question, PAGE_HELP_WORDS);
}

export function shouldUseLiveOrganizationData(question: string) {
  return true; // 🔥 Force live org data for everything
}

export function shouldUseLiveResearch(question: string) {
  return includesAny(question, SETU_GURU_RESPONSE_POLICY.useLiveResearchFor) || getSetuGuruIntents(question).includes('hs_code') || includesAny(question, ['kurti', 'floral', 'address']);
}

export function isSetuGuruOrgSearchQuestion(question: string) {
  return true; // 🔥 Force org search active for all queries
}

export function isSetuGuruPricingDefaultQuestion(question: string) {
  return includesAny(question, PRICING_DEFAULT_PHRASES);
}

export function requiresHumanApproval(question: string) {
  return includesAny(question, SETU_GURU_RESPONSE_POLICY.humanApprovalRequiredFor);
}

export function getSetuGuruPolicyReminder(question: string) {
  const reminders: string[] = [];
  const intents = getSetuGuruIntents(question);
  if (intents.length > 1 || !intents.includes('general')) reminders.push(`Handle detected intents separately: ${intents.join(', ')}.`);
  if (shouldUseLiveOrganizationData(question)) reminders.push('Use live organization data before generic workflow guidance.');
  if (shouldUseLiveResearch(question)) reminders.push('Use live research with source-backed guidance and human review before write-back.');
  return Array.from(new Set(reminders));
}

export function classifySetuGuruResponse(question: string, pathname = '') {
  const intents = getSetuGuruIntents(`${question} ${pathname}`);
  return {
    sourceOrder: SETU_GURU_RESPONSE_POLICY.answerOrder,
    intents,
    isMultiIntent: intents.length > 1,
    shouldUsePageContext: SETU_GURU_RESPONSE_POLICY.usePageContextFirst,
    shouldUseLiveOrgData: true,
    shouldUseLiveResearch: shouldUseLiveResearch(question),
    requiresHumanApproval: requiresHumanApproval(question),
    mustAvoidHsCodeGuessing: intents.includes('hs_code'),
    reminders: getSetuGuruPolicyReminder(question),
  };
}