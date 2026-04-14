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
  sprint: 'Sprint 3',
  percent: 99,
  percentLabel: '99%',
};

export const sprintFocus = {
  sprint: 'Sprint 3 · In progress',
  title:
    'Sprint 2 remains complete, and Sprint 3 is now active with the Leads surface pushed into a quote-first workspace, a decisive above-the-fold commercial state instead of four equal readiness tracks, a prioritized one-blocker-at-a-time quote-prep queue, a unified blocker call inside that queue instead of duplicate support guidance, a passive lead log, quieter sticky chrome, and a quieter support rail that now behaves like passive context instead of a competing work lane, while the nearby lead-reference strip compresses into a compact tray that keeps supporting records and full lead detail on demand only, and the lower support-detail area now stays collapsed by default until a blocker is explicitly inspected, while quote record and lead log now share one quieter on-demand supporting-record panel with one collapse path instead of opening as separate full-width sections, and the right rail now compresses into a quieter passive support watchlist where blocker detail and workspace links open only on demand, while the shared supporting-record surface can now collapse back to a lighter summary drawer instead of keeping full detail open all the time, so Quote prep stays fixed and Capture → Lead → Quote → Order remains locked.',
  nextAction:
    'Continue Sprint 3 only through the development pages: keep the Leads surface narrow, keep Create Quote or Continue Quote dominant, keep the support lane prioritized around one blocker at a time, keep duplicate blocker guidance collapsed into the quote-prep lane, keep sticky actions commercially quiet, keep the right rail passive and non-competitive, and keep quote record plus lead history opened only on demand inside one quieter shared supporting-record panel, keep lower support detail collapsed by default until a blocker is explicitly inspected, and keep the right rail compressed into a passive support watchlist where blocker detail and workspace links open only on demand, and let the shared supporting-record surface collapse back to a lighter summary drawer whenever full record detail is no longer needed so secondary surfaces never behave like competing work lanes.',
  flow: LOCKED_PRODUCT_FLOW.join(' → '),
};

export const readinessSummary = {
  status: 'Sprint 2 complete',
  buildStatus:
    'A prior clean production build and deployment are still recorded for the verified baseline. In this Sprint 3 pass, typecheck passed and Next build compiled successfully before entering lint/type validation, but a fresh local build still did not finish end-to-end inside the run window, so no new blocker is confirmed and full re-verification is still pending.',
  driftRisk:
    'Controlled because development status, shell truth, and deployment proof are now aligned. Keep future work on the development pages so the repo does not drift from the sprint plan again.',
  blockers:
    'No confirmed build blockers. Keep experimental.webpackBuildWorker = false in place until a future real build proves it is safe to remove.',
};

export const planningSurfaces: PlanningSurface[] = [
  {
    id: 'development-home',
    title: PRODUCT_ROUTES.development.home,
    href: PRODUCT_ROUTES.development.home,
    summary: 'Operating-system overview for the locked flow, current sprint status, and the next approved execution lane.',
    status: 'done',
    focus: 'Keep the repo speaking one sprint timeline again: Sprint 2 complete, Sprint 3 active.',
  },
  {
    id: 'master-plan',
    title: PRODUCT_ROUTES.development.masterPlan,
    href: PRODUCT_ROUTES.development.masterPlan,
    summary: 'Sprint roadmap for the locked flow from completed foundation work into the next product phase.',
    status: 'done',
    focus: 'Preserve the original plan while showing clearly that Sprint 2 is complete and Sprint 3 is the active lane.',
  },
  {
    id: 'readiness',
    title: PRODUCT_ROUTES.development.readiness,
    href: PRODUCT_ROUTES.development.readiness,
    summary: 'Readiness, build confidence, blockers, and anti-drift discipline anchored to real production proof.',
    status: 'done',
    focus: 'Keep build and deployment truth visible so future sprint work does not overwrite proven readiness.',
  },
  {
    id: 'backlog',
    title: PRODUCT_ROUTES.development.backlog,
    href: PRODUCT_ROUTES.development.backlog,
    summary: 'Repo-backed backlog showing Sprint 3 active now and later work still sequenced behind it.',
    status: 'done',
    focus: 'Keep the active phase narrow and avoid skipping ahead to later modules.',
  },
  {
    id: 'product',
    title: PRODUCT_ROUTES.development.product,
    href: PRODUCT_ROUTES.development.product,
    summary: 'Product story, module priorities, and the locked commercial flow remain stable.',
    status: 'done',
    focus: 'Preserve Capture → Lead → Quote → Order as the product truth.',
  },
  {
    id: 'architecture',
    title: PRODUCT_ROUTES.development.architecture,
    href: PRODUCT_ROUTES.development.architecture,
    summary: 'Architecture guardrails for safe implementation as future sprints deepen the product.',
    status: 'done',
    focus: 'Keep future work disciplined and route-safe.',
  },
  {
    id: 'ux-rules',
    title: PRODUCT_ROUTES.development.uxRules,
    href: PRODUCT_ROUTES.development.uxRules,
    summary: 'Rules for clarity, locking, trust, and trainable workflow behavior.',
    status: 'done',
    focus: 'Prevent visual drift while Sprint 3 work continues.',
  },
  {
    id: 'screen-leads-capture',
    title: PRODUCT_ROUTES.development.screens,
    href: PRODUCT_ROUTES.development.screens,
    summary: 'Screen-layout reference for the completed Leads + Capture foundation that Sprint 3 must continue to respect.',
    status: 'done',
    focus: 'Keep Lead and Capture implementation aligned to the locked screen contract.',
  },
];

