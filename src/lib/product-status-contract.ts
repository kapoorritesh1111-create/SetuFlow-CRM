import { LOCKED_PRODUCT_FLOW, PRODUCT_ROUTES } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'in-progress' | 'next' | 'locked';

export type ReadinessArea = {
  title: string;
  summary: string;
  status: ChecklistStatus;
};

export type ChecklistItem = {
  id: string;
  area: string;
  label: string;
  note: string;
  status: ChecklistStatus;
};

export type RoadmapMilestone = {
  sprint: string;
  summary: string;
  badgeLabel: string;
  status: ChecklistStatus;
  objective: string;
  outcomes: string[];
};

export type BacklogItem = {
  title: string;
  note: string;
  stateLabel: string;
  status: ChecklistStatus;
};

export type BacklogSection = {
  title: string;
  heading: string;
  sprint: string;
  badgeLabel: string;
  summary: string;
  description: string;
  status: ChecklistStatus;
  items: BacklogItem[];
};

export type PlanningSurface = {
  id: string;
  title: string;
  href: string;
  summary: string;
  status: ChecklistStatus;
  focus: string;
};

export type ProductTrack = {
  id: string;
  title: string;
  summary: string;
  status: ChecklistStatus;
  scope: string[];
};

export type ArchitectureLane = {
  id: string;
  title: string;
  summary: string;
  status: ChecklistStatus;
  target: string;
};

export type UxRule = {
  id: string;
  title: string;
  rule: string;
  status: ChecklistStatus;
};

export type ScreenLayoutSection = {
  title: string;
  purpose: string;
  blocks: string[];
};

export type ScreenPlan = {
  id: string;
  title: string;
  route: string;
  summary: string;
  status: ChecklistStatus;
  primaryGoal: string;
  layout: ScreenLayoutSection[];
  actions: string[];
  dataContracts: string[];
};

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;

export const sprintProgress = {
  sprint: 'Approved rework',
  percent: 42,
  percentLabel: '42%',
};

export const sprintFocus = {
  sprint: 'Approved rework',
  title:
    'Keep the visible product aligned to Leads, Quotes, Orders, Dashboard, and Admin while turning promoted routes into truthful live operating areas.',
  nextAction:
    'Use the shared product and status contracts as the only owners of shell and planning truth, then close the remaining workflow-link, route-depth, and verification gaps in the current app-owned routes.',
  flow: LOCKED_PRODUCT_FLOW.join(' → '),
};

export const readinessSummary = {
  status: 'Approved rework active',
  buildStatus:
    'Shell and status contracts are aligned, but runtime proof and full production-build confidence still need to be revalidated in the current baseline.',
  driftRisk:
    'Lower than before because shell and status truth now live in shared contracts and Quotes/Orders now own app-route files, but drift still exists where remaining workflow links and support-surface handoffs lag the contracts.',
  blockers:
    'Quotes and Orders now own real app-route files, but the repo still needs remaining workflow-link cleanup, development-status truth refresh, and clean build verification in the current baseline.',
};

