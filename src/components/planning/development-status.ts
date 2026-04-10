export type ChecklistStatus = 'done' | 'in-progress' | 'next' | 'locked';

type ReadinessArea = {
  title: string;
  summary: string;
  status: ChecklistStatus;
};

type ChecklistItem = {
  id: string;
  area: string;
  label: string;
  note: string;
  status: ChecklistStatus;
};

type RoadmapMilestone = {
  sprint: string;
  summary: string;
  badgeLabel: string;
  status: ChecklistStatus;
};

type BacklogItem = {
  title: string;
  note: string;
  stateLabel: string;
  status: ChecklistStatus;
};

type BacklogSection = {
  title: string;
  heading: string;
  sprint: string;
  badgeLabel: string;
  summary: string;
  description: string;
  status: ChecklistStatus;
  items: BacklogItem[];
};

export const sprintProgress = {
  sprint: 'Sprint 2',
  percent: 44,
  percentLabel: '44%',
};

export const sprintFocus = {
  sprint: 'Sprint 2',
  title: 'Complete the Quote → Order transition without redesigning the product structure.',
  nextAction:
    'Refine Order operational states, document readiness, and execution handoff cues while keeping Quote → Order continuity visible.',
  flow: 'Capture → Lead → Quote → Order',
};

export const readinessSummary = {
  status: 'Sprint 2 active',
  buildStatus: 'Re-run in full environment',
  driftRisk: 'Controlled',
  blockers: 'Latest Sprint 2 changes still require a full production build confirmation in the complete workspace.',
};

export const readinessAreas: ReadinessArea[] = [
  {
    title: 'Sprint alignment',
    summary: 'Sprint 1 remains complete and Sprint 2 is the only active implementation lane.',
    status: 'done',
  },
  {
    title: 'Quote to Order continuity',
    summary: 'Quote now shows approval gating, order conversion, and visible carry-forward into Order.',
    status: 'done',
  },
  {
    title: 'Order operational detail',
    summary: 'Order exposes inherited context, document readiness, and execution blockers without redesigning the structure.',
    status: 'in-progress',
  },
  {
    title: 'Build validation',
    summary: 'Install and typecheck have passed, but the latest Sprint 2 repo state still needs full-environment production build confirmation.',
    status: 'next',
  },
];

export const checklistItems: ChecklistItem[] = [
  {
    id: 's1-signoff',
    area: 'Sprint status',
    label: 'Sprint 1 signoff preserved',
    note: 'Sprint 1 stays complete and is no longer the active execution lane.',
    status: 'done',
  },
  {
    id: 's2-active',
    area: 'Sprint status',
    label: 'Sprint 2 activated in development workplace',
    note: 'Backlog, readiness, and master plan all point to Sprint 2 as the active sprint.',
    status: 'done',
  },
  {
    id: 'quote-order-handoff',
    area: 'Quote to Order',
    label: 'Quote includes Convert to Order action and approval gate',
    note: 'Commercial carry-forward is visible before conversion into Order.',
    status: 'done',
  },
  {
    id: 'order-entry',
    area: 'Order workspace',
    label: 'Order entry surface exists and uses shared UI foundations',
    note: 'Order reflects inherited context from Quote and keeps execution states visible.',
    status: 'done',
  },
  {
    id: 'order-ops-detail',
    area: 'Order workspace',
    label: 'Operational detail is being deepened',
    note: 'Document pack, execution blockers, and readiness cues are active but still need complete-environment validation.',
    status: 'in-progress',
  },
  {
    id: 'build-validation',
    area: 'Validation',
    label: 'Full production build rerun for Sprint 2 state',
    note: 'Required after the latest Quote and Order changes in the complete workspace.',
    status: 'next',
  },
];

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    sprint: 'Sprint 1',
    summary: 'Core Capture → Lead → Quote foundations are complete and validated.',
    badgeLabel: 'Done',
    status: 'done',
  },
  {
    sprint: 'Sprint 2',
    summary: 'Complete Quote → Order continuity, approval clarity, and first operational order states.',
    badgeLabel: 'Active',
    status: 'in-progress',
  },
  {
    sprint: 'Sprint 3',
    summary: 'Deepen order execution, role-based continuity, and operational hardening.',
    badgeLabel: 'Next',
    status: 'next',
  },
  {
    sprint: 'Sprint 4+',
    summary: 'Analytics, automation, and broader integrations only after core flow maturity.',
    badgeLabel: 'Locked',
    status: 'locked',
  },
];

export const backlogSections: BacklogSection[] = [
  {
    title: 'Sprint 2 · Active',
    heading: 'Finish the Quote → Order transition cleanly',
    sprint: 'Sprint 2 · Active',
    badgeLabel: 'Active',
    summary:
      'Complete the active Sprint 2 lane using the existing shared foundations and the locked Capture → Lead → Quote → Order flow.',
    description: 'Complete the Quote → Order transition using the existing shared foundations and locked flow.',
    status: 'in-progress',
    items: [
      {
        title: 'Refine Order entry details and first operational states',
        note: 'Keep inherited context, document pack visibility, and execution-readiness cues visible inside Order.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Deepen Quote → Order continuity around blockers, documents, and execution readiness',
        note: 'Make the handoff operationally honest before later execution stages exist.',
        stateLabel: 'In progress',
        status: 'in-progress',
      },
      {
        title: 'Re-run full-environment production build validation for the Sprint 2 repo state',
        note: 'Use the complete workspace to confirm the latest Sprint 2 changes after the current patch set.',
        stateLabel: 'Next',
        status: 'next',
      },
    ],
  },
  {
    title: 'Sprint 3 · Next',
    heading: 'Expand operational depth after Order is stable',
    sprint: 'Sprint 3 · Next',
    badgeLabel: 'Next',
    summary: 'Prepare the next sprint without activating it early.',
    description: 'Expand operational depth after the Order transition is stable.',
    status: 'next',
    items: [
      {
        title: 'Role-based visibility and workflow continuity',
        note: 'Add guarded visibility only after core order creation is stable.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Operational hardening across later order stages',
        note: 'Deepen the execution model after the first-order handoff is validated.',
        stateLabel: 'Next',
        status: 'next',
      },
      {
        title: 'Pipeline continuity beyond first-order creation',
        note: 'Carry the CRM story forward without disrupting the current active sprint.',
        stateLabel: 'Next',
        status: 'next',
      },
    ],
  },
  {
    title: 'Sprint 4+ · Locked',
    heading: 'Keep later-stage work visible but inactive',
    sprint: 'Sprint 4+ · Locked',
    badgeLabel: 'Locked',
    summary: 'Maintain visibility into future expansion without pulling it into the current sprint.',
    description: 'Keep later-stage intelligence and automation visible without activating it early.',
    status: 'locked',
    items: [
      {
        title: 'Analytics and executive visibility',
        note: 'Reserved for a later maturity stage.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Automation and AI layers',
        note: 'Do not activate until the core operational flow is stable.',
        stateLabel: 'Locked',
        status: 'locked',
      },
      {
        title: 'Broader systems integrations',
        note: 'Only after the core CRM execution path is proven.',
        stateLabel: 'Locked',
        status: 'locked',
      },
    ],
  },
];