export const readinessAreas: ReadinessArea[] = [
  {
    title: 'Development status is now repo-backed and aligned',
    summary: 'The development hub, master plan, readiness board, and backlog now all report the same sprint state instead of mixed timelines.',
    status: 'done',
  },
  {
    title: 'Clean production build and deployment are already proven',
    summary: 'The latest real external build cleared page-data collection, generated static pages successfully, completed deployment, and introduced no confirmed blocker.',
    status: 'done',
  },
  {
    title: 'Sprint 2 foundation is formally complete',
    summary: 'The current baseline is stable enough to close Sprint 2 without changing working build-safe code.',
    status: 'done',
  },
  {
    title: 'Sprint 3 is active and narrowly scoped',
    summary: 'Lead simplification is the active execution lane and now includes a cleaner two-column lead workspace, an above-the-fold quote-first commercial state that summarizes quote readiness as one decisive call instead of four equal tracks, a prioritized one-blocker-at-a-time quote-prep queue with its blocker summary collapsed into the same lane instead of a second support hero, a passive lead log so note-taking and history stay secondary to quote motion, quieter sticky support actions, a passive right rail that stops behaving like a competing work lane, and on-demand quote record plus lead log controls folded into a compact lead-reference tray, while the records themselves now open inside one quieter shared supporting-record panel, lower support detail stays collapsed by default until a blocker is explicitly inspected, and the right rail now behaves as a passive support watchlist with blocker detail plus workspace links opened only on demand, while the shared supporting-record surface can collapse back to a lighter summary drawer whenever the user is done reviewing deeper record detail, so the page chrome keeps pointing back to quote creation while development stays inside the locked flow rules.',
    status: 'in-progress',
  },
  {
    title: 'No new build blocker is confirmed',
    summary: 'Build risk is currently low, but the existing worker fix stays in place until a future real build proves the repo no longer needs it.',
    status: 'done',
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
    note: 'development-status.ts remains a compatibility pass-through instead of owning its own timeline.',
    status: 'done',
  },
  {
    id: 'development-pages-aligned',
    area: 'Development pages',
    label: 'Development pages now show Sprint 2 complete and Sprint 3 active',
    note: 'The development hub, master plan, readiness page, backlog, and screen references now speak the same status language as Sprint 3 continues through quote-first simplification.',
    status: 'done',
  },
  {
    id: 'capture-foundation',
    area: 'Sprint completion',
    label: 'Sprint 2 Capture foundation is reflected as complete',
    note: 'Lead and Capture foundation status is now closed in the planning surfaces instead of being left in a stale transitional state.',
    status: 'done',
  },
  {
    id: 'build-verification',
    area: 'Validation',
    label: 'Production build and deployment proof are recorded in the status source',
    note: 'Development status now reflects the real production outcome: clean build, clean deployment, and no confirmed new blocker.',
    status: 'done',
  },
  {
    id: 'worker-fix-protection',
    area: 'Build safety',
    label: 'Existing webpack worker fix remains protected',
    note: 'Do not remove experimental.webpackBuildWorker = false until a future real build proves it is unnecessary.',
    status: 'done',
  },
  {
    id: 'sprint-3-entry',
    area: 'Next phase',
    label: 'Sprint 3 scope is active and visible',
    note: 'The active phase is Lead simplification, Create Quote CTA emphasis, and keeping support guidance collapsed into one quote-prep decision lane.',
    status: 'in-progress',
  },
];

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    sprint: 'Sprint 1 · Product foundation closeout',
    summary: 'Keep one active development workplace, align Leads, Capture, and Quote entry, and close baseline readiness.',
    badgeLabel: 'Done',
    status: 'done',
    objective: 'Establish the locked flow and make the development workplace the planning source of truth.',
    outcomes: [
      'Development workplace pages exist and anchor planning.',
      'Leads, Capture, and Quote entry stay inside the locked product scope.',
      'Baseline readiness gates are visible instead of implied.',
    ],
  },
  {
    sprint: 'Sprint 2 · Capture foundation',
    summary: 'Create the unified Capture entry under Leads and lock the intake review foundation to the current product contract.',
    badgeLabel: 'Done',
    status: 'done',
    objective: 'Finish the Leads + Capture foundation and close the sprint with real build and production proof.',
    outcomes: [
      'Leads + Capture planning surfaces are aligned in the development workplace.',
      'Clean production build has already been verified and deployed successfully.',
      'Sprint 2 is now formally complete in the repo status source.',
    ],
  },
  {
    sprint: 'Sprint 3 · Lead simplification',
    summary: 'Reduce lead-surface complexity and turn the lead page into a quote-first commercial workspace.',
    badgeLabel: 'In progress',
    status: 'in-progress',
    objective: 'Continue the active phase without changing the locked commercial flow or destabilizing the build.',
    outcomes: [
      'Lead surface complexity is reduced through a quote-first workspace hierarchy.',
      'Create Quote or Continue Quote becomes the dominant CTA when a lead is ready.',
      'Workflow support now prioritizes one blocker at a time, keeps the blocker summary inside the quote-prep lane instead of a duplicate support hero, summarizes above-the-fold quote readiness as one decisive commercial state instead of four equal tracks, folds supporting records into a compact lead-reference tray, and keeps lower support detail collapsed by default until a blocker is explicitly inspected, while quote creation or continuation stays above the fold, activity history remains passive until deeper quote review is needed, and the shared supporting-record surface can collapse back to a lighter summary drawer once full detail is no longer required.',
    ],
  },
  {
    sprint: 'Sprint 4 · Quote builder core',
    summary: 'Build the guided quote-builder steps and draft structure after Lead simplification is complete.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Deepen Quotes only after Sprint 3 is finished cleanly.',
    outcomes: [
      'Guided steps remain Product, Pricing, Terms, Review, and Send.',
      'Draft, pricing, and review data structures are defined safely.',
      'Version history and send checkpoints are visible.',
    ],
  },
  {
    sprint: 'Sprint 5 · Trust layer',
    summary: 'Add approval rules, audit trail structure, and quote locking after send and approval.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Make enterprise trust visible without opening new top-level modules.',
    outcomes: [
      'Approval rules are visible and understandable.',
      'Audit structure is explicit at sensitive moments.',
      'Quote locking behavior is consistent after send and approval.',
    ],
  },
  {
    sprint: 'Sprint 6 · Orders foundation',
    summary: 'Create the Orders module around accepted-quote snapshots and fold related execution surfaces under it.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Carry accepted commercial truth into execution cleanly.',
    outcomes: [
      'Orders exist as a first-class execution area.',
      'Documents and compliance stay subordinate to Orders.',
      'Accepted-quote context remains intact through handoff.',
    ],
  },
  {
    sprint: 'Sprint 7 · Dashboard rebuild',
    summary: 'Rebuild Dashboard to be action-first with trade-map context and less vanity reporting.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Make Dashboard useful only after the core operating workflow is stable.',
    outcomes: [
      'Dashboard emphasizes action over passive metrics.',
      'Trade map and geographic drill-down support decision making.',
      'Workflow surfaces stay primary for day-to-day work.',
    ],
  },
  {
    sprint: 'Sprint 8 · My Card and outbound share',
    summary: 'Build outbound identity and sharing loops that feed qualified demand back into the workflow.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Turn offline relationship moments into structured demand without breaking the core shell.',
    outcomes: [
      'My Card page exists as an outbound identity layer.',
      'QR and public-card flows support follow-up.',
      'Request-quote actions reconnect sharing to the commercial workflow.',
    ],
  },
  {
    sprint: 'Sprint 9 · Architecture cleanup',
    summary: 'Split god files, tighten service boundaries, and reduce legacy route sprawl after the workflow is stable.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Scale only after product and sprint truth are stable.',
    outcomes: [
      'Large files are split into cleaner domain ownership.',
      'Services become more explicit and reusable.',
      'Legacy route clutter is reduced without changing the shell.',
    ],
  },
  {
    sprint: 'Sprint 10 · Demo and release readiness',
    summary: 'Prepare the walkthroughs, proofs, and final validation needed for broader release confidence.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Close the roadmap with real demo and release readiness proof.',
    outcomes: [
      'Buyer demo script is ready.',
      'Leadership walkthrough is ready.',
      'End-to-end readiness is verified against release criteria.',
    ],
  },
];

