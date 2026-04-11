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

export const lockedProductFlow = ['Capture', 'Lead', 'Quote', 'Order'] as const;

export const sprintProgress = {
  sprint: 'Sprint 2',
  percent: 44,
  percentLabel: '44%',
};

export const sprintFocus = {
  sprint: 'Sprint 2',
  title: 'Complete the Quote → Order transition without redesigning the product structure.',
  nextAction:
    'Restore the full planning operating system first, then continue Sprint 2 delivery on Quote → Order continuity, order readiness, and execution handoff clarity.',
  flow: 'Capture → Lead → Quote → Order',
};

export const readinessSummary = {
  status: 'Sprint 2 active',
  buildStatus: 'Full repo compile validated; page-data runtime verification still pending',
  driftRisk: 'Reduced after contract restoration',
  blockers:
    'Compilation and type validation succeeded in the current full repository. Remaining verification is limited to page-data/runtime execution during production build collection.',
};

export const planningSurfaces: PlanningSurface[] = [
  {
    id: 'development-home',
    title: '/development',
    href: '/development',
    summary: 'Operating-system overview for sprint state, flow discipline, and active planning entry points.',
    status: 'in-progress',
    focus: 'Keep Sprint 2 active while exposing the full roadmap and planning surfaces.',
  },
  {
    id: 'master-plan',
    title: '/development/master-plan',
    href: '/development/master-plan',
    summary: 'Full roadmap through Sprint 10 anchored to the locked product flow.',
    status: 'in-progress',
    focus: 'Prevent roadmap collapse and keep sequencing visible across all future work.',
  },
  {
    id: 'readiness',
    title: '/development/readiness',
    href: '/development/readiness',
    summary: 'Sprint readiness, validation status, blockers, and release discipline.',
    status: 'in-progress',
    focus: 'Confirm Sprint 1 completion, Sprint 2 activation, and build-critical checks.',
  },
  {
    id: 'backlog',
    title: '/development/backlog',
    href: '/development/backlog',
    summary: 'Structured backlog grouped by sprint instead of flattened task fragments.',
    status: 'in-progress',
    focus: 'Keep active, next, and locked work separated cleanly.',
  },
  {
    id: 'product',
    title: '/development/product',
    href: '/development/product',
    summary: 'Product story, module priorities, and buyer-facing clarity rules.',
    status: 'done',
    focus: 'Preserve the Capture → Lead → Quote → Order commercial narrative.',
  },
  {
    id: 'architecture',
    title: '/development/architecture',
    href: '/development/architecture',
    summary: 'Target module boundaries, hidden services, and implementation lanes.',
    status: 'in-progress',
    focus: 'Keep workflow shells simple while demoting underlying complexity into services.',
  },
  {
    id: 'ux-rules',
    title: '/development/ux-rules',
    href: '/development/ux-rules',
    summary: 'Rules for layout, navigation clarity, approvals, locking, and trust cues.',
    status: 'done',
    focus: 'Avoid UI sprawl and keep workflow-first screens.',
  },
  {
    id: 'screen-leads-capture',
    title: '/development/screens/leads-capture',
    href: '/development/screens/leads-capture',
    summary: 'Screen-layout planning for the Capture wedge inside the Leads operating area.',
    status: 'in-progress',
    focus: 'Preserve intake review, lead merge, and draft-quote creation flows.',
  },
];

