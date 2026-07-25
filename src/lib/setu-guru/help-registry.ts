import { SETU_GURU_PAGE_CONTEXTS, getSetuGuruPageContext, routeMatchesSetuGuruPath, type SetuGuruPageContext, type SetuGuruRouteKey } from './page-context';

export const SETU_GURU_ROUTE_HELP_DOCS = [
  'docs/help/dashboard.md',
  'docs/help/leads.md',
  'docs/help/products.md',
  'docs/help/quotes.md',
  'docs/help/orders.md',
  'docs/help/compliance.md',
  'docs/help/trade-events.md',
  'docs/help/admin-organization.md',
  'docs/help/pricing-calculator.md',
  'docs/help/setu-guru.md',
  'docs/help/growth-agent.md',
  'docs/setu-guru/SETU_GURU_PACKAGING_INTELLIGENCE.md',
  'docs/packaging/SPRINT_50_PACKAGING_INTELLIGENCE.md',
] as const;

export type SetuGuruHelpTopic = {
  id: string;
  slug: string;
  title: string;
  routeKeys: SetuGuruRouteKey[];
  routes: string[];
  helpFile: string;
  tags: string[];
  summary: string;
  answer: string[];
  commonBlockers: string[];
  dataSources: string[];
  allowedActions: string[];
  approvalRules: string[];
  actions: string[];
};

type TopicSeed = Partial<SetuGuruHelpTopic> & Pick<SetuGuruHelpTopic, 'id' | 'slug' | 'title' | 'tags' | 'summary' | 'answer' | 'approvalRules' | 'actions'>;

function topicFromContext(routeKey: SetuGuruRouteKey, seed: TopicSeed): SetuGuruHelpTopic {
  const context = SETU_GURU_PAGE_CONTEXTS.find((item) => item.routeKey === routeKey) ?? SETU_GURU_PAGE_CONTEXTS[0];
  return { routeKeys: [routeKey], routes: context.routes, helpFile: context.helpFile, commonBlockers: context.commonBlockers, dataSources: context.dataSources, allowedActions: context.allowedActions, ...seed };
}

const PACKAGING_APPROVAL = ['Humans approve pricing/template changes, quote send, artwork/proof approval, compliance decisions, production-stage movement, packing, and dispatch. Setu Guru remains read-only and advisory.'];
const PACKAGING_DOC = 'docs/setu-guru/SETU_GURU_PACKAGING_INTELLIGENCE.md';

