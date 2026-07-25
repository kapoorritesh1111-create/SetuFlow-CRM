export type SetuGuruRouteKey =
  | 'dashboard'
  | 'leads'
  | 'pipeline'
  | 'products'
  | 'quotes'
  | 'orders'
  | 'compliance'
  | 'trade-events'
  | 'admin-organization'
  | 'pricing-calculator'
  | 'trial'
  | 'setu-guru'
  | 'growth-agent'
  | 'packaging-templates'
  | 'packaging-families'
  | 'packaging-design'
  | 'packaging-dispatch'
  | 'packaging-proof'
  | 'packaging-history'
  | 'packaging-academy';

export type SetuGuruLiveSearchMode =
  | 'page_help'
  | 'catalog_search'
  | 'buyer_search'
  | 'supplier_search'
  | 'lead_search'
  | 'quote_compliance'
  | 'pricing_defaults'
  | 'hsn_enrichment'
  | 'document_requirements'
  | 'margin_benchmark'
  | 'packaging_family_search'
  | 'packaging_template_search'
  | 'packaging_specification_review'
  | 'packaging_quote_readiness'
  | 'packaging_artwork_status'
  | 'packaging_proof_status'
  | 'packaging_design_queue'
  | 'packaging_dispatch_status'
  | 'packaging_production_readiness'
  | 'packaging_material_guidance'
  | 'packaging_moq_alternatives'
  | 'packaging_cost_driver_explanation';

export type SetuGuruPageContext = {
  routeKey: SetuGuruRouteKey;
  title: string;
  helpTopicId: string;
  helpFile: string;
  routes: string[];
  summary: string;
  primaryQuestions: string[];
  commonBlockers: string[];
  dataSources: string[];
  allowedActions: string[];
  approvalRequiredActions: string[];
  suggestedPrompts: string[];
  liveSearchModes: SetuGuruLiveSearchMode[];
  liveWorkspaceState?: Record<string, unknown>;
};

type ContextOptions = Partial<Pick<SetuGuruPageContext, 'helpTopicId' | 'helpFile' | 'commonBlockers' | 'dataSources' | 'allowedActions' | 'approvalRequiredActions'>>;

function makeContext(
  routeKey: SetuGuruRouteKey,
  title: string,
  routes: string[],
  summary: string,
  liveSearchModes: SetuGuruLiveSearchMode[],
  suggestedPrompts: string[],
  options: ContextOptions = {},
): SetuGuruPageContext {
  return {
    routeKey,
    title,
    helpTopicId: options.helpTopicId ?? routeKey,
    helpFile: options.helpFile ?? `docs/help/${routeKey}.md`,
    routes,
    summary,
    primaryQuestions: suggestedPrompts,
    commonBlockers: options.commonBlockers ?? ['Missing data', 'Pending review', 'Open workflow item'],
    dataSources: options.dataSources ?? ['page_context', 'organization_data', 'help_registry'],
    allowedActions: options.allowedActions ?? ['Explain status', 'Route to workspace', 'Draft next step'],
    approvalRequiredActions: options.approvalRequiredActions ?? ['human confirmation required'],
    suggestedPrompts,
    liveSearchModes,
  };
}