export const planningSurfaces: PlanningSurface[] = [
  {
    id: 'development-home',
    title: PRODUCT_ROUTES.development.home,
    href: PRODUCT_ROUTES.development.home,
    summary: 'Operating-system overview for approved rework state, flow discipline, and active planning entry points.',
    status: 'in-progress',
    focus: 'Keep the codebase speaking one approved-rework timeline instead of separate shell and sprint narratives.',
  },
  {
    id: 'master-plan',
    title: PRODUCT_ROUTES.development.masterPlan,
    href: PRODUCT_ROUTES.development.masterPlan,
    summary: 'Phased roadmap for shell alignment, quote and order depth, trust layers, and later maturity work.',
    status: 'in-progress',
    focus: 'Keep later work visible without pretending it is already active implementation.',
  },
  {
    id: 'readiness',
    title: PRODUCT_ROUTES.development.readiness,
    href: PRODUCT_ROUTES.development.readiness,
    summary: 'Readiness, build confidence, blockers, and anti-drift discipline for the approved rework.',
    status: 'in-progress',
    focus: 'Describe current implementation honestly: shell aligned, live depth transitional, runtime proof pending.',
  },
  {
    id: 'backlog',
    title: PRODUCT_ROUTES.development.backlog,
    href: PRODUCT_ROUTES.development.backlog,
    summary: 'Structured backlog grouped by active, next, and locked phases instead of legacy sprint language.',
    status: 'in-progress',
    focus: 'Keep active work narrow so route truth and runtime proof get finished before later expansion.',
  },
  {
    id: 'product',
    title: PRODUCT_ROUTES.development.product,
    href: PRODUCT_ROUTES.development.product,
    summary: 'Product story, module priorities, and buyer-facing clarity rules anchored to the locked flow.',
    status: 'done',
    focus: 'Preserve the Capture → Lead → Quote → Order commercial narrative.',
  },
  {
    id: 'architecture',
    title: PRODUCT_ROUTES.development.architecture,
    href: PRODUCT_ROUTES.development.architecture,
    summary: 'Target module boundaries, hidden services, and transition work needed to deepen the current app-owned routes into real operating domains.',
    status: 'in-progress',
    focus: 'Move complexity behind the workflow shell without reopening top-level sprawl.',
  },
  {
    id: 'ux-rules',
    title: PRODUCT_ROUTES.development.uxRules,
    href: PRODUCT_ROUTES.development.uxRules,
    summary: 'Rules for navigation clarity, approvals, locking, readiness, and enterprise trust cues.',
    status: 'done',
    focus: 'Prevent visual and workflow drift while the rework is still being stabilized.',
  },
  {
    id: 'screen-leads-capture',
    title: PRODUCT_ROUTES.development.screens,
    href: PRODUCT_ROUTES.development.screens,
    summary: 'Screen-layout planning for the intake wedge inside the Leads operating area.',
    status: 'in-progress',
    focus: 'Keep Capture inside Leads instead of letting it drift into a separate product area.',
  },
];

export const readinessAreas: ReadinessArea[] = [
  {
    title: 'Shared contract layer is in place',
    summary: 'Product shell truth and planning-status truth now live in shared lib contracts instead of being owned by page components.',
    status: 'done',
  },
  {
    title: 'Shell alignment is visible',
    summary: 'Workspace home, app shell, and development surfaces now reinforce the approved top-level shape: Leads, Quotes, Orders, Dashboard, and Admin.',
    status: 'done',
  },
  {
    title: 'Quotes and Orders are promoted and app-owned, but still transitional',
    summary: 'Live routes exist as app-owned files and are linked from the app shell, but they remain shallow/static and still need operational depth plus verification.',
    status: 'in-progress',
  },
  {
    title: 'Status language is now on the approved-rework timeline',
    summary: 'Readiness, roadmap, backlog, and planning language no longer claim a Sprint 1 / Sprint 2 state that conflicts with the rework contract.',
    status: 'done',
  },
  {
    title: 'Runtime and production-build proof',
    summary: 'The next credibility gate is clean build and route behavior verification in the current repo after the status and shell alignment changes.',
    status: 'next',
  },
];

