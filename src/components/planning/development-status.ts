export type ChecklistStatus = 'done' | 'in-progress' | 'next' | 'locked';

export const sprintProgress = {
  sprint: 'Sprint 2',
  percent: 44,
  percentLabel: '44%',
};

export const sprintFocus = {
  sprint: 'Sprint 2',
  title: 'Complete the Quote → Order transition without redesigning the product structure.',
  nextAction: 'Refine Order operational states, documents, and execution readiness while keeping Quote → Order continuity visible.',
  flow: 'Capture → Lead → Quote → Order',
};

export const readinessSummary = {
  status: 'Sprint 2 active',
  buildStatus: 'Re-run in full environment',
  driftRisk: 'Controlled',
  blockers: 'Full production build confirmation still pending for latest Sprint 2 changes.',
};

export const readinessAreas = [
  {
    title: 'Sprint alignment',
    summary: 'Sprint 1 is complete and Sprint 2 is now the active implementation lane.',
    status: 'done' as ChecklistStatus,
  },
  {
    title: 'Quote to Order continuity',
    summary: 'Convert to Order, approval gate, and carried commercial context are visible in Quote.',
    status: 'done' as ChecklistStatus,
  },
  {
    title: 'Order operational states',
    summary: 'Order now shows inherited context, document pack, and execution-readiness separation.',
    status: 'in-progress' as ChecklistStatus,
  },
  {
    title: 'Build validation',
    summary: 'Install and typecheck have passed, but the full production build still needs complete-environment confirmation.',
    status: 'next' as ChecklistStatus,
  },
];

export const checklistItems = [
  {
    id: 's1-signoff',
    area: 'Sprint status',
    label: 'Sprint 1 signoff preserved',
    note: 'Sprint 1 remains complete and is no longer the active execution lane.',
    status: 'done' as ChecklistStatus,
  },
  {
    id: 's2-active',
    area: 'Sprint status',
    label: 'Sprint 2 activated in development workplace',
    note: 'Readiness, backlog, and master plan all show Sprint 2 as the active sprint.',
    status: 'done' as ChecklistStatus,
  },
  {
    id: 'quote-order-handoff',
    area: 'Quote to Order',
    label: 'Quote includes Convert to Order action and approval gate',
    note: 'Commercial carry-forward is visible before conversion into Order.',
    status: 'done' as ChecklistStatus,
  },
  {
    id: 'order-entry',
    area: 'Order workspace',
    label: 'Order entry surface exists and uses shared UI foundations',
    note: 'Order reflects inherited context from Quote and keeps execution states visible.',
    status: 'done' as ChecklistStatus,
  },
  {
    id: 'order-ops-detail',
    area: 'Order workspace',
    label: 'Operational detail is being deepened',
    note: 'Document pack, execution blockers, and readiness cues are active but still need complete-environment validation.',
    status: 'in-progress' as ChecklistStatus,
  },
  {
    id: 'build-validation',
    area: 'Validation',
    label: 'Full production build rerun for Sprint 2 state',
    note: 'Required after the latest Quote and Order changes in the complete workspace.',
    status: 'next' as ChecklistStatus,
  },
];

export const roadmapMilestones = [
  {
    sprint: 'Sprint 1',
    summary: 'Core Capture → Lead → Quote foundations are complete and validated.',
    badgeLabel: 'Done',
    status: 'done' as ChecklistStatus,
  },
  {
    sprint: 'Sprint 2',
    summary: 'Complete Quote → Order continuity, approval clarity, and first operational order states.',
    badgeLabel: 'Active',
    status: 'in-progress' as ChecklistStatus,
  },
  {
    sprint: 'Sprint 3',
    summary: 'Deepen order execution, role-based continuity, and operational hardening.',
    badgeLabel: 'Next',
    status: 'next' as ChecklistStatus,
  },
  {
    sprint: 'Sprint 4+',
    summary: 'Analytics, automation, and broader integrations only after core flow maturity.',
    badgeLabel: 'Locked',
    status: 'locked' as ChecklistStatus,
  },
];

export const backlogSections = [
  {
    title: 'Sprint 2 · Active',
    heading: 'Finish the Quote → Order transition cleanly',
    sprint: 'Sprint 2 · Active',
    badgeLabel: 'Active',
    summary: 'Complete the active Sprint 2 lane using the existing shared foundations and locked Capture → Lead → Quote → Order flow.',
    description: 'Complete the Quote → Order transition using the existing shared foundations and locked flow.',
    status: 'in-progress' as ChecklistStatus,
    items: [
      {
        title: 'Refine Order entry details and first operational states',
        summary: 'Keep inherited context, documents, and execution cues visible inside Order.',
      },
      {
        title: 'Deepen Quote → Order continuity around blockers, documents, and execution readiness',
        summary: 'Make the handoff feel operationally honest before later execution stages exist.',
      },
      {
        title: 'Re-run full-environment production build validation for the Sprint 2 repo state',
        summary: 'Use the complete workspace to confirm the latest Sprint 2 changes after patching.',
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
    status: 'next' as ChecklistStatus,
    items: [
      {
        title: 'Role-based visibility and workflow continuity',
        summary: 'Add guarded visibility only after core order creation is stable.',
      },
      {
        title: 'Operational hardening across later order stages',
        summary: 'Deepen the execution model after the first-order handoff is validated.',
      },
      {
        title: 'Pipeline continuity beyond first-order creation',
        summary: 'Carry the CRM story forward without disrupting the current active sprint.',
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
    status: 'locked' as ChecklistStatus,
    items: [
      {
        title: 'Analytics and executive visibility',
        summary: 'Reserved for a later maturity stage.',
      },
      {
        title: 'Automation and AI layers',
        summary: 'Do not activate until the core operational flow is stable.',
      },
      {
        title: 'Broader systems integrations',
        summary: 'Only after the core CRM execution path is proven.',
      },
    ],
  },
];