export const readinessAreas: ReadinessArea[] = [
  {
    title: 'Planning operating system restored',
    summary: 'The roadmap, backlog, screen-planning structure, and planning surfaces are re-expanded instead of compressed into a patch-only model.',
    status: 'done',
  },
  {
    title: 'Sprint alignment',
    summary: 'Sprint 1 remains complete and Sprint 2 remains the only active implementation lane.',
    status: 'done',
  },
  {
    title: 'Quote to Order continuity',
    summary: 'Sprint 2 still centers on approval clarity, order conversion, inherited context, and first operational order states.',
    status: 'in-progress',
  },
  {
    title: 'Planning page contract coverage',
    summary: 'Shared planning exports now include roadmap, backlog, product, architecture, UX rules, and screen-layout structures for /development pages.',
    status: 'done',
  },
  {
    title: 'Build validation',
    summary: 'Compilation and type validation passed in the current full repository; remaining verification is focused on runtime page-data collection and affected route behavior.',
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
    id: 'planning-surfaces',
    area: 'Development workplace',
    label: 'Active planning surfaces restored',
    note: '/development, /master-plan, /readiness, /backlog, /product, /architecture, /ux-rules, and /screens/leads-capture are treated as the live operating system.',
    status: 'done',
  },
  {
    id: 'roadmap-10-sprints',
    area: 'Roadmap',
    label: 'Roadmap restored through Sprint 10',
    note: 'The roadmap is no longer collapsed into a short placeholder sequence.',
    status: 'done',
  },
  {
    id: 'backlog-structure',
    area: 'Backlog',
    label: 'Backlog grouped by active, next, and locked sprint lanes',
    note: 'Sprint 2 remains active while later work stays visible and sequenced.',
    status: 'done',
  },
  {
    id: 'screen-layout-contracts',
    area: 'Screen planning',
    label: 'Screen-layout planning contracts restored',
    note: 'Capture, leads, quotes, orders, dashboard, and My Card planning structure is available to /development screens.',
    status: 'done',
  },
  {
    id: 'shared-ui-foundations',
    area: 'Implementation discipline',
    label: 'Shared UI foundations remain the reuse baseline',
    note: 'StatusBadge, LeadCard, QuickActionMenu, PageHeader, and SectionCard stay as the reusable surface layer.',
    status: 'done',
  },
  {
    id: 'sprint-2-lane',
    area: 'Sprint status',
    label: 'Sprint 2 remains active after restoration',
    note: 'Restoration must not accidentally move execution focus to later sprints.',
    status: 'done',
  },
  {
    id: 'full-build',
    area: 'Validation',
    label: 'Finish runtime build validation after compile-safe restoration',
    note: 'Compilation and type checks passed in the full repo, but runtime page-data collection and affected route behavior still need verification before claiming full end-to-end success.',
    status: 'next',
  },
];

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    sprint: 'Sprint 1',
    summary: 'Core Capture → Lead → Quote foundations are complete and validated.',
    badgeLabel: 'Done',
    status: 'done',
    objective: 'Establish the commercial shell and reusable UI foundations.',
    outcomes: [
      'Shared UI foundations are in place and reused across planning and product surfaces.',
      'Leads, Capture, and Quote flows exist in the current product.',
      'Sprint 1 is explicitly complete and no longer the active implementation lane.',
    ],
  },
  {
    sprint: 'Sprint 2',
    summary: 'Complete Quote → Order continuity, approval clarity, and first operational order states.',
    badgeLabel: 'Active',
    status: 'in-progress',
    objective: 'Turn accepted commercial intent into operationally honest order execution entry.',
    outcomes: [
      'Preserve Quote approval gates, conversion logic, and inherited order context.',
      'Deepen order readiness, blockers, documents, and execution cues without redesigning the product shell.',
      'Keep Sprint 2 as the only active delivery lane.',
    ],
  },
  {
    sprint: 'Sprint 3',
    summary: 'Stabilize order operations, permissions, and role-aware execution continuity.',
    badgeLabel: 'Next',
    status: 'next',
    objective: 'Expand operational depth only after Quote → Order is stable.',
    outcomes: [
      'Role-based visibility begins only after first-order flow is dependable.',
      'Execution stages become clearer across operations and follow-through.',
      'No disruption to the locked commercial flow.',
    ],
  },
  {
    sprint: 'Sprint 4',
    summary: 'Strengthen quote and order governance with approvals, locking, and change controls.',
    badgeLabel: 'Next',
    status: 'next',
    objective: 'Make trust layers visible to enterprise buyers and internal reviewers.',
    outcomes: [
      'Visible post-send controls and immutable intent preservation.',
      'Approval routing becomes clearer for exceptions and risky pricing.',
      'Order change history remains legible after conversion.',
    ],
  },
  {
    sprint: 'Sprint 5',
    summary: 'Elevate Capture as the intake wedge for cards, vCards, RFQs, and buyer text.',
    badgeLabel: 'Next',
    status: 'next',
    objective: 'Turn messy inbound trade input into structured CRM action.',
    outcomes: [
      'Capture review normalizes contact, company, inquiry, and quote-start data.',
      'Merge-existing and create-lead actions remain part of the intake operating model.',
      'Create Lead + Draft Quote becomes a deliberate cross-flow bridge.',
    ],
  },
  {
    sprint: 'Sprint 6',
    summary: 'Rebuild Dashboard as situational awareness rather than module sprawl.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Expose today’s actions, pipeline health, and risk visibility in one leadership-ready surface.',
    outcomes: [
      'Dashboard prioritizes action, risk, and commercial health.',
      'Trade-map and country-intelligence cues stay additive rather than distracting.',
      'Managers gain a better default operating surface without changing the core flow.',
    ],
  },
  {
    sprint: 'Sprint 7',
    summary: 'Deepen quote builder guidance and pricing support while keeping UI complexity hidden.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Improve commercial speed without turning the interface into a pricing engine dashboard.',
    outcomes: [
      'Guided steps remain Product, Pricing, Terms, Review, and Send.',
      'Pricing logic stays behind the workflow shell.',
      'Margin and risk checks remain visible at the right moments.',
    ],
  },
  {
    sprint: 'Sprint 8',
    summary: 'Add buyer-confidence layers through audit, approval visibility, and permission discipline.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Show enterprise readiness without bloating top-level navigation.',
    outcomes: [
      'Immutable audit behavior becomes easier to explain.',
      'Permissioning becomes clearer by role and responsibility.',
      'Governance remains embedded inside the commercial flow.',
    ],
  },
  {
    sprint: 'Sprint 9',
    summary: 'Extend My Card and share-contact loops into structured lead generation.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Convert offline relationship moments into lead capture and quote demand.',
    outcomes: [
      'QR-based sharing remains tied to real lead creation.',
      'My Card stays an outbound identity layer, not a separate product track.',
      'Capture remains the intake bridge for public interactions.',
    ],
  },
  {
    sprint: 'Sprint 10',
    summary: 'Layer in analytics, automation, and broader integrations after workflow maturity is proven.',
    badgeLabel: 'Locked',
    status: 'locked',
    objective: 'Scale only after the operating model is coherent and trusted.',
    outcomes: [
      'Analytics and executive visibility build on stable commercial truth.',
      'Automation is introduced after process clarity, not before it.',
      'External integrations stay subordinate to the core workflow story.',
    ],
  },
];