export const checklistItems: ChecklistItem[] = [
  {
    id: 'flow-lock',
    area: 'Product flow',
    label: 'Capture → Lead → Quote → Order remains locked',
    note: 'No planning or implementation change should redesign this operating sequence.',
    status: 'done',
  },
  {
    id: 'shared-product-contract',
    area: 'Anti-drift structure',
    label: 'Visible shell truth lives in product-contract.ts',
    note: 'Top-level labels, routes, hidden modules, and shell guardrails are imported rather than rewritten inline.',
    status: 'done',
  },
  {
    id: 'shared-status-contract',
    area: 'Anti-drift structure',
    label: 'Planning and readiness truth lives in product-status-contract.ts',
    note: 'development-status.ts is now a compatibility pass-through instead of owning its own timeline.',
    status: 'done',
  },
  {
    id: 'workspace-shell',
    area: 'Visible product shape',
    label: 'Workspace and development surfaces reflect the approved rework',
    note: 'The workspace shell, development pages, and route framing now reinforce the same product story.',
    status: 'done',
  },
  {
    id: 'promoted-routes',
    area: 'Live app structure',
    label: 'Quotes and Orders exist as first-class authenticated routes',
    note: 'Route promotion is complete and app-owned files are in place, but the routes are still transitional because they remain shallow/static and need verification.',
    status: 'in-progress',
  },
  {
    id: 'support-surfaces',
    area: 'Navigation discipline',
    label: 'Support modules remain subordinate to the primary workflow',
    note: 'Pipeline, products, documents, contracts, compliance, trade events, tasks, integrations, AI assist, and standalone contact exchange must stay demoted.',
    status: 'done',
  },
  {
    id: 'route-depth',
    area: 'Implementation truth',
    label: 'Deepen Quotes and Orders beyond route promotion with route-native operational truth',
    note: 'The app must keep route ownership truthful while operational depth and verification catch up.',
    status: 'next',
  },
  {
    id: 'build-verification',
    area: 'Validation',
    label: 'Re-run clean build and runtime verification after contract alignment',
    note: 'Do not claim release credibility until production build and route behavior are confirmed in the current baseline.',
    status: 'next',
  },
];

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    sprint: 'Phase 1 · Shell alignment',
    summary: 'Lock the visible product shell to the approved rework and stop shell drift across workspace, live app, and development surfaces.',
    badgeLabel: 'Done',
    status: 'done',
    objective: 'Make the product look like one coherent workflow-first system.',
    outcomes: [
      'Shared product contract defines primary app routes, workspace preview routes, and navigation guardrails.',
      'Shared status contract defines readiness, roadmap, backlog, and planning language.',
      'Leads, Quotes, Orders, Dashboard, and Admin are the visible top-level story instead of module sprawl.',
    ],
  },
  {
    sprint: 'Phase 2 · Quote and Order route promotion',
    summary: 'Keep Quotes and Orders truthful as authenticated app routes while closing the remaining operational-depth and verification gaps.',
    badgeLabel: 'In progress',
    status: 'in-progress',
    objective: 'Keep the approved shell truthful and reduce remaining workflow drift inside the live app.',
    outcomes: [
      'Quotes and Orders exist as first-class app routes.',
      'Current route files are app-owned, but the route bodies remain transitional because they are still shallow/static.',
      'Next work is to keep workflow links contract-owned, refresh development status truth, and verify route behavior cleanly.',
    ],
  },
  {
    sprint: 'Phase 3 · Runtime proof and operational honesty',
    summary: 'Revalidate build behavior and make route status honest before claiming deeper readiness.',
    badgeLabel: 'Next',
    status: 'next',
    objective: 'Prove the current baseline cleanly in build and runtime, then tell the truth about what is and is not production-ready.',
    outcomes: [
      'Clean production build in the active repo state.',
      'Verified Quotes and Orders route error boundaries, page behavior, and navigation integrity.',
      'Readiness language reflects actual proof, not assumed progress.',
    ],
  },
  {
    sprint: 'Phase 4 · Quote workflow depth',
    summary: 'Turn Quotes into the true hero commercial workflow behind the promoted route.',
    badgeLabel: 'Next',
    status: 'next',
    objective: 'Deepen the current app-owned Quotes route with operational builder steps, approvals, versioning, and send controls.',
    outcomes: [
      'Guided steps remain Product, Pricing, Terms, Review, and Send.',
      'Approval, versioning, and locking cues become route-native instead of preview-only narrative.',
      'Quote data handling is structured for real use inside the authenticated app.',
    ],
  },
  {
    sprint: 'Phase 5 · Order workflow depth',
    summary: 'Deepen Orders as a real post-acceptance system object after quote approval while keeping the current app-owned route honest.',
    badgeLabel: 'Next',
    status: 'next',
    objective: 'Preserve accepted commercial truth while exposing readiness, blockers, and execution context honestly.',
    outcomes: [
      'Order snapshot inherits accepted quote context cleanly.',
      'Documents, compliance, and operations remain subordinate tabs inside Orders.',
      'Readiness and blockers are explicit to operational users.',
    ],
  },
  {
    sprint: 'Phase 6 · Capture wedge deepening',
    summary: 'Expand Capture as the intake wedge inside Leads for messy trade-world inputs.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Turn business cards, vCards, RFQs, and buyer text into structured lead and quote action.',
    outcomes: [
      'Capture stays embedded in Leads rather than becoming a separate product area.',
      'Merge existing, create lead, and create lead plus draft quote remain the bridge actions.',
      'Intake confidence and duplicate handling improve without changing the shell.',
    ],
  },
  {
    sprint: 'Phase 7 · Trust layers',
    summary: 'Deepen approvals, locking, and audit visibility inside Quotes and Orders.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Make enterprise trust visible at moments of risk and change.',
    outcomes: [
      'Post-send discipline becomes obvious to users.',
      'Audit and approval cues feel embedded, not bolted on.',
      'Trust layers strengthen the workflow without adding top-level sprawl.',
    ],
  },
  {
    sprint: 'Phase 8 · Dashboard awareness layer',
    summary: 'Rebuild Dashboard as situational awareness once the core commercial workflow is stable.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Expose actions, risk, and trade visibility without competing with the workflow itself.',
    outcomes: [
      'Dashboard emphasizes action and risk over vanity metrics.',
      'Trade map and country signals remain additive and leadership-friendly.',
      'The primary workflow still anchors day-to-day use.',
    ],
  },
  {
    sprint: 'Phase 9 · Share loops and identity',
    summary: 'Turn My Card and contact sharing into structured lead generation loops.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Connect offline relationship moments back into Capture and Lead creation.',
    outcomes: [
      'QR and public-card flows stay subordinate to the commercial workflow.',
      'My Card remains an outbound identity layer, not a competing product track.',
      'Share-contact actions feed the capture wedge and quote demand.',
    ],
  },
  {
    sprint: 'Phase 10 · Architecture cleanup and release proof',
    summary: 'Reduce legacy route sprawl, split heavy files, and prove end-to-end readiness after the workflow is coherent.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Scale and harden only after the product story and route truth are stable.',
    outcomes: [
      'God files are split into clearer domain and service boundaries.',
      'Legacy route clutter is reduced without changing the approved shell.',
      'Demo and release readiness rest on verified workflow behavior rather than planning optimism.',
    ],
  },
];