export const backlogSections: BacklogSection[] = [
  {
    title: 'Sprint 3 · In progress',
    heading: 'Lead simplification is active without drifting from the locked flow',
    sprint: 'Sprint 3',
    badgeLabel: 'In progress',
    summary:
      'Sprint 2 is complete. The next lane is Lead simplification, not architecture drift, not module sprawl, and not optional redesign work.',
    description:
      'Keep this sprint narrow: reduce lead-surface complexity, make Create Quote dominant, collapse duplicate blocker guidance into the quote-prep lane, summarize above-the-fold quote readiness as one decisive commercial state, keep lower support detail collapsed by default until a blocker is explicitly inspected, and demote supporting workflow guidance beneath the quote-first workspace while leaving working build-safe code untouched unless a real blocker appears.',
    status: 'in-progress',
    items: [
      {
        title: 'Reduce lead surface complexity',
        note: 'Remove friction and simplify what users see first on the Leads surface.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Make Create Quote the dominant CTA',
        note: 'When a lead is ready, quote creation or continuation must be the clearest commercial move on the page.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Unify activity and next-action surfaces',
        note: 'Keep notes and history passive, prioritize one support blocker at a time, avoid duplicated support CTAs in the sticky bar, and avoid duplicate blocker guidance inside the workflow lane.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Keep build-safe discipline while Sprint 3 starts',
        note: 'Do not touch the worker fix or other stable build-safe code unless a real blocker proves it is necessary.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
    ],
  },
  {
    title: 'Sprints 4 to 6 · Queued',
    heading: 'Quote builder, trust layers, and Orders depth stay sequenced behind Sprint 3',
    sprint: 'Sprints 4-6',
    badgeLabel: 'Locked',
    summary: 'The next deeper commercial and operational work stays visible, but it is not active until Sprint 3 is complete.',
    description: 'This protects the plan from skipping directly into later features before the Leads surface is simplified cleanly.',
    status: 'locked',
    items: [
      {
        title: 'Sprint 4 · Quote builder core',
        note: 'Guided steps, draft structure, versioning, and send checkpoints stay queued.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Sprint 5 · Trust layer',
        note: 'Approval, audit, and locking work remain sequenced after Quote builder core.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Sprint 6 · Orders foundation',
        note: 'Orders depth stays visible, but it does not become active work before the earlier commercial path is ready.',
        stateLabel: 'Locked',
        status: 'locked',
      },
    ],
  },
  {
    title: 'Sprints 7 to 10 · Locked',
    heading: 'Dashboard, outbound share, architecture cleanup, and final release proof remain later-phase work',
    sprint: 'Sprints 7-10',
    badgeLabel: 'Locked',
    summary: 'Keep the long-range roadmap visible without pretending it belongs to the immediate execution lane.',
    description: 'These phases matter, but they stay locked until the current sprint sequence is completed in order.',
    status: 'locked',
    items: [
      {
        title: 'Sprint 7 · Dashboard rebuild',
        note: 'Action-first dashboard work remains a later phase.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Sprint 8 · My Card and outbound share',
        note: 'Identity and share loops stay subordinate to the core workflow until later.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Sprints 9 and 10 · Cleanup and release proof',
        note: 'Architecture cleanup and broader demo/release readiness stay visible but inactive.',
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
    summary: 'Sprint 2 Capture foundation is complete. The current goal is to preserve it while later ingestion depth stays queued.',
    status: 'done',
    scope: ['Business card scan', 'vCard import', 'RFQ intake', 'Buyer text parsing', 'Lead merge and draft quote actions'],
  },
  {
    id: 'lead',
    title: 'Lead operating area',
    summary: 'Leads are the next execution lane. Sprint 3 should simplify the surface and make quote-starting action more obvious.',
    status: 'in-progress',
    scope: ['Lead list', 'Lead detail', 'Activity', 'Next actions', 'Create Quote dominance'],
  },
  {
    id: 'quote',
    title: 'Quote hero workflow',
    summary: 'Quote builder depth stays queued for Sprint 4 after Lead simplification is complete.',
    status: 'locked',
    scope: ['Guided builder', 'Pricing support', 'Terms', 'Review', 'Send', 'Approvals', 'Versioning', 'Locking'],
  },
  {
    id: 'order',
    title: 'Order execution entry',
    summary: 'Orders remain part of the locked product shell, but deeper execution work stays sequenced for Sprint 6.',
    status: 'locked',
    scope: ['Snapshot', 'Documents', 'Compliance', 'Operations tabs', 'Execution readiness', 'Blockers'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard awareness layer',
    summary: 'Dashboard work remains a later-phase rebuild after the core commercial flow is stable.',
    status: 'locked',
    scope: ['Today actions', 'Pipeline health', 'At-risk work', 'Trade intelligence'],
  },
  {
    id: 'my-card',
    title: 'My Card sharing loop',
    summary: 'My Card stays visible as a support surface, but its demand-generation loop remains later-phase work.',
    status: 'locked',
    scope: ['QR share', 'Contact save', 'Public card view', 'Request quote call-to-action'],
  },
];

export const architectureLanes: ArchitectureLane[] = [
  {
    id: 'workflow-shell',
    title: 'Workflow-first shell',
    summary: 'Top-level product understanding is anchored to Leads, Quotes, Orders, Dashboard, and Admin.',
    status: 'done',
    target: 'Users should understand the product quickly without module clutter.',
  },
  {
    id: 'contract-owned-truth',
    title: 'Contract-owned product truth',
    summary: 'Visible shell and planning status are both owned by shared lib contracts instead of duplicated page-level maps.',
    status: 'done',
    target: 'Prevent the repo from speaking in two sprint timelines at once.',
  },
  {
    id: 'capture-foundation',
    title: 'Leads + Capture foundation',
    summary: 'The Lead and Capture planning foundation is complete and should now be preserved while the next sprint starts.',
    status: 'done',
    target: 'Keep the completed Sprint 2 foundation stable.',
  },
  {
    id: 'lead-simplification',
    title: 'Lead-surface simplification',
    summary: 'Sprint 3 is simplifying the Leads experience now by making the lead page read like a quote-first workspace with one decisive above-the-fold commercial state, then a prioritized support queue before deeper Quote and Orders work.',
    status: 'in-progress',
    target: 'Keep quote launch dominant until a real quote exists, then expose quote review cleanly.',
  },
  {
    id: 'hidden-services',
    title: 'Complexity hidden in services',
    summary: 'Pricing, documents, contracts, compliance, capture parsing, and RFQ logic should stay behind the workflow shell.',
    status: 'locked',
    target: 'Expose only what helps the user move Capture → Lead → Quote → Order forward.',
  },
  {
    id: 'trust-layers',
    title: 'Approvals, audit, and locking',
    summary: 'Trust layers remain a later sprint so the architecture does not jump ahead of the product sequence.',
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
    id: 'capture-wedge',
    title: 'Capture stays the intake wedge',
    rule: 'Capture belongs inside the Leads operating model and the completed Sprint 2 foundation should remain intact.',
    status: 'done',
  },
  {
    id: 'lead-next-action',
    title: 'Make the lead next action obvious',
    rule: 'Sprint 3 should reduce lead complexity and make Create Quote the dominant CTA when the lead is ready.',
    status: 'in-progress',
  },
  {
    id: 'status-honesty',
    title: 'Status must describe implementation truth',
    rule: 'Do not describe unverified work as complete, and do not hide proven build or deployment success once it is real.',
    status: 'done',
  },
  {
    id: 'shared-foundations',
    title: 'Reuse shared UI foundations',
    rule: 'StatusBadge, LeadCard, QuickActionMenu, PageHeader, and SectionCard stay the baseline building blocks.',
    status: 'done',
  },
  {
    id: 'mobile-first',
    title: 'Keep mobile and tablet quality strict',
    rule: 'Touch-first quality remains mandatory before desktop polish expands.',
    status: 'done',
  },
];

export const screenPlans: ScreenPlan[] = [
  {
    id: 'leads-capture',
    title: 'Leads + Capture foundation',
    route: PRODUCT_ROUTES.development.screens,
    summary: 'The Sprint 2 Leads + Capture screen contract is complete and should stay locked while Sprint 3 starts.',
    status: 'done',
    primaryGoal: 'Keep inbound lead creation and quote-starting handoff clear and stable.',
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
    id: 'lead-workspace',
    title: 'Lead workspace simplification',
    route: PRODUCT_ROUTES.workspace.leads,
    summary: 'Sprint 3 is actively simplifying the Leads workspace and making the quote-starting workspace visually dominant through one decisive above-the-fold commercial state while support work queues behind one current blocker, the blocker summary lives inside that same queue, the right rail stays compressed into a passive support watchlist with on-demand detail, and the shared supporting-record surface can collapse back to a lighter summary drawer when full detail is no longer needed.',
    status: 'in-progress',
    primaryGoal: 'Help reps understand the lead state quickly and move into quoting without competing surface noise.',
    layout: [
      {
        title: 'Lead list clarity',
        purpose: 'Reduce clutter and make state easy to scan.',
        blocks: ['Lead row summary', 'Qualification cues', 'Owner and next action'],
      },
      {
        title: 'Lead detail focus',
        purpose: 'Keep commercial context and next steps clear without surface overload.',
        blocks: ['Compact lead-reference tray', 'On-demand full detail', 'Passive lead log', 'Prioritized support queue', 'Collapsed support detail by default',
        'Shared supporting-record panel', 'Collapsible record summary drawer', 'Passive support watchlist'],
      },
      {
        title: 'Primary CTA emphasis',
        purpose: 'Make Create Quote the obvious next step when a lead is ready.',
        blocks: ['Decisive commercial state', 'Unified current blocker card', 'Compact supporting-record tray', 'Collapsible record summary drawer', 'Passive support watchlist'],
      },
    ],
    actions: ['Create Quote', 'Continue Quote', 'Advance qualification'],
    dataContracts: ['leadSummary', 'leadTimeline', 'qualificationState', 'nextAction', 'quoteEntryState'],
  },
  {
    id: 'quote-builder',
    title: 'Quote builder core',
    route: PRODUCT_ROUTES.app.quotes,
    summary: 'Quote builder depth remains sequenced for Sprint 4 after Sprint 3 is finished.',
    status: 'locked',
    primaryGoal: 'Prepare the future builder structure without activating that work early.',
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
    summary: 'Orders remain sequenced for later foundation work after the earlier sprints are complete.',
    status: 'locked',
    primaryGoal: 'Expose order readiness and inherited commercial truth when the roadmap reaches Sprint 6.',
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
    summary: 'Outbound contact sharing remains later-phase work after the earlier workflow sprints are complete.',
    status: 'locked',
    primaryGoal: 'Convert trade-show and partner interactions into captured commercial demand later in the roadmap.',
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
  activeSprint: 'Sprint 3 · In progress',
  completedSprint: 'Sprint 2 · Complete',
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