export const SETU_GURU_HELP_TOPICS: SetuGuruHelpTopic[] = [
  topicFromContext('packaging-design', { id: 'packaging-design', slug: 'packaging-design', title: 'Packaging Design Queue help', helpFile: PACKAGING_DOC, tags: ['packaging', 'design queue', 'artwork', 'proof', 'customer provided', 'design team', 'approval', 'revision'], summary: 'Use Design Queue to ensure every accepted Packaging production line has customer-provided final artwork or an approved Design Team proof.', answer: ['Customer-provided final artwork is design-ready unless rejected.', 'Design Team work is not final until the latest proof version is approved; a rejected proof requires a new version.', 'Pre-Press may resolve artwork, but Printing and later stages require final design evidence.'], approvalRules: PACKAGING_APPROVAL, actions: ['Open Design Queue', 'Check artwork status', 'Check proof status', 'Open Dispatch Board'] }),
  topicFromContext('packaging-dispatch', { id: 'packaging-dispatch', slug: 'packaging-dispatch', title: 'Packaging Production and Dispatch help', helpFile: PACKAGING_DOC, tags: ['packaging', 'dispatch board', 'pre press', 'printing', 'converting', 'finishing', 'qc', 'packed', 'dispatched'], summary: 'Use Dispatch Board to manage Packaging production stages and explain the exact blocker before an operator advances work.', answer: ['Confirm the accepted quote line, order, customer, latest design evidence, and current production stage all match.', 'Stages progress through Pre-Press, Printing, Converting, Finishing, QC, Packed, and Dispatched.', 'Setu Guru may explain stage age and blockers but must not advance production, approve QC, pack, or dispatch.'], approvalRules: PACKAGING_APPROVAL, actions: ['Open Dispatch Board', 'Open Design Queue', 'Open Orders', 'Check production readiness'] }),
  topicFromContext('packaging-proof', { id: 'packaging-proof', slug: 'packaging-proof', title: 'Packaging proof approval help', helpFile: PACKAGING_DOC, tags: ['packaging', 'proof approval', 'approve artwork', 'reject proof', 'revision', 'version'], summary: 'Use the proof approval page to review one exact Design Team proof version and explicitly approve or reject it.', answer: ['Verify the customer, quote line, file, and proof version before deciding.', 'Approval makes the latest Design Team proof eligible for production release; rejection requires a review comment and a new version.', 'An expired or already-used approval token must not silently review another version.'], approvalRules: ['The customer or authorized reviewer must explicitly approve or reject the displayed proof.'], actions: ['Review proof', 'Return to Design Queue'] }),
  topicFromContext('packaging-history', { id: 'packaging-history', slug: 'packaging-history', title: 'Packaging history help', helpFile: PACKAGING_DOC, tags: ['packaging history', 'quote versions', 'proof versions', 'production events', 'repeat order'], summary: 'Use Packaging History to explain what was quoted, approved, produced, dispatched, and whether the customer is a repeat-order candidate.', answer: ['Keep accepted quote history immutable.', 'Compare specification, pricing, artwork/proof, production, and dispatch evidence by timestamp and version.', 'Recommend repeat-order follow-up only when prior order and timing evidence support it.'], approvalRules: PACKAGING_APPROVAL, actions: ['Open customer', 'Open quote', 'Open order', 'Review repeat-order opportunity'] }),
  topicFromContext('packaging-templates', { id: 'packaging-templates', slug: 'packaging-templates', title: 'Packaging pricing template help', helpFile: PACKAGING_DOC, tags: ['packaging template', 'dimensions', 'material rates', 'print process', 'finish', 'moq', 'setup', 'rush', 'waste', 'lead time'], summary: 'Use Packaging templates as the governed source for dimensional/service pricing, MOQ tiers, setup charges, rush, waste, and lead time.', answer: ['A sales-ready dimensional template needs dimension ranges, material rates, print rules, quantity tiers, setup/pre-press handling, and standard lead time.', 'Explain cost drivers from configured template evidence; do not invent market prices or margins.', 'Show a lower-MOQ or different-process alternative only when an active organization template supports it.'], approvalRules: PACKAGING_APPROVAL, actions: ['Open Packaging Templates', 'Check template health', 'Explain cost drivers', 'Review MOQ alternatives'] }),
  topicFromContext('packaging-families', { id: 'packaging-families', slug: 'packaging-families', title: 'Packaging family help', helpFile: PACKAGING_DOC, tags: ['packaging family', 'pouch', 'label', 'shrink sleeve', 'rollstock', 'sachet', 'packshot', 'prepress', 'variable data'], summary: 'Use Packaging families to identify the format and required quote-time specifications before pricing.', answer: ['Collect packed product, fill, format, dimensions, structure/barrier, print, finish, closures, artwork, designs, quantity, destination, and launch timing.', 'A family match is advisory until the operator confirms the technical use case.', 'Do not force dimensional inputs for a service-based family such as packshot or pre-press.'], approvalRules: PACKAGING_APPROVAL, actions: ['Open Packaging Families', 'Review inquiry', 'Open Quote Builder'] }),
  topicFromContext('packaging-academy', { id: 'packaging-academy', slug: 'packaging-academy', title: 'Packaging Academy help', helpFile: 'docs/packaging/SPRINT_50_PACKAGING_INTELLIGENCE.md', tags: ['academy', 'packaging training', 'test step', 'click guide', 'qa'], summary: 'Use Packaging Academy as the click-by-click training and production-test journey from capture through order, design, production, dispatch, catalog, tasks, events, and admin.', answer: ['Run the visible click path instead of deep-linking around gaps.', 'Record the actual route, expected result, observed result, and evidence for every failure.', 'Academy, route help, and Setu Guru must use the same canonical Packaging journey and approval boundaries.'], approvalRules: ['A human tester records pass/fail and confirms production behavior.'], actions: ['Open Packaging Academy', 'Open tested route', 'Review issue tracker'] }),
  topicFromContext('dashboard', { id: 'dashboard', slug: 'dashboard', title: 'Dashboard help', tags: ['dashboard', 'overview', 'queue', 'market', 'country', 'blocker', 'next action'], summary: 'Use Dashboard to understand queue health, market health, and what needs intervention now.', answer: ['Start with visible queue, market, country, and blocker signals.', 'Open the specific Follow-up, Quote, Approval, Order, Design, Dispatch, or Admin route that owns the blocker.', 'Check live organization context before answering about compliance, pricing, sends, artwork, or execution.'], approvalRules: ['Humans approve sends, waivers, write-backs, pricing changes, and execution changes.'], actions: ['Open Leads', 'Open Quotes', 'Open Orders', 'Review organization profile'] }),
  topicFromContext('leads', { id: 'leads', slug: 'leads', title: 'Follow-up help', tags: ['lead', 'buyer', 'supplier', 'follow up', 'qualification', 'quote prep', 'next action', 'packaging inquiry'], summary: 'Use Follow-up to qualify the record, map product or Packaging interest, and resolve quote blockers.', answer: ['Identify the active lead, type, country, product/use case, next step, and linked quote.', 'For Packaging, collect family, specifications, quantity, artwork, destination, launch timing, and required services before quoting.', 'Advisory dispatch documents should not be treated as quote-send blockers unless an active rule makes them mandatory.'], approvalRules: ['Humans approve quote send, price deviation, compliance waivers, deletion, and write-back.'], actions: ['Open Leads', 'Check this quote blocker', 'Open compliance'] }),
  topicFromContext('pipeline', { id: 'pipeline', slug: 'pipeline', title: 'Pipeline help', tags: ['pipeline', 'kanban', 'stage', 'deal value', 'risk', 'quote ready', 'leads'], summary: 'Use Pipeline to manage stage movement, value, blockers, and follow-up pressure.', answer: ['Pipeline manages deal stage and momentum; Leads manages contact, qualification, and profile detail.', 'Use density controls to review larger pipelines.', 'Confirm readiness and blockers before stage movement.'], approvalRules: ['Humans approve stage moves, quote conversion, pricing, compliance, and sends.'], actions: ['Open Leads', 'Open Quotes', 'Check blockers'] }),
  topicFromContext('products', { id: 'products', slug: 'products', title: 'Products help', tags: ['product', 'catalog', 'hsn', 'hs code', 'pricing', 'variant', 'packaging family', 'template'], summary: 'Use Products as the operating catalog and source of quote-ready product or service defaults.', answer: ['Separate product defaults, category defaults, organization defaults, Packaging templates, and quote-only adjustments.', 'For Packaging, verify family, pricing mode, enabled capabilities, template linkage, currency, and artwork requirement.', 'Use live research for unstable tariff, regulatory, and benchmark questions.'], approvalRules: ['Humans approve catalog/default changes, Packaging template changes, compliance decisions, and quote sends.'], actions: ['Open Products', 'Check catalog readiness', 'Open Product Management', 'Ask live research'] }),
  topicFromContext('quotes', { id: 'quotes', slug: 'quotes', title: 'Quotes help', tags: ['quote', 'quote builder', 'approval', 'send', 'currency', 'incoterm', 'pdf', 'packaging specification', 'moq'], summary: 'Use Quotes to assemble commercial lines, verify Packaging readiness, approve, and send only when blockers are resolved.', answer: ['Check terms, lines, currency, approval, and send readiness.', 'Packaging lines also require correct family/template, specifications, MOQ handling, artwork status, setup/pre-press, freight expectation, and lead time.', 'Quote-only changes must not rewrite catalog or template defaults.'], approvalRules: ['Humans approve quote send, price deviation, compliance waivers, and write-back.'], actions: ['Open Quotes', 'Open compliance', 'Check Packaging quote readiness'] }),
  topicFromContext('orders', { id: 'orders', slug: 'orders', title: 'Orders help', tags: ['order', 'execution cockpit', 'actual lines', 'buyer doc', 'packing', 'freight queue', 'finance queue', 'final invoice', 'closeout', 'packaging design'], summary: 'Use Orders after quote acceptance to manage actual lines, documents, packing, freight, processing, dispatch, finance, and closeout.', answer: ['Orders is the canonical accepted-quote execution record.', 'Packaging orders coordinate with Design Queue and Dispatch Board, but accepted quote history remains immutable.', 'Pending adapter states are not proof of live provider delivery, booking, sync, or payment.'], approvalRules: ['Humans approve actual lines, documents, design/proofs, packing, freight, dispatch, finance/payment, and closeout.'], actions: ['Open Orders', 'Check order blockers', 'Open Design Queue', 'Open Dispatch Board'] }),
  topicFromContext('compliance', { id: 'compliance', slug: 'compliance', title: 'Compliance and document help', tags: ['compliance', 'document', 'evidence', 'certificate', 'food contact', 'migration', 'ink', 'adhesive', 'recyclability'], summary: 'Use Compliance to distinguish mandatory blockers, advisory evidence, current legal research, and human decisions.', answer: ['Packaging evidence can include material declarations, food-contact/migration, ink/adhesive, restricted substances, recycled content, claims, EPR, FSC/PEFC, compatibility, tamper evidence, and variable-data verification.', 'Use current official sources for changing legal requirements.', 'Setu Guru may suggest evidence but cannot approve, waive, or clear compliance.'], approvalRules: ['Humans approve evidence, waivers, compliance clearing, deletes, and policy changes.'], actions: ['Open compliance', 'Open lead documents', 'Ask live research'] }),
  topicFromContext('trade-events', { id: 'trade-events', slug: 'trade-events', title: 'Trade event capture help', tags: ['trade event', 'capture', 'scan', 'business card', 'convert lead', 'event'], summary: 'Use Trade Events to capture, clean, and convert contacts into follow-up leads.', answer: ['Capture company, contact, channels, country, lead type, and product or Packaging interest.', 'Check duplicates and scan confidence.', 'Converted records should land in Follow-up with a clear next action.'], approvalRules: ['Humans approve questionable conversions, duplicate merges, overwrites, deletes, and fake-data seeding.'], actions: ['Open Leads', 'Check blockers'] }),
  topicFromContext('admin-organization', { id: 'admin-organization', slug: 'admin-organization', title: 'Organization setup help', tags: ['admin', 'organization', 'setup', 'currency', 'country', 'roles', 'markets', 'defaults'], summary: 'Use Admin Organization for governance, setup, roles, defaults, and policy.', answer: ['Setup covers company profile, country/currency, markets, terms, pricing, compliance, users, roles, and Packaging vertical configuration.', 'Daily work belongs in operating workspaces; Admin is for governed setup.', 'Role, policy, pricing, and template changes require owner/admin review.'], approvalRules: ['Owners/admins approve roles, policy, defaults, pricing, templates, and destructive changes.'], actions: ['Review organization profile', 'Open Product Management', 'Open compliance'] }),
  topicFromContext('pricing-calculator', { id: 'pricing-calculator', slug: 'pricing-calculator', title: 'Pricing calculator help', routeKeys: ['pricing-calculator', 'products', 'quotes', 'admin-organization', 'packaging-templates'], tags: ['pricing calculator', 'margin', 'freight', 'fx', 'quote-only', 'packaging cost driver'], summary: 'Use pricing help to explain default hierarchy and Packaging template cost drivers.', answer: ['Explain organization, category, product/template, then quote-only adjustment.', 'Packaging cost explanations must use configured material, process, setup, finish, waste, MOQ/tier, rush, freight, and lead-time evidence.', 'Humans approve saved defaults and commercial decisions.'], approvalRules: ['Humans approve defaults, template changes, margins, quote sends, and write-backs.'], actions: ['Open Product Management', 'Open Packaging Templates', 'Open Products', 'Ask live research'] }),
  topicFromContext('trial', { id: 'trial', slug: 'trial', title: 'Guided trial workspace help', routeKeys: ['trial', 'leads', 'quotes', 'orders', 'products', 'pricing-calculator', 'packaging-design', 'packaging-dispatch'], tags: ['trial', 'guided trial', 'packaging converter', 'dimensional pricing', 'two lead'], summary: 'Use Guided Trial to validate a controlled Packaging capture-to-dispatch flow before conversion.', answer: ['Guided trials are intentionally capped according to entitlement.', 'Validate Packaging products, templates, quote pricing, accepted order, artwork/proof, production, and dispatch.', 'Humans approve conversion, pricing, sends, proof decisions, production, and dispatch.'], approvalRules: PACKAGING_APPROVAL, actions: ['Open Guided Trial', 'Open Products', 'Open Leads', 'Open Design Queue', 'Open Dispatch Board'] }),
  topicFromContext('setu-guru', { id: 'setu-guru', slug: 'setu-guru', title: 'Setu Guru response policy help', routeKeys: ['setu-guru', 'dashboard', 'leads', 'pipeline', 'products', 'quotes', 'orders', 'compliance', 'packaging-design', 'packaging-dispatch', 'packaging-templates'], tags: ['setu guru', 'help', 'policy', 'approval', 'live search', 'packaging intelligence'], summary: 'Use Setu Guru policy to choose the right source and preserve human approval boundaries.', answer: ['Answer in this order: route context, live organization data, route help, current research when required, then generic guidance.', 'Packaging questions must use Packaging organization data and the canonical Packaging journey.', 'Never approve, send, waive, write back, price, or advance execution automatically.'], approvalRules: ['Human approval is required for write-back, send, waive, approve, delete, pricing, proof, production, dispatch, and compliance decisions.'], actions: ['Ask live research', 'Review sources', 'Check blockers'] }),
  topicFromContext('pipeline', { id: 'supplier-mode', slug: 'supplier-mode', title: 'Supplier Mode help', routeKeys: ['pipeline', 'leads', 'compliance', 'orders'], tags: ['supplier', 'supplier mode', 'supplier compliance', 'rfq', 'offer comparison'], summary: 'Use Supplier Mode for the supplier-side lead, compliance, RFQ, comparison, approval, and performance journey.', answer: ['Buyer and supplier records share core tables but are scoped by lead_type.', 'Supplier compliance and approval remain distinct from buyer quote approval.', 'RFQ/cost request is the primary supplier commercial action.'], approvalRules: ['Humans approve supplier state, compliance waivers, RFQ sends, and write-back.'], actions: ['Open Leads', 'Open Pipeline suppliers view', 'Check supplier compliance', 'Review supplier offer comparison'] }),
  topicFromContext('growth-agent', { id: 'growth-agent', slug: 'growth-agent', title: 'Growth Center help', routeKeys: ['growth-agent', 'dashboard', 'leads', 'pipeline', 'products', 'quotes', 'orders', 'compliance', 'trade-events', 'packaging-design', 'packaging-dispatch', 'packaging-templates'], tags: ['growth center', 'today workspace', 'revenue', 'supplier', 'opportunity', 'pricing intelligence', 'packaging operations', 'artwork', 'proof', 'production', 'dispatch', 'repeat order'], summary: 'Use Growth Center as the prioritized command center for revenue, suppliers, research, trade events, pricing, and Packaging Operations.', answer: ['Packaging Operations covers quote readiness, artwork/proofs, production, dispatch, template health, repeat orders, and cross-sell.', 'Recommendations reuse live organization records and remain advisory.', 'Nothing is sent, approved, priced, converted, or advanced automatically.'], approvalRules: ['Humans approve every send, price/template change, proof decision, supplier/compliance/quote state, production stage, dispatch, and conversion.'], actions: ['Open Growth Center', 'Open Packaging Operations', 'Open Design Queue', 'Open Dispatch Board', 'Check Pricing Intelligence'] }),
];