export const backlogSections: BacklogSection[] = [
  {
    title: 'Approved rework · Active',
    heading: 'Finish the transition from aligned shell to truthful live routes',
    sprint: 'Approved rework',
    badgeLabel: 'Active',
    summary:
      'The active lane is no longer legacy sprint work. It is the approved rework stabilization pass that aligns shell, status, route truth, and runtime proof.',
    description:
      'Keep current work narrow: finish live route honesty, verify build behavior, and avoid reopening side-module sprawl while Quotes and Orders are still transitional.',
    status: 'in-progress',
    items: [
      {
        title: 'Keep shell and status truth centralized in shared contracts',
        note: 'Do not let page-level copy, preview pages, or component-local maps become a second source of truth again.',
        stateLabel: 'Done',
        status: 'done',
      },
      {
        title: 'Deepen Quotes route behavior after route promotion',
        note: 'The route is now app-owned, but quote behavior still needs deeper operational truth and route verification.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Deepen Orders route behavior after route promotion',
        note: 'The route is now app-owned, but order behavior still needs deeper operational truth, inherited context, and verification.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Run clean production build and route verification on the current baseline',
        note: 'Use the active repo state, not old assumptions, to decide readiness.',
        stateLabel: 'Next',
        status: 'next',
      },
    ],
  },
  {
    title: 'Next lane · Workflow depth',
    heading: 'Deepen Quotes and Orders only after route truth is clean',
    sprint: 'Next lane',
    badgeLabel: 'Next',
    summary: 'With route promotion complete, deepen the operational workflows behind those routes without breaking contract truth.',
    description: 'This is where commercial and operational depth gets real, but only after build confidence and route honesty are established.',
    status: 'next',
    items: [
      {
        title: 'Make Quote builder steps route-native',
        note: 'Builder structure, approvals, versioning, and send controls should live in the real Quotes route implementation.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Make Orders detail and readiness route-native',
        note: 'Snapshot, documents, compliance, and operations need real separation inside Orders without becoming top-level modules.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Tighten operational truth around blockers and handoff honesty',
        note: 'Accepted commercial intent must remain explicit as work moves into operations.',
        stateLabel: 'Next',
        status: 'next',
      },
    ],
  },
  {
    title: 'Later phases · Locked',
    heading: 'Trust layers, Capture depth, Dashboard maturity, and scaling work',
    sprint: 'Locked phases',
    badgeLabel: 'Locked',
    summary: 'Keep future work visible without pretending it is the current execution lane.',
    description: 'These phases matter, but they stay locked until the approved rework is operationally truthful and validated.',
    status: 'locked',
    items: [
      {
        title: 'Deepen Capture ingestion for cards, vCards, RFQs, and buyer text',
        note: 'Capture remains a differentiator inside Leads, not a separate product pillar.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Strengthen approvals, locking, and audit visibility',
        note: 'Trust layers should be embedded in Quotes and Orders instead of treated like detached admin systems.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Rebuild Dashboard as situational awareness and later scale analytics and integrations',
        note: 'Do not activate scale or visibility layers before the operating model is stable and trusted.',
        stateLabel: 'Locked',
        status: 'locked',
      },
    ],
  },
];