export const backlogSections: BacklogSection[] = [
  {
    title: 'Sprint 2 · Active',
    heading: 'Finish the Quote → Order transition cleanly',
    sprint: 'Sprint 2',
    badgeLabel: 'Active',
    summary:
      'Complete the active implementation lane using the deployed foundations and the restored planning operating system.',
    description:
      'Sprint 2 is focused on Quote → Order continuity, order-entry operational honesty, and validation of the current repo state.',
    status: 'in-progress',
    items: [
      {
        title: 'Restore development planning contracts across the /development workplace',
        note: 'Undo the planning-model collapse so pages stop depending on a simplified emergency structure.',
        stateLabel: 'Done',
        status: 'done',
      },
      {
        title: 'Refine Order entry details and first operational states',
        note: 'Keep inherited quote context, document pack visibility, blockers, and execution-readiness cues visible in Order.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Deepen Quote → Order continuity around approvals, blockers, and handoff honesty',
        note: 'Make the transition operationally truthful before later execution stages are expanded.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Run the full application build against the restored planning contracts',
        note: 'Required in the complete workspace before claiming that /development pages are compile-safe end to end.',
        stateLabel: 'Next',
        status: 'next',
      },
    ],
  },
  {
    title: 'Sprint 3 · Next',
    heading: 'Expand operational depth after Order is stable',
    sprint: 'Sprint 3',
    badgeLabel: 'Next',
    summary: 'Prepare the next lane without activating it early.',
    description: 'Deepen role-aware execution flow only after Sprint 2 order continuity is stable.',
    status: 'next',
    items: [
      {
        title: 'Add role-based visibility and workflow continuity',
        note: 'Managers and reps should see the right emphasis without changing the locked flow.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Harden operational order stages beyond creation',
        note: 'Expand follow-through states after the first-order handoff is validated.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Carry the CRM story forward beyond order creation',
        note: 'Preserve narrative continuity without reopening the product shell.',
        stateLabel: 'Next',
        status: 'next',
      },
    ],
  },
  {
    title: 'Sprint 4–5 · Planned',
    heading: 'Governance and intake wedge expansion',
    sprint: 'Sprint 4–5',
    badgeLabel: 'Next',
    summary: 'Keep trust layers and intake strength visible in sequence.',
    description: 'Approvals, locking, and Capture depth remain planned but not active during Sprint 2.',
    status: 'next',
    items: [
      {
        title: 'Strengthen approvals, locking, and post-send discipline',
        note: 'Enterprise trust layers should be visible within Quote and Order, not as detached modules.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Expand Capture ingestion for cards, vCards, RFQs, and pasted buyer text',
        note: 'Capture remains the intake wedge that differentiates Setu Flow from generic CRMs.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Preserve create-lead, merge-existing, and draft-quote actions in intake planning',
        note: 'These actions are part of the intended operating model, not optional UI clutter.',
        stateLabel: 'Next',
        status: 'next',
      },
    ],
  },
  {
    title: 'Sprint 6–7 · Locked',
    heading: 'Dashboard maturity and quote-builder depth',
    sprint: 'Sprint 6–7',
    badgeLabel: 'Locked',
    summary: 'Keep later-stage maturity visible without pulling it into current implementation.',
    description: 'Dashboard and quote-builder deepening are locked until the core order path is proven.',
    status: 'locked',
    items: [
      {
        title: 'Rebuild Dashboard as situational awareness',
        note: 'Today’s actions, pipeline health, and risk come before ornamental metrics.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Deepen quote-builder guidance and pricing support',
        note: 'Complexity belongs in services and rules, not in surface clutter.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Protect workflow-first navigation clarity',
        note: 'Avoid reintroducing top-level module sprawl.',
        stateLabel: 'Locked',
        status: 'locked',
      },
    ],
  },
  {
    title: 'Sprint 8–10 · Locked',
    heading: 'Confidence layers, sharing loops, and scaling systems',
    sprint: 'Sprint 8–10',
    badgeLabel: 'Locked',
    summary: 'Analytics, automation, sharing loops, and integrations stay visible but inactive.',
    description: 'These lanes depend on the core operating model being coherent, trusted, and stable first.',
    status: 'locked',
    items: [
      {
        title: 'Add audit, approval visibility, and role permissions at enterprise depth',
        note: 'These are buyer-confidence layers and must remain embedded in the main workflow.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Extend My Card and QR sharing into lead creation loops',
        note: 'Outbound identity should feed Capture and Lead creation, not drift into a detached feature track.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Introduce analytics, automation, and integrations after workflow maturity',
        note: 'Do not activate scaling layers before the operating model is stable.',
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
    summary: 'Turn messy real-world trade inputs into structured next actions.',
    status: 'next',
    scope: ['Business card scan', 'vCard import', 'RFQ intake', 'Buyer text parsing', 'Lead merge and draft quote actions'],
  },
  {
    id: 'lead',
    title: 'Lead operating area',
    summary: 'Keep list, detail, timeline, next action, and create-quote continuity simple and clear.',
    status: 'done',
    scope: ['Lead list', 'Lead detail', 'Timeline', 'Next actions', 'Create quote entry'],
  },
  {
    id: 'quote',
    title: 'Quote hero workflow',
    summary: 'Quotes remain the most visible commercial control point in the product.',
    status: 'in-progress',
    scope: ['Guided builder', 'Pricing support', 'Terms', 'Review', 'Send', 'Approvals', 'Versioning', 'Locking'],
  },
  {
    id: 'order',
    title: 'Order execution entry',
    summary: 'Accepted quotes become execution-ready orders with frozen context and visible blockers.',
    status: 'in-progress',
    scope: ['Snapshot', 'Documents', 'Compliance', 'Operations tabs', 'Execution readiness', 'Blockers'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard awareness layer',
    summary: 'Dashboard should summarize action and risk, not compete with the workflow itself.',
    status: 'locked',
    scope: ['Today actions', 'Pipeline health', 'At-risk work', 'Trade intelligence'],
  },
  {
    id: 'my-card',
    title: 'My Card sharing loop',
    summary: 'Outbound contact sharing should feed back into lead generation and quote demand.',
    status: 'locked',
    scope: ['QR share', 'Contact save', 'Public card view', 'Request quote call-to-action'],
  },
];

export const architectureLanes: ArchitectureLane[] = [
  {
    id: 'workflow-shell',
    title: 'Workflow-first shell',
    summary: 'Keep top-level product understanding anchored to Leads, Quotes, Orders, Dashboard, and Admin.',
    status: 'done',
    target: 'Users should understand the product in minutes without navigating module clutter.',
  },
  {
    id: 'hidden-services',
    title: 'Complexity hidden in services',
    summary: 'RFQ, documents, contracts, compliance, and pricing logic stay behind the workflow shell.',
    status: 'in-progress',
    target: 'Surface only what helps the user move Capture → Lead → Quote → Order forward.',
  },
  {
    id: 'quote-order-contract',
    title: 'Quote → Order contract',
    summary: 'Accepted quote state must convert into an order snapshot with inherited commercial truth.',
    status: 'in-progress',
    target: 'Preserve execution integrity after conversion.',
  },
  {
    id: 'trust-layers',
    title: 'Approvals, audit, and locking',
    summary: 'Trust layers should be visible and embedded, not treated as detached admin concepts.',
    status: 'next',
    target: 'Reduce buyer fear and operational ambiguity.',
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
    id: 'trust-visible',
    title: 'Trust controls must be visible',
    rule: 'Approvals, locking, versioning, and audit cues should be obvious at the moments of risk and change.',
    status: 'next',
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
    route: '/workspace/dashboard',
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
    route: '/development/screens/leads-capture',
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
    title: 'Guided Quote Builder',
    route: '/workspace/quotes',
    summary: 'Quote creation is a guided commercial workflow rather than a dense admin form.',
    status: 'done',
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
    route: '/workspace/orders',
    summary: 'Orders continue the story after quote acceptance instead of becoming a dead end.',
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
    route: '/workspace/my-card',
    summary: 'Outbound contact sharing turns offline interactions into structured leads.',
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
  flow: 'Capture → Lead → Quote → Order',
  activeSprint: 'Sprint 2',
  completedSprint: 'Sprint 1',
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