export function normalizeSetuGuruPath(pathname: string) {
  const cleaned = String(pathname || '/').split(/[?#]/)[0]?.trim() || '/';
  return cleaned === '/' ? '/dashboard' : cleaned.replace(/\/$/, '') || '/dashboard';
}

export function routeMatchesSetuGuruPath(pathname: string, route: string) {
  const path = normalizeSetuGuruPath(pathname);
  const normalizedRoute = normalizeSetuGuruPath(route.replace(/\*$/, ''));
  return path === normalizedRoute || path.startsWith(`${normalizedRoute}/`);
}

const PACKAGING_DATA = [
  'client_entitlement_profiles',
  'packaging_service_families',
  'packaging_pricing_templates',
  'quote_line_items',
  'packaging_proofs',
  'packaging_production_stage_events',
  'orders',
  'ai_recommendations',
];

const PACKAGING_APPROVALS = [
  'Human approval is required for quote send, pricing changes, artwork/proof approval, production-stage advancement, dispatch, compliance waivers, and write-back.',
];

export const SETU_GURU_PAGE_CONTEXTS: SetuGuruPageContext[] = [
  makeContext('packaging-design', 'Packaging Design Queue', ['/design-queue'], 'Accepted Packaging work requiring customer artwork or Design Team proof review before production release.', ['page_help', 'packaging_artwork_status', 'packaging_proof_status', 'packaging_design_queue', 'packaging_production_readiness'], ['Which jobs still need artwork?', 'Which proofs are waiting for approval?', 'What can move to production now?'], { commonBlockers: ['No artwork uploaded', 'Design Team proof pending customer approval', 'Proof rejected or revision required', 'Accepted quote line missing from Design Queue'], dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-dispatch', 'Packaging Dispatch Board', ['/dispatch-board'], 'Packaging production and dispatch workspace for pre-press, printing, converting, finishing, QC, packing, and dispatch.', ['page_help', 'packaging_dispatch_status', 'packaging_production_readiness', 'packaging_artwork_status', 'packaging_proof_status'], ['Which jobs are blocked before Printing?', 'Which jobs are stalled?', 'What is ready to dispatch?'], { commonBlockers: ['Final design missing', 'Production stage overdue', 'QC incomplete', 'Packing or dispatch evidence missing', 'Order and production state misaligned'], dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-proof', 'Packaging Proof Approval', ['/packaging-proof', '/proof-approval'], 'External proof review surface for approving or rejecting a specific Packaging Design Team proof.', ['page_help', 'packaging_proof_status'], ['What am I approving?', 'What happens after approval?', 'How do I request a revision?'], { commonBlockers: ['Approval token expired', 'Proof already reviewed', 'Wrong proof version', 'Review comment missing for rejection'], dataSources: ['packaging_proofs', 'quote_line_items', 'quotes'], allowedActions: ['Explain proof and version', 'Explain approval outcome', 'Route back to Design Queue'], approvalRequiredActions: ['The customer or authorized reviewer must explicitly approve or reject the proof.'] }),
  makeContext('packaging-history', 'Packaging History', ['/packaging-history'], 'Customer and quote Packaging history across specifications, pricing, proofs, production events, dispatch, and repeat orders.', ['page_help', 'packaging_quote_readiness', 'packaging_artwork_status', 'packaging_dispatch_status'], ['What changed between versions?', 'What was approved?', 'Is this a repeat-order candidate?'], { dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-templates', 'Packaging Pricing Templates', ['/admin/packaging-templates'], 'Packaging pricing rules for dimensions, materials, print method, finishes, MOQ tiers, setup charges, rush options, waste, and lead time.', ['page_help', 'packaging_template_search', 'packaging_moq_alternatives', 'packaging_cost_driver_explanation', 'pricing_defaults'], ['Is this template healthy?', 'Which template fits this quantity?', 'What is driving the price?'], { commonBlockers: ['Material rates missing', 'Dimension ranges incomplete', 'Print rules missing', 'MOQ tiers missing', 'Setup/pre-press charges missing', 'Lead time missing'], dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-families', 'Packaging Families', ['/admin/packaging-families'], 'Packaging family definitions and quote-time input requirements used by Catalog and Quote Builder.', ['page_help', 'packaging_family_search', 'packaging_specification_review'], ['Which family matches this inquiry?', 'What specifications are required?', 'Is this family active and quote-ready?'], { commonBlockers: ['Family inactive', 'Quote-time inputs incomplete', 'Pricing template not linked', 'Default lead time missing'], dataSources: ['packaging_service_families', 'packaging_pricing_templates', 'products'], approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-academy', 'Packaging Academy', ['/academy', '/guides/setu_flow_packaging_workspace_guide.html'], 'Click-by-click Packaging training and test workflow from capture through quote, order, design, production, dispatch, catalog, tasks, events, and admin.', ['page_help'], ['What should I test next?', 'Which step failed?', 'Which route owns this issue?'], { commonBlockers: ['Step not tested', 'Production retest required', 'Route or expected result unclear'], dataSources: ['packaging_test_results', 'sprint_issues', 'academy_catalog'], allowedActions: ['Explain the current step', 'Route to the tested workspace', 'Record a reviewable issue'], approvalRequiredActions: ['A human tester records pass/fail and confirms production behavior.'] }),
  makeContext('dashboard', 'Dashboard', ['/dashboard'], 'Trade command center for queue health and next actions.', ['page_help', 'lead_search', 'quote_compliance', 'catalog_search', 'document_requirements'], ['What should I action today?', 'Which queues need attention?']),
  makeContext('leads', 'Leads', ['/leads'], 'Lead workspace for readiness, follow-up, and quote preparation.', ['page_help', 'lead_search', 'quote_compliance', 'document_requirements', 'packaging_family_search', 'packaging_specification_review'], ['Can I quote this lead now?', 'What is missing before quote?', 'Which Packaging family fits this inquiry?']),
  makeContext('pipeline', 'Pipeline', ['/pipeline'], 'Pipeline workspace for stage movement and commercial focus.', ['page_help', 'lead_search', 'quote_compliance', 'document_requirements'], ['Which deals are ready to quote?', 'What is blocking this card?']),
  makeContext('products', 'Products', ['/products', '/admin/product-management', '/admin/categories'], 'Catalog workspace for product and pricing readiness.', ['page_help', 'catalog_search', 'pricing_defaults', 'hsn_enrichment', 'document_requirements', 'packaging_family_search', 'packaging_template_search'], ['Which products need HSN?', 'What makes this product quote-ready?', 'Which Packaging template is linked?']),
  makeContext('quotes', 'Quotes', ['/quotes', '/approval-send', '/leads/*/quote'], 'Quote workspace for pricing and quote readiness.', ['page_help', 'quote_compliance', 'pricing_defaults', 'document_requirements', 'packaging_quote_readiness', 'packaging_moq_alternatives', 'packaging_cost_driver_explanation'], ['Can I send this quote now?', 'Why is this quote blocked?', 'Is the Packaging specification and MOQ ready?']),
  makeContext('orders', 'Orders', ['/orders'], 'Orders workspace for accepted quote execution and order follow-through.', ['page_help', 'quote_compliance', 'document_requirements', 'packaging_artwork_status', 'packaging_production_readiness', 'packaging_dispatch_status'], ['Which order should I check?', 'Which orders need attention now?', 'Is final Packaging design ready?']),
  makeContext('compliance', 'Compliance', ['/compliance', '/documents'], 'Compliance workspace for stage-specific document and evidence review.', ['page_help', 'quote_compliance', 'document_requirements', 'hsn_enrichment', 'packaging_material_guidance'], ['Is this a blocker?', 'What evidence should I upload?', 'What Packaging declaration is needed?']),
  makeContext('trade-events', 'Trade events', ['/trade-events', '/capture'], 'Trade event capture workflow.', ['page_help', 'lead_search', 'buyer_search', 'supplier_search'], ['Is this capture ready?', 'What field should I clean first?']),
  makeContext('admin-organization', 'Admin organization', ['/admin', '/settings/lists'], 'Organization setup and governance workspace.', ['page_help', 'pricing_defaults', 'document_requirements'], ['What setup is missing?', 'Who can confirm this action?']),
  makeContext('pricing-calculator', 'Pricing calculator', ['/products', '/quotes', '/admin/product-management'], 'Pricing hierarchy and landed-cost guidance.', ['page_help', 'pricing_defaults', 'margin_benchmark', 'packaging_cost_driver_explanation'], ['Which pricing default is active?', 'Should this be quote-only?', 'What drives this Packaging price?']),
  makeContext('trial', 'Guided Trial', ['/trial'], 'Guided trial workspace for two-lead capture-to-dispatch validation and Packaging Converter pricing onboarding.', ['page_help', 'pricing_defaults', 'catalog_search', 'packaging_quote_readiness'], ['How do I test this trial workspace?', 'How do I validate Packaging dimensional pricing?']),
  makeContext('setu-guru', 'Setu Guru', ['/setu-guru'], 'Assistant policy and source guidance.', ['page_help', 'catalog_search', 'lead_search', 'quote_compliance', 'document_requirements', 'margin_benchmark', 'packaging_family_search', 'packaging_template_search', 'packaging_quote_readiness', 'packaging_artwork_status', 'packaging_dispatch_status'], ['What can you help with?', 'What source should you use?', 'What Packaging work needs attention?']),
  makeContext('growth-agent', 'Growth Center', ['/growth-agent'], 'Trade Growth Command Center with Packaging Operations for quote readiness, artwork/proofs, production, dispatch, template health, and repeat orders.', ['page_help', 'lead_search', 'buyer_search', 'supplier_search', 'quote_compliance', 'pricing_defaults', 'document_requirements', 'margin_benchmark', 'packaging_quote_readiness', 'packaging_design_queue', 'packaging_dispatch_status', 'packaging_template_search'], ['What needs my attention today?', 'Which Packaging quotes are at risk?', 'Which proofs or production jobs are blocked?', 'Where are the pricing gaps?']),
];

export function getSetuGuruPageContext(pathname: string) {
  const match = SETU_GURU_PAGE_CONTEXTS.find((item) => item.routes.some((route) => routeMatchesSetuGuruPath(pathname, route)));
  return match ?? SETU_GURU_PAGE_CONTEXTS[0];
}

let _liveWorkspaceState: SetuGuruPageContext['liveWorkspaceState'] = {};
export function setSetuGuruWorkspaceContext(state: SetuGuruPageContext['liveWorkspaceState']) {
  _liveWorkspaceState = { ..._liveWorkspaceState, ...state };
}
export function getLiveWorkspaceState() { return _liveWorkspaceState; }

function readablePageText(route: string) {
  if (typeof document === 'undefined') return '';
  if (normalizeSetuGuruPath(route).startsWith('/orders')) return '';
  const root = document.getElementById('app-content') ?? document.querySelector('main') ?? document.body;
  return root.textContent?.replace(/Setu Guru[\s\S]*$/i, ' ').replace(/\s+/g, ' ').slice(0, 6000) ?? '';
}

export function collectSetuGuruPageContext() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const fallback = getSetuGuruPageContext('/dashboard');
    return { ...fallback, route: '/dashboard', pageText: '' };
  }
  const route = `${window.location.pathname}${window.location.search}`;
  const pageContext = getSetuGuruPageContext(route);
  return { ...pageContext, route, pageText: readablePageText(route), liveWorkspaceState: getLiveWorkspaceState() };
}