export const productTracks: ProductTrack[] = [
  {
    id: 'capture',
    title: 'Capture wedge',
    summary: 'Capture is the intake differentiator, but its deeper ingestion work is still queued behind the current route-truth pass.',
    status: 'next',
    scope: ['Business card scan', 'vCard import', 'RFQ intake', 'Buyer text parsing', 'Lead merge and draft quote actions'],
  },
  {
    id: 'lead',
    title: 'Lead operating area',
    summary: 'Leads already anchor the visible workflow and remain the handoff point into Quotes.',
    status: 'done',
    scope: ['Lead list', 'Lead detail', 'Timeline', 'Next actions', 'Create quote entry'],
  },
  {
    id: 'quote',
    title: 'Quote hero workflow',
    summary: 'Quotes are promoted and central to the shell with an app-owned route file, but still need route-native operational depth.',
    status: 'in-progress',
    scope: ['Guided builder', 'Pricing support', 'Terms', 'Review', 'Send', 'Approvals', 'Versioning', 'Locking'],
  },
  {
    id: 'order',
    title: 'Order execution entry',
    summary: 'Orders exist as a live app route with route ownership in place, but still need to become a fully truthful post-acceptance operating area.',
    status: 'in-progress',
    scope: ['Snapshot', 'Documents', 'Compliance', 'Operations tabs', 'Execution readiness', 'Blockers'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard awareness layer',
    summary: 'Dashboard remains part of the approved shell, but its deeper action-first rebuild is not the active lane yet.',
    status: 'locked',
    scope: ['Today actions', 'Pipeline health', 'At-risk work', 'Trade intelligence'],
  },
  {
    id: 'my-card',
    title: 'My Card sharing loop',
    summary: 'My Card stays visible as a support surface, but its lead-generation loop is still later-phase work.',
    status: 'locked',
    scope: ['QR share', 'Contact save', 'Public card view', 'Request quote call-to-action'],
  },
];

export const architectureLanes: ArchitectureLane[] = [
  {
    id: 'workflow-shell',
    title: 'Workflow-first shell',
    summary: 'Top-level product understanding is now anchored to Leads, Quotes, Orders, Dashboard, and Admin.',
    status: 'done',
    target: 'Users should understand the product in minutes without navigating module clutter.',
  },
  {
    id: 'contract-owned-truth',
    title: 'Contract-owned product truth',
    summary: 'Visible shell and planning status are both owned by shared lib contracts instead of duplicated component maps.',
    status: 'done',
    target: 'Prevent the repo from speaking in two timelines at once.',
  },
  {
    id: 'route-native-domains',
    title: 'Route-native Quotes and Orders',
    summary: 'Promoted live routes now own app-route files and must keep gaining route-native operational truth without drifting from the contracts.',
    status: 'in-progress',
    target: 'Make route promotion equal real product depth, not just navigation truth.',
  },
  {
    id: 'hidden-services',
    title: 'Complexity hidden in services',
    summary: 'Pricing, documents, contracts, compliance, capture parsing, and RFQ logic should stay behind the workflow shell.',
    status: 'next',
    target: 'Expose only what helps the user move Capture → Lead → Quote → Order forward.',
  },
  {
    id: 'trust-layers',
    title: 'Approvals, audit, and locking',
    summary: 'Trust layers should be visible and embedded, not treated as detached admin concepts.',
    status: 'locked',
    target: 'Reduce buyer fear and operational ambiguity without changing the shell.',
  },
];

export const uxRules: UxRule[] = [
  {
    id: 'flow-first',
    title: 'Lead with the workflow',
    rule: 'Every development page and product screen should make Capture → Lead → Quote → Order obvious.',
    status: 'done',
  },
  {
    id: 'no-top-level-sprawl',
    title: 'Do not reopen module sprawl',
    rule: 'Pipeline, RFQ, documents, contracts, compliance, and similar complexity should not become competing top-level destinations.',
    status: 'done',
  },
  {
    id: 'quotes-hero',
    title: 'Quotes remain the hero commercial workflow',
    rule: 'Quotes need the strongest clarity around builder steps, pricing confidence, approvals, and send controls.',
    status: 'done',
  },
  {
    id: 'capture-wedge',
    title: 'Capture is the intake wedge',
    rule: 'Capture belongs inside the Leads operating model and must support messy inbound trade inputs.',
    status: 'done',
  },
  {
    id: 'orders-integrity',
    title: 'Orders preserve accepted truth',
    rule: 'Orders must inherit accepted quote terms and expose readiness, blockers, and execution state honestly.',
    status: 'in-progress',
  },
  {
    id: 'status-honesty',
    title: 'Status must describe implementation truth',
    rule: 'Do not describe preview-backed routes or unverified runtime behavior as fully complete.',
    status: 'done',
  },
  {
    id: 'shared-foundations',
    title: 'Reuse shared UI foundations',
    rule: 'StatusBadge, LeadCard, QuickActionMenu, PageHeader, and SectionCard stay the baseline building blocks.',
    status: 'done',
  },
];

export const screenPlans: ScreenPlan[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    route: PRODUCT_ROUTES.workspace.dashboard,
    summary: 'Situational awareness for actions, commercial health, and risk.',
    status: 'locked',
    primaryGoal: 'Help leaders and managers understand what needs attention right now.',
    layout: [
      {
        title: 'Top action strip',
        purpose: 'Show today’s actions and high-priority CTAs.',
        blocks: ['Today actions', 'Priority alerts', 'Fast navigation'],
      },
      {
        title: 'Commercial health band',
        purpose: 'Expose pipeline health and at-risk work.',
        blocks: ['Pipeline status', 'At-risk quotes', 'Blocked orders'],
      },
      {
        title: 'Trade intelligence section',
        purpose: 'Provide context without overwhelming the core workflow.',
        blocks: ['Trade map', 'Country signals', 'Supporting insights'],
      },
    ],
    actions: ['Open blocked work', 'Review at-risk deals', 'Jump to operational lanes'],
    dataContracts: ['todayActions', 'pipelineHealth', 'riskAlerts', 'tradeSignals'],
  },
  {
    id: 'leads-capture',
    title: 'Leads + Capture',
    route: PRODUCT_ROUTES.development.screens,
    summary: 'Capture lives inside the Leads operating area as the intake wedge.',
    status: 'in-progress',
    primaryGoal: 'Turn messy inbound information into structured lead creation and quote-starting action.',
    layout: [
      {
        title: 'Left rail intake modes',
        purpose: 'Let users choose how they are bringing information in.',
        blocks: ['Scan business card', 'Import vCard', 'Paste buyer text', 'Upload RFQ or notes'],
      },
      {
        title: 'Center intake review',
        purpose: 'Normalize the parsed contact, company, request, and intent.',
        blocks: ['Parsed contact', 'Company match', 'Inquiry summary', 'Suggested next action'],
      },
      {
        title: 'Right rail actions',
        purpose: 'Move from intake to structured work.',
        blocks: ['Create lead', 'Merge existing', 'Create Lead + Draft Quote'],
      },
    ],
    actions: ['Create lead', 'Merge existing', 'Create Lead + Draft Quote'],
    dataContracts: ['captureModes', 'parsedContact', 'parsedCompany', 'buyerRequest', 'mergeCandidates', 'intakeActions'],
  },
  {
    id: 'quote-builder',
    title: 'Quotes',
    route: PRODUCT_ROUTES.app.quotes,
    summary: 'Quotes now live in an app-owned route file, but the route still needs deeper route-native operational truth.',
    status: 'in-progress',
    primaryGoal: 'Help teams draft, review, and send quotes quickly with visible controls.',
    layout: [
      {
        title: 'Step rail',
        purpose: 'Keep progress and structure obvious.',
        blocks: ['Product', 'Pricing', 'Terms', 'Review', 'Send'],
      },
      {
        title: 'Main builder canvas',
        purpose: 'Focus on one step at a time while preserving context.',
        blocks: ['Current step form', 'Validation prompts', 'Recommendations'],
      },
      {
        title: 'Summary and controls',
        purpose: 'Surface commercial truth and trust cues.',
        blocks: ['Quote summary', 'Margin or risk cues', 'Approval state', 'Send control'],
      },
    ],
    actions: ['Save draft', 'Request approval', 'Send quote'],
    dataContracts: ['quoteSteps', 'quoteDraft', 'pricingSummary', 'riskFlags', 'approvalState'],
  },
  {
    id: 'orders',
    title: 'Orders workspace',
    route: PRODUCT_ROUTES.app.orders,
    summary: 'Orders continue the story after quote acceptance with an app-owned route file, but still need route-native implementation depth and readiness truth.',
    status: 'in-progress',
    primaryGoal: 'Expose order readiness and inherited commercial truth for execution teams.',
    layout: [
      {
        title: 'Orders list',
        purpose: 'Show operational status and exceptions quickly.',
        blocks: ['Order rows', 'Accepted-quote source', 'Operational status'],
      },
      {
        title: 'Order detail tabs',
        purpose: 'Organize post-acceptance work without fragmenting the product.',
        blocks: ['Snapshot', 'Documents', 'Compliance', 'Operations'],
      },
      {
        title: 'Readiness panel',
        purpose: 'Make blockers and next steps visible.',
        blocks: ['Document readiness', 'Execution blockers', 'Owner actions'],
      },
    ],
    actions: ['Review snapshot', 'Resolve blockers', 'Advance readiness'],
    dataContracts: ['orders', 'orderSnapshot', 'documentChecklist', 'complianceState', 'executionBlockers'],
  },
  {
    id: 'my-card',
    title: 'My Card / Share Contact',
    route: PRODUCT_ROUTES.workspace.myCard,
    summary: 'Outbound contact sharing turns offline interactions into structured leads, but remains later-phase work.',
    status: 'locked',
    primaryGoal: 'Convert trade-show and partner interactions into captured commercial demand.',
    layout: [
      {
        title: 'Profile card',
        purpose: 'Present a clean shareable identity.',
        blocks: ['Representative profile', 'Company profile', 'Save contact CTA'],
      },
      {
        title: 'QR and sharing panel',
        purpose: 'Bridge physical meetings and digital follow-up.',
        blocks: ['QR code', 'Share actions', 'Request quote CTA'],
      },
    ],
    actions: ['Share contact', 'Open public card', 'Request quote'],
    dataContracts: ['profileCard', 'shareLinks', 'qrPayload', 'publicCardActions'],
  },
];

export const developmentWorkspace = {
  flow: LOCKED_PRODUCT_FLOW.join(' → '),
  activeSprint: 'Approved rework',
  completedSprint: 'Legacy sprint timeline retired',
  planningSurfaces,
  roadmapMilestones,
  backlogSections,
  productTracks,
  architectureLanes,
  uxRules,
  screenPlans,
};

export const masterPlan = roadmapMilestones;
export const backlog = backlogSections;
export const productPlan = productTracks;
export const architecturePlan = architectureLanes;
export const uxRulesPlan = uxRules;
export const developmentScreens = screenPlans;