function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
export function getHelpTopicById(id: string) { return SETU_GURU_HELP_TOPICS.find((topic) => topic.id === id || topic.slug === id) ?? null; }
export function getSetuGuruRouteTopics(pathname: string) {
  const pageContext = getSetuGuruPageContext(pathname);
  const matches = SETU_GURU_HELP_TOPICS.filter((topic) => topic.routeKeys.includes(pageContext.routeKey) || topic.routes.some((route) => routeMatchesSetuGuruPath(pathname, route)));
  return matches.length ? matches : SETU_GURU_HELP_TOPICS;
}
export const getHelpTopicsForPath = getSetuGuruRouteTopics;

export function getBestSetuGuruHelpTopic(question: string, pathname: string) {
  const routeTopics = getSetuGuruRouteTopics(pathname);
  const q = normalize(question);
  if (!q) return routeTopics[0] ?? SETU_GURU_HELP_TOPICS[0];
  const WORKFLOW_KEYWORDS: Record<string, string[]> = {
    quotes: ['quote', 'quotation', 'quote approval', 'send quote', 'quote builder', 'quote lifecycle'],
    orders: ['order', 'fulfillment', 'freight', 'packing', 'shipment', 'invoice', 'finance queue'],
    leads: ['lead', 'follow up', 'pipeline stage', 'inquiry', 'qualification'],
    compliance: ['compliance', 'certificate', 'coa', 'waiver', 'migration', 'food contact'],
    products: ['hsn', 'hs code', 'sku', 'variant', 'pricing rule'],
    trial: ['trial', 'guided trial', 'packaging converter', 'dimensional pricing', 'two lead'],
    'packaging-design': ['artwork', 'design queue', 'proof', 'prepress', 'pre press', 'dieline', 'revision'],
    'packaging-dispatch': ['dispatch board', 'printing', 'converting', 'finishing', 'qc', 'packed', 'production stage'],
    'packaging-templates': ['packaging template', 'moq', 'material rate', 'print process', 'cost driver', 'quantity tier'],
    'packaging-families': ['pouch', 'label', 'shrink sleeve', 'rollstock', 'roll stock', 'sachet', 'packshot', 'variable data'],
    'packaging-academy': ['academy', 'test step', 'training guide'],
  };
  const currentRouteKey = getSetuGuruPageContext(pathname).routeKey;
  const questionMentionsOtherWorkflow = Object.entries(WORKFLOW_KEYWORDS).some(([key, words]) => {
    if (currentRouteKey === key) return false;
    return words.some((word) => q.includes(normalize(word)));
  });
  const ranked = SETU_GURU_HELP_TOPICS.map((topic) => {
    const isCurrentRouteMatch = routeTopics.some((routeTopic) => routeTopic.id === topic.id);
    const routeScore = isCurrentRouteMatch && !questionMentionsOtherWorkflow ? 4 : 0;
    const haystack = normalize([topic.title, topic.summary, ...topic.tags, ...topic.answer, ...topic.commonBlockers, ...topic.dataSources, ...topic.allowedActions].join(' '));
    const wordScore = q.split(/\s+/).filter(Boolean).reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
    return { topic, score: routeScore + wordScore };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.topic ?? routeTopics[0] ?? SETU_GURU_HELP_TOPICS[0];
}

export const getBestHelpTopic = getBestSetuGuruHelpTopic;
export function getSetuGuruActionHref(action: string) {
  const normalized = normalize(action);
  if (normalized.includes('packaging operations') || normalized.includes('growth center')) return '/growth-agent';
  if (normalized.includes('design queue') || normalized.includes('artwork') || normalized.includes('proof status')) return '/design-queue';
  if (normalized.includes('dispatch board') || normalized.includes('production readiness')) return '/dispatch-board';
  if (normalized.includes('packaging template') || normalized.includes('template health') || normalized.includes('moq alternative') || normalized.includes('cost driver')) return '/admin/packaging-templates';
  if (normalized.includes('packaging famil')) return '/admin/packaging-families';
  if (normalized.includes('packaging academy')) return '/academy';
  if (normalized.includes('revenue workspace')) return '/growth-agent?workspace=revenue';
  if (normalized.includes('supplier workspace')) return '/growth-agent?workspace=suppliers';
  if (normalized.includes('pricing intelligence')) return '/products?mode=pricing';
  if (normalized.includes('suggested price list')) return '/growth-agent?workspace=pricing';
  if (normalized.includes('lead smart action')) return '/leads';
  if (normalized.includes('guided trial')) return '/trial';
  if (normalized.includes('catalog readiness')) return '/products?gap=has_gap';
  if (normalized.includes('dispatch evidence') || normalized.includes('lead document')) return '/documents';
  if (normalized.includes('compliance')) return '/compliance';
  if (normalized.includes('product management')) return '/admin/product-management';
  if (normalized.includes('open products')) return '/products';
  if (normalized.includes('organization')) return '/admin/organization#company-profile';
  if (normalized.includes('open leads')) return '/leads';
  if (normalized.includes('order')) return '/orders';
  if (normalized.includes('quote')) return '/quotes';
  if (normalized.includes('approval') || normalized.includes('release')) return '/approval-send';
  if (normalized.includes('product')) return '/products';
  return null;
}
export function getRouteHelpSummary(pathname: string) {
  const context: SetuGuruPageContext = getSetuGuruPageContext(pathname);
  const topic = getHelpTopicById(context.helpTopicId) ?? getSetuGuruRouteTopics(pathname)[0];
  return { routeKey: context.routeKey, routeTitle: context.title, helpFile: topic.helpFile, summary: topic.summary, suggestedPrompts: context.suggestedPrompts, liveSearchModes: context.liveSearchModes, approvalRequiredActions: context.approvalRequiredActions };
}
