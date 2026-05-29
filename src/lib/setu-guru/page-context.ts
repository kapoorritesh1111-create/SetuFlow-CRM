export type SetuGuruRouteKey = 'dashboard' | 'leads' | 'pipeline' | 'products' | 'quotes' | 'orders' | 'compliance' | 'trade-events' | 'admin-organization' | 'pricing-calculator' | 'setu-guru';
export type SetuGuruLiveSearchMode = 'page_help' | 'catalog_search' | 'buyer_search' | 'supplier_search' | 'lead_search' | 'quote_compliance' | 'pricing_defaults' | 'hsn_enrichment' | 'document_requirements' | 'margin_benchmark';

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

function makeContext(routeKey: SetuGuruRouteKey, title: string, routes: string[], summary: string, liveSearchModes: SetuGuruLiveSearchMode[], suggestedPrompts: string[]): SetuGuruPageContext {
  return {
    routeKey,
    title,
    helpTopicId: routeKey,
    helpFile: `docs/help/${routeKey}.md`,
    routes,
    summary,
    primaryQuestions: suggestedPrompts,
    commonBlockers: ['Missing data', 'Pending review', 'Open workflow item'],
    dataSources: ['page_context', 'organization_data', 'help_registry'],
    allowedActions: ['Explain status', 'Route to workspace', 'Draft next step'],
    approvalRequiredActions: ['human confirmation required'],
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

export const SETU_GURU_PAGE_CONTEXTS: SetuGuruPageContext[] = [
  makeContext('dashboard', 'Dashboard', ['/dashboard'], 'Trade command center for queue health and next actions.', ['page_help', 'lead_search', 'quote_compliance', 'catalog_search', 'document_requirements'], ['What should I action today?', 'Which queues need attention?']),
  makeContext('leads', 'Leads', ['/leads'], 'Lead workspace for readiness, follow-up, and quote preparation.', ['page_help', 'lead_search', 'quote_compliance', 'document_requirements'], ['Can I quote this lead now?', 'What is missing before quote?']),
  makeContext('pipeline', 'Pipeline', ['/pipeline'], 'Pipeline workspace for stage movement and commercial focus.', ['page_help', 'lead_search', 'quote_compliance', 'document_requirements'], ['Which deals are ready to quote?', 'What is blocking this card?']),
  makeContext('products', 'Products', ['/products', '/admin/product-management', '/admin/categories'], 'Catalog workspace for product and pricing readiness.', ['page_help', 'catalog_search', 'pricing_defaults', 'hsn_enrichment', 'document_requirements'], ['Which products need HSN?', 'What makes this product quote-ready?']),
  makeContext('quotes', 'Quotes', ['/quotes', '/approval-send', '/leads/*/quote'], 'Quote workspace for pricing and quote readiness.', ['page_help', 'quote_compliance', 'pricing_defaults', 'document_requirements'], ['Can I send this quote now?', 'Why is this quote blocked?']),
  makeContext('orders', 'Orders', ['/orders'], 'Orders workspace for accepted quote execution and order follow-through.', ['page_help', 'quote_compliance', 'document_requirements'], ['Which lead/order should I check?', 'What is the status of Claude E2E US order?', 'Which orders need attention now?']),
  makeContext('compliance', 'Compliance', ['/compliance', '/documents'], 'Compliance workspace for stage-specific document and evidence review.', ['page_help', 'quote_compliance', 'document_requirements', 'hsn_enrichment'], ['Is this a blocker?', 'What evidence should I upload?']),
  makeContext('trade-events', 'Trade events', ['/trade-events', '/capture'], 'Trade event capture workflow.', ['page_help', 'lead_search', 'buyer_search', 'supplier_search'], ['Is this capture ready?', 'What field should I clean first?']),
  makeContext('admin-organization', 'Admin organization', ['/admin', '/settings/lists'], 'Organization setup and governance workspace.', ['page_help', 'pricing_defaults', 'document_requirements'], ['What setup is missing?', 'Who can confirm this action?']),
  makeContext('pricing-calculator', 'Pricing calculator', ['/products', '/quotes', '/admin/product-management'], 'Pricing hierarchy and landed-cost guidance.', ['page_help', 'pricing_defaults', 'margin_benchmark'], ['Which pricing default is active?', 'Should this be quote-only?']),
  makeContext('setu-guru', 'Setu Guru', ['/setu-guru'], 'Assistant policy and source guidance.', ['page_help', 'catalog_search', 'lead_search', 'quote_compliance', 'document_requirements', 'margin_benchmark'], ['What can you help with?', 'What source should you use?']),
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

function readablePageText() {
  if (typeof document === 'undefined') return '';
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
  return { ...pageContext, route, pageText: readablePageText(), liveWorkspaceState: getLiveWorkspaceState() };
}
