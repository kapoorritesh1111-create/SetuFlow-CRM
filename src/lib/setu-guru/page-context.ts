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
  | 'setu-guru';

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
  | 'margin_benchmark';

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
};

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
  {
    routeKey: 'dashboard',
    title: 'Dashboard',
    helpTopicId: 'dashboard',
    helpFile: 'docs/help/dashboard.md',
    routes: ['/dashboard'],
    summary: 'Trade command center for queue health, blockers, next actions, and world coverage map focus.',
    primaryQuestions: ['What should I do next?', 'Which queues are blocked?', 'Why did the map zoom to this country?', 'How do I reset the map?'],
    commonBlockers: ['Overdue follow-up', 'Stale quote', 'Open approval', 'Execution drift', 'Incomplete organization defaults', 'Country or market setup mismatch'],
    dataSources: ['leads', 'quotes', 'orders', 'documents', 'compliance_items', 'products', 'organization_defaults', 'countries', 'markets'],
    allowedActions: ['Summarize queue health', 'Route to the right workspace', 'Explain missing data', 'Draft next actions', 'Explain map country focus and reset behavior'],
    approvalRequiredActions: ['approve quote', 'send quote', 'waive compliance', 'change pricing defaults', 'advance order execution'],
    suggestedPrompts: ['What should I do next today?', 'Which records are blocked?', 'Why is the map focused on this country?', 'How do I reset the map?'],
    liveSearchModes: ['page_help', 'lead_search', 'quote_compliance', 'catalog_search', 'document_requirements'],
  },
  {
    routeKey: 'leads',
    title: 'Leads',
    helpTopicId: 'leads',
    helpFile: 'docs/help/leads.md',
    routes: ['/leads'],
    summary: 'Follow-up workspace for qualification, product interest, blockers, and quote prep.',
    primaryQuestions: ['Can I quote this lead now?', 'What is missing before quote?', 'What should I ask next?'],
    commonBlockers: ['Missing contact or country', 'No product interest', 'No next step', 'Quote terms incomplete', 'Compliance stage unclear'],
    dataSources: ['leads', 'lead_product_interests', 'quotes', 'documents', 'lead_compliance_items', 'document_requirement_rules'],
    allowedActions: ['Explain missing fields', 'Suggest follow-up questions', 'Route to quote, documents, or Compliance Assist', 'Search active lead context'],
    approvalRequiredActions: ['send quote', 'approve price deviation', 'waive compliance', 'delete lead', 'write back defaults'],
    suggestedPrompts: ['Can I quote this lead now?', 'What evidence is needed for this buyer?', 'What should I ask the buyer next?'],
    liveSearchModes: ['page_help', 'lead_search', 'quote_compliance', 'document_requirements'],
  },
  {
    routeKey: 'pipeline',
    title: 'Pipeline',
    helpTopicId: 'pipeline',
    helpFile: 'docs/help/pipeline.md',
    routes: ['/pipeline'],
    summary: 'Premium trade command center for stage movement, deal value, blockers, follow-up risk, and quote-ready action.',
    primaryQuestions: ['What should I do next in Pipeline?', 'Why should I use Pipeline instead of Leads?', 'Which stage has the most value at risk?', 'Which deals are ready to convert to quote?'],
    commonBlockers: ['Pipeline and Leads purpose confusion', 'Heavy instructional text on the board', 'Overdue follow-up', 'Stage move blocker', 'Quote readiness unclear'],
    dataSources: ['leads', 'pipeline_stages', 'lead_stage_history', 'follow_ups', 'quotes', 'compliance_items', 'lead_product_interests'],
    allowedActions: ['Explain Pipeline versus Leads', 'Summarize stage risk and deal value', 'Route to Leads, Quotes, or Compliance', 'Suggest the next commercial action'],
    approvalRequiredActions: ['move stage', 'convert to quote', 'send quote', 'approve pricing', 'waive compliance', 'change lead data'],
    suggestedPrompts: ['What should I do next in Pipeline?', 'Why use Pipeline instead of Leads?', 'Which deals are ready to quote?', 'What is blocking this Pipeline card?'],
    liveSearchModes: ['page_help', 'lead_search', 'quote_compliance', 'document_requirements'],
  },
  {
    routeKey: 'products',
    title: 'Products',
    helpTopicId: 'products',
    helpFile: 'docs/help/products.md',
    routes: ['/products', '/admin/product-management', '/admin/categories'],
    summary: 'Operating catalog for product, variant, trade, and pricing readiness.',
    primaryQuestions: ['Which products are quote-ready?', 'Which products are missing HSN?', 'Is this price product default or quote-only?'],
    commonBlockers: ['Missing HSN/HS code', 'Missing pack or MOQ', 'Missing origin or lead time', 'Inactive category', 'Pricing override confusion'],
    dataSources: ['products', 'product_variants', 'categories', 'pricing_rules', 'lead_product_interests', 'document_requirement_rules'],
    allowedActions: ['Summarize readiness', 'Route to edit or missing HSN filter', 'Suggest research prompts', 'Explain pricing hierarchy'],
    approvalRequiredActions: ['overwrite product defaults', 'save category defaults', 'save organization defaults', 'approve compliance'],
    suggestedPrompts: ['Which products are missing HSN codes?', 'What makes this product quote-ready?', 'Should this change be quote-only?'],
    liveSearchModes: ['page_help', 'catalog_search', 'pricing_defaults', 'hsn_enrichment', 'document_requirements'],
  },
  {
    routeKey: 'quotes',
    title: 'Quotes',
    helpTopicId: 'quotes',
    helpFile: 'docs/help/quotes.md',
    routes: ['/quotes', '/approval-send', '/leads/*/quote'],
    summary: 'Commercial workspace for pricing, approvals, quote PDF readiness, and quote-send blockers.',
    primaryQuestions: ['Can I send this quote?', 'Why is this quote blocked?', 'Which changes need approval?'],
    commonBlockers: ['Missing terms', 'Missing quote line data', 'Price deviation approval', 'Mandatory quote-send compliance', 'Advisory dispatch document mistaken as blocker'],
    dataSources: ['quotes', 'quote_lines', 'leads', 'products', 'pricing_rules', 'documents', 'lead_compliance_items'],
    allowedActions: ['Explain readiness', 'Route to approval or Compliance Assist', 'Explain currency and incoterm wording', 'Draft buyer-facing wording'],
    approvalRequiredActions: ['send quote', 'approve price deviation', 'waive compliance', 'write back product pricing', 'delete quote'],
    suggestedPrompts: ['Can I send this quote now?', 'Why is this quote blocked?', 'Explain quote currency versus catalog currency.'],
    liveSearchModes: ['page_help', 'quote_compliance', 'pricing_defaults', 'document_requirements'],
  },
  {
    routeKey: 'orders',
    title: 'Orders',
    helpTopicId: 'orders',
    helpFile: 'docs/help/orders.md',
    routes: ['/orders'],
    summary: 'Orders Execution Cockpit after quote acceptance for actual lines, buyer docs, packing, pending freight queue, processing, delivery note, final invoice, pending finance queue, and paid closeout.',
    primaryQuestions: ['What is blocking this order?', 'What is the next best action and why?', 'Can I queue finance or freight now?', 'Why is WhatsApp manual?'],
    commonBlockers: ['Actual lines approval missing', 'Buyer document approval missing', 'Packing plan missing or unapproved', 'Freight payload incomplete', 'Processing/QC incomplete', 'Delivery Note or Final Invoice approval missing', 'Payment/reconciliation/archive incomplete'],
    dataSources: ['orders', 'order_lines', 'accepted_quote_versions', 'order_documents', 'order_document_sends', 'order_approval_gates', 'order_stage_events', 'packing_plans', 'freight_rate_requests', 'freight_booking_events', 'finance_integration_events', 'trade_requirements'],
    allowedActions: ['Explain next best action', 'Explain blockers', 'Draft dispatch evidence checklist', 'Explain Finance/Freight pending-adapter queues', 'Explain manual WhatsApp tracked links and PDF fallback'],
    approvalRequiredActions: ['approve actual lines', 'approve order documents', 'send documents', 'confirm or waive trade requirements', 'approve packing', 'queue or retry integration events', 'change shipment or dispatch status', 'record payment/reconcile/close order'],
    suggestedPrompts: ['What is blocking this order?', 'What should I approve before sending the first order document?', 'Can I queue finance now?', 'Can I book freight from this screen?', 'Draft a dispatch evidence checklist without advancing state.'],
    liveSearchModes: ['page_help', 'quote_compliance', 'document_requirements'],
  },
  {
    routeKey: 'compliance',
    title: 'Compliance',
    helpTopicId: 'compliance',
    helpFile: 'docs/help/compliance.md',
    routes: ['/compliance', '/documents'],
    summary: 'Compliance and evidence workspace for separating quote, order, dispatch, advisory, and mandatory requirements.',
    primaryQuestions: ['Is this a true blocker?', 'What evidence should I upload?', 'Can this be advisory until dispatch?'],
    commonBlockers: ['Mandatory rule open', 'Stage unclear', 'Evidence pending or expired', 'Advisory document treated as quote blocker', 'Waiver missing reason'],
    dataSources: ['documents', 'document_requirement_rules', 'lead_compliance_items', 'compliance_checklist_items', 'leads', 'quotes', 'orders', 'products', 'countries'],
    allowedActions: ['Explain blocker stage', 'Suggest evidence types', 'Route to Compliance Assist', 'Recommend live research'],
    approvalRequiredActions: ['approve evidence', 'waive requirement', 'clear compliance', 'delete document', 'change compliance policy'],
    suggestedPrompts: ['Is this a mandatory blocker or advisory?', 'What evidence should I upload?', 'Research requirements for this product and country.'],
    liveSearchModes: ['page_help', 'quote_compliance', 'document_requirements', 'hsn_enrichment'],
  },
  {
    routeKey: 'trade-events',
    title: 'Trade events',
    helpTopicId: 'trade-events',
    helpFile: 'docs/help/trade-events.md',
    routes: ['/trade-events', '/capture'],
    summary: 'Event capture workflow for collecting, cleaning, and converting trade show contacts into leads.',
    primaryQuestions: ['Is this capture ready to convert?', 'What fields are missing?', 'What follow-up should I set?'],
    commonBlockers: ['Missing contact data', 'Low-confidence scan field', 'Possible duplicate', 'No lead type', 'No product interest'],
    dataSources: ['trade_events', 'captured_contacts', 'leads', 'product_interests'],
    allowedActions: ['Suggest cleanup', 'Explain conversion readiness', 'Route to Leads', 'Draft follow-up note'],
    approvalRequiredActions: ['convert questionable capture', 'overwrite existing lead', 'seed fake data', 'delete capture'],
    suggestedPrompts: ['Is this event capture ready to convert?', 'What field should I clean first?', 'Draft a follow-up note for this buyer.'],
    liveSearchModes: ['page_help', 'lead_search', 'buyer_search', 'supplier_search'],
  },
  {
    routeKey: 'admin-organization',
    title: 'Admin organization',
    helpTopicId: 'admin-organization',
    helpFile: 'docs/help/admin-organization.md',
    routes: ['/admin', '/settings/lists'],
    summary: 'Governance workspace for organization profile, defaults, roles, and setup policies.',
    primaryQuestions: ['What setup is missing?', 'Which defaults affect quotes?', 'Which actions require owner/admin approval?'],
    commonBlockers: ['Missing country or currency', 'Pricing defaults missing', 'Compliance stages unclear', 'Roles do not match permissions', 'Help text looks like data'],
    dataSources: ['organizations', 'countries', 'markets', 'pricing_rules', 'organization_members', 'document_requirement_rules', 'audit_logs'],
    allowedActions: ['Explain setup gaps', 'Route to profile, pricing, compliance, or people access', 'Summarize approval boundaries'],
    approvalRequiredActions: ['change roles', 'change compliance policy', 'save organization defaults', 'save pricing defaults', 'delete records'],
    suggestedPrompts: ['What setup is missing before quoting?', 'Which defaults affect catalog pricing?', 'Who can approve this action?'],
    liveSearchModes: ['page_help', 'pricing_defaults', 'document_requirements'],
  },
  {
    routeKey: 'pricing-calculator',
    title: 'Pricing calculator',
    helpTopicId: 'pricing-calculator',
    helpFile: 'docs/help/pricing-calculator.md',
    routes: ['/products', '/quotes', '/admin/product-management'],
    summary: 'Pricing hierarchy and landed-cost guidance for organization, category, product, and quote-only assumptions.',
    primaryQuestions: ['Which default is this using?', 'Should this be quote-only?', 'Does this need approval?'],
    commonBlockers: ['Missing base cost', 'Default conflict', 'Stale product override', 'Currency confusion', 'Unapproved write-back'],
    dataSources: ['pricing_calculator_default_rules', 'categories', 'products', 'quote_lines', 'fx_reference', 'approval_rules'],
    allowedActions: ['Explain pricing hierarchy', 'Suggest draft assumptions', 'Route to pricing review', 'Flag likely approval'],
    approvalRequiredActions: ['save pricing defaults', 'approve margin', 'send quote', 'rewrite product pricing'],
    suggestedPrompts: ['Which pricing default is active?', 'Should this be quote-only?', 'Suggest draft pricing defaults for review.'],
    liveSearchModes: ['page_help', 'pricing_defaults', 'margin_benchmark'],
  },
  {
    routeKey: 'setu-guru',
    title: 'Setu Guru',
    helpTopicId: 'setu-guru',
    helpFile: 'docs/help/setu-guru.md',
    routes: ['/setu-guru'],
    summary: 'Assistant policy for contextual answers, live organization search, live research, and approval boundaries.',
    primaryQuestions: ['What can Setu Guru do here?', 'Which source should it use?', 'What needs human approval?'],
    commonBlockers: ['Generic answer despite page context', 'Live data not searched', 'No source-backed research', 'Approval boundary unclear'],
    dataSources: ['page_context', 'help_registry', 'organization_search', 'live_research', 'role_permissions'],
    allowedActions: ['Answer from route help first', 'Use live org data', 'Use live research with sources', 'Draft recommendations'],
    approvalRequiredActions: ['write back', 'send', 'waive', 'approve', 'delete', 'clear compliance', 'make pricing decisions'],
    suggestedPrompts: ['What can you help with on this page?', 'What data source should you check?', 'What needs human approval?'],
    liveSearchModes: ['page_help', 'catalog_search', 'lead_search', 'quote_compliance', 'document_requirements', 'margin_benchmark'],
  },
];

export function getSetuGuruPageContext(pathname: string) {
  const match = SETU_GURU_PAGE_CONTEXTS.find((context) => context.routes.some((route) => routeMatchesSetuGuruPath(pathname, route)));
  return match ?? SETU_GURU_PAGE_CONTEXTS[0];
}

export function collectSetuGuruPageContext() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const fallback = getSetuGuruPageContext('/dashboard');
    return { ...fallback, route: '/dashboard', pageText: '' };
  }

  const route = `${window.location.pathname}${window.location.search}`;
  const context = getSetuGuruPageContext(route);
  return {
    ...context,
    route,
    pageText: document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 6000) ?? '',
  };
}
