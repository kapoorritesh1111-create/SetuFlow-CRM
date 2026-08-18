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
  | 'packaging-reference-library'
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

function makeContext(routeKey: SetuGuruRouteKey, title: string, routes: string[], summary: string, liveSearchModes: SetuGuruLiveSearchMode[], suggestedPrompts: string[], options: ContextOptions = {}): SetuGuruPageContext {
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

const PACKAGING_DATA = ['client_entitlement_profiles', 'packaging_service_families', 'packaging_pricing_templates', 'packaging_reference_library', 'quote_line_items', 'packaging_proofs', 'packaging_production_stage_events', 'orders', 'ai_recommendations'];
const PACKAGING_APPROVALS = ['Human approval is required for quote send, pricing changes, artwork/proof approval, production-stage advancement, dispatch, compliance waivers, and write-back.'];
const PACKAGING_DOC = 'docs/setu-guru/SETU_GURU_PACKAGING_INTELLIGENCE.md';

export const SETU_GURU_PAGE_CONTEXTS: SetuGuruPageContext[] = [
  makeContext('packaging-design', 'Packaging Design Queue', ['/design-queue'], 'Artwork and proof readiness for accepted Packaging work before production.', ['page_help', 'packaging_artwork_status', 'packaging_proof_status', 'packaging_design_queue', 'packaging_production_readiness'], ['Does this job need customer artwork or a Design Team proof?', 'Why can this job not move to Printing?', 'What happens after a proof is approved?', 'Which packaging jobs still need artwork?'], { helpFile: PACKAGING_DOC, commonBlockers: ['No artwork uploaded', 'Design Team proof pending customer approval', 'Proof rejected or revision required', 'Accepted quote line missing from Design Queue'], dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-dispatch', 'Packaging Dispatch Board', ['/dispatch-board'], 'Packaging production and dispatch from Pre-Press through Printing, Converting, Finishing, QC, Packed and Dispatched.', ['page_help', 'packaging_dispatch_status', 'packaging_production_readiness', 'packaging_artwork_status', 'packaging_proof_status'], ['Why is this packaging job blocked?', 'What must be complete before Printing?', 'What is ready for QC, packing or dispatch?', 'Which proof or artwork controls production release?'], { helpFile: PACKAGING_DOC, commonBlockers: ['Final design missing', 'Production stage overdue', 'QC incomplete', 'Packing or dispatch evidence missing', 'Order and production state misaligned'], dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-proof', 'Packaging Proof Approval', ['/packaging-proof', '/proof-approval'], 'External review of one exact Packaging Design Team proof version.', ['page_help', 'packaging_proof_status'], ['What am I approving?', 'What happens after approval?', 'How do I request a revision?'], { helpFile: PACKAGING_DOC, commonBlockers: ['Approval token expired', 'Proof already reviewed', 'Wrong proof version', 'Review comment missing for rejection'], dataSources: ['packaging_proofs', 'quote_line_items', 'quotes'], allowedActions: ['Explain proof and version', 'Explain approval outcome', 'Route back to Design Queue'], approvalRequiredActions: ['The customer or authorized reviewer must explicitly approve or reject the proof.'] }),
  makeContext('packaging-history', 'Packaging History', ['/packaging-history'], 'Packaging history across specifications, pricing, proofs, production, dispatch and repeat orders.', ['page_help', 'packaging_quote_readiness', 'packaging_artwork_status', 'packaging_dispatch_status'], ['What changed between versions?', 'What was approved?', 'Is this a repeat-order candidate?'], { helpFile: PACKAGING_DOC, dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-templates', 'Packaging Pricing Templates', ['/admin/packaging-templates'], 'Rules that calculate packaging prices from dimensions, material rates, print, finishes, MOQ, setup, rush, waste and lead time.', ['page_help', 'packaging_template_search', 'packaging_moq_alternatives', 'packaging_cost_driver_explanation', 'pricing_defaults'], ['How is this pouch price calculated?', 'How do I enter a material rate per m²?', 'Should this finish be per pouch or per m²?', 'Why did the preview price change?', 'What is missing before I activate this template?'], { helpFile: PACKAGING_DOC, commonBlockers: ['Material rates missing', 'Dimension ranges incomplete', 'Print rules missing', 'MOQ tiers missing', 'Setup/pre-press charges missing', 'Lead time missing'], dataSources: PACKAGING_DATA, approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-families', 'Packaging Service Families', ['/admin/packaging-families'], 'Buyer-facing packaging families and quote-time inputs linked to pricing templates.', ['page_help', 'packaging_family_search', 'packaging_specification_review'], ['What should I create as a Service Family?', 'Which quote-time inputs belong on this family?', 'Why does the family need a pricing template?', 'When should the default unit be PCS?'], { helpFile: PACKAGING_DOC, commonBlockers: ['Family inactive', 'Quote-time inputs incomplete', 'Pricing template not linked', 'Default lead time missing'], dataSources: ['packaging_service_families', 'packaging_pricing_templates'], approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-reference-library', 'Packaging Reference Library', ['/admin/packaging-reference-library'], 'Shared organization names for materials, finishes and service items used by Packaging Pricing Templates.', ['page_help', 'packaging_material_guidance', 'packaging_template_search'], ['Why should I add a material here first?', 'What belongs in Materials vs Finishes vs Service Items?', 'Does the Reference Library set the price?', 'Why should names be standardized across templates?'], { helpFile: PACKAGING_DOC, commonBlockers: ['Duplicate or inconsistent material names', 'Finish name missing', 'Service item name missing', 'Inactive reference item'], dataSources: ['packaging_reference_library', 'packaging_pricing_templates'], approvalRequiredActions: PACKAGING_APPROVALS }),
  makeContext('packaging-academy', 'Packaging Academy', ['/academy', '/guides/setu_flow_packaging_workspace_guide.html'], 'Packaging training journey from capture through quote, order, design, production and dispatch.', ['page_help'], ['What should I test next?', 'Which step failed?', 'Which route owns this issue?'], { helpFile: 'docs/packaging/SPRINT_50_PACKAGING_INTELLIGENCE.md', commonBlockers: ['Step not tested', 'Production retest required', 'Route or expected result unclear'], dataSources: ['packaging_test_results', 'sprint_issues', 'academy_catalog'], allowedActions: ['Explain the current step', 'Route to the tested workspace', 'Record a reviewable issue'], approvalRequiredActions: ['A human tester records pass/fail and confirms production behavior.'] }),
  makeContext('dashboard', 'Dashboard', ['/dashboard'], 'Trade command center for queue health and next actions.', ['page_help', 'lead_search', 'quote_compliance', 'catalog_search', 'document_requirements'], ['What should I action today?', 'Which queues need attention?']),
  makeContext('leads', 'Leads', ['/leads'], 'Lead workspace for readiness, follow-up and quote preparation.', ['page_help', 'lead_search', 'quote_compliance', 'document_requirements', 'packaging_family_search', 'packaging_specification_review'], ['Can I quote this packaging inquiry now?', 'What packaging specifications are missing?', 'Which Packaging Service Family fits this inquiry?', 'What should I capture before opening Quote Builder?']),
  makeContext('pipeline', 'Pipeline', ['/pipeline'], 'Pipeline workspace for stage movement and commercial focus.', ['page_help', 'lead_search', 'quote_compliance', 'document_requirements'], ['Which packaging deals are ready to quote?', 'What is blocking this card?']),
  makeContext('products', 'Catalog', ['/products', '/catalog', '/admin/product-management', '/admin/categories'], 'Catalog workspace for standard products and buyer-facing Packaging Service Families.', ['page_help', 'catalog_search', 'pricing_defaults', 'hsn_enrichment', 'document_requirements', 'packaging_family_search', 'packaging_template_search'], ['How does the Packaging Catalog differ from Classic Product Catalog?', 'Which Service Family should sales choose?', 'Where does Packaging pricing come from?', 'What makes a Packaging family quote-ready?']),
  makeContext('quotes', 'Quote Builder', ['/quotes', '/approval-send', '/leads/*/quote'], 'Quote workspace that prices Packaging lines from the selected Service Family, Pricing Template and entered specifications.', ['page_help', 'quote_compliance', 'pricing_defaults', 'document_requirements', 'packaging_quote_readiness', 'packaging_moq_alternatives', 'packaging_cost_driver_explanation'], ['How was this packaging price calculated?', 'Why did Zipper or another add-on change the quote?', 'Why is this quantity below MOQ?', 'Which template is pricing this line?', 'What happens to this packaging line after quote acceptance?']),
  makeContext('orders', 'Orders', ['/orders'], 'Accepted quote execution and order follow-through.', ['page_help', 'quote_compliance', 'document_requirements', 'packaging_artwork_status', 'packaging_production_readiness', 'packaging_dispatch_status'], ['Which packaging order needs artwork?', 'Is this order ready for production?', 'What is blocking dispatch?']),
  makeContext('compliance', 'Compliance', ['/compliance', '/documents'], 'Compliance workspace for stage-specific document and evidence review.', ['page_help', 'quote_compliance', 'document_requirements', 'hsn_enrichment', 'packaging_material_guidance'], ['What packaging evidence is needed?', 'Is this a quote blocker or dispatch requirement?', 'What material declaration should I request?']),
  makeContext('trade-events', 'Trade Events', ['/trade-events', '/capture'], 'Capture packaging prospects at events and carry the packaging inquiry into Follow-up.', ['page_help', 'lead_search', 'buyer_search', 'supplier_search', 'packaging_family_search', 'packaging_specification_review'], ['What packaging details should I capture at the booth?', 'Which Service Family fits this prospect?', 'What should I ask before creating a quote?', 'How does this event contact reach Quote Builder?']),
  makeContext('admin-organization', 'Admin', ['/admin', '/settings/lists'], 'Organization setup and governance, including Packaging vertical configuration.', ['page_help', 'pricing_defaults', 'document_requirements', 'packaging_template_search', 'packaging_family_search'], ['What must be set up before Packaging quotes work?', 'What should the owner configure first?', 'Which packaging setup is still incomplete?', 'Who can change pricing rules?']),
  makeContext('pricing-calculator', 'Pricing calculator', ['/products', '/quotes', '/admin/product-management'], 'Pricing hierarchy and landed-cost guidance.', ['page_help', 'pricing_defaults', 'margin_benchmark', 'packaging_cost_driver_explanation'], ['Which pricing default is active?', 'Should this be quote-only?', 'What drives this Packaging price?']),
  makeContext('trial', 'Guided Trial', ['/trial'], 'Guided trial workspace for Packaging pricing onboarding.', ['page_help', 'pricing_defaults', 'catalog_search', 'packaging_quote_readiness'], ['How do I validate Packaging dimensional pricing?', 'How do I test a complete packaging quote?']),
  makeContext('setu-guru', 'Setu Guru', ['/setu-guru'], 'Assistant policy and source guidance.', ['page_help', 'catalog_search', 'lead_search', 'quote_compliance', 'document_requirements', 'margin_benchmark', 'packaging_family_search', 'packaging_template_search', 'packaging_quote_readiness', 'packaging_artwork_status', 'packaging_dispatch_status'], ['What Packaging work needs attention?', 'How is Packaging pricing calculated?', 'What source are you using?']),
  makeContext('growth-agent', 'Growth Center', ['/growth-agent'], 'Packaging Operations intelligence for quote readiness, pricing gaps, artwork/proofs, production, dispatch and repeat orders.', ['page_help', 'lead_search', 'buyer_search', 'supplier_search', 'quote_compliance', 'pricing_defaults', 'document_requirements', 'margin_benchmark', 'packaging_quote_readiness', 'packaging_design_queue', 'packaging_dispatch_status', 'packaging_template_search'], ['Which Packaging quotes are at risk and why?', 'Which pricing templates have setup gaps?', 'Which proofs or production jobs are blocked?', 'Which customers are ready for a repeat order?', 'What packaging cross-sell opportunity is supported by live data?']),
];

export function getSetuGuruPageContext(pathname: string) {
  const match = SETU_GURU_PAGE_CONTEXTS.find((item) => item.routes.some((route) => routeMatchesSetuGuruPath(pathname, route)));
  return match ?? SETU_GURU_PAGE_CONTEXTS[0];
}

let _liveWorkspaceState: SetuGuruPageContext['liveWorkspaceState'] = {};
export function setSetuGuruWorkspaceContext(state: SetuGuruPageContext['liveWorkspaceState']) { _liveWorkspaceState = { ..._liveWorkspaceState, ...state }; }
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
