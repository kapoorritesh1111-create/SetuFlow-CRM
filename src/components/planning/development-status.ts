export type ChecklistStatus = 'done' | 'in-progress' | 'next' | 'locked';

export type ChecklistItem = {
  id: string;
  area:
    | 'Workspace discipline'
    | 'Planning discipline'
    | 'UI foundation'
    | 'Leads'
    | 'Capture'
    | 'Quote'
    | 'Order'
    | 'Validation';
  label: string;
  status: ChecklistStatus;
  note: string;
};

export const sprintProgress = {
  currentSprint: 'Sprint 1',
  completion: 97,
  percentLabel: '97% complete',
};

export const sprintFocus = {
  sprint: sprintProgress.currentSprint,
  title:
    'Sprint 1 is 97% complete. Leads, Capture, and Quote are built inside the locked flow; only full-environment build, deployment, and runtime signoff remain before closure.',
  flow: 'Capture → Lead → Quote → Order',
  nextAction:
    'Use the complete workspace to rerun the full production build, deployment validation, and route-level runtime confirmation, then mark Sprint 1 Complete without pulling Sprint 2 work active early.',
};

export type RoadmapMilestone = {
  sprint: string;
  status: ChecklistStatus;
  badgeLabel: string;
  summary: string;
};

export type BacklogSection = {
  title: string;
  heading: string;
  status: ChecklistStatus;
  badgeLabel: string;
  summary: string;
  items: Array<{
    title: string;
    note: string;
    status: ChecklistStatus;
    stateLabel: string;
  }>;
};

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    sprint: 'Sprint 1',
    status: 'in-progress',
    badgeLabel: '97% complete',
    summary:
      'Product implementation for Leads, Capture, and Quote is locked. Remaining work is validation-only in the real environment before signoff.',
  },
  {
    sprint: 'Sprint 2',
    status: 'next',
    badgeLabel: 'Ready next',
    summary:
      'Capture the next depth layer by extending Quote into Order and completing approval completion states without redesigning the product structure.',
  },
  {
    sprint: 'Sprint 3',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'Simplify and harden the Lead workspace so qualification, ownership, next action, and quote initiation feel operationally complete.',
  },
  {
    sprint: 'Sprint 4',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'Move Quotes from polished entry to guided builder depth with review, versioning, send checkpoints, and stronger trust states.',
  },
  {
    sprint: 'Sprint 5',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'Add the trust layer: approvals, audit trail, lock states, and progression rules that make the commercial path enterprise-safe.',
  },
  {
    sprint: 'Sprint 6',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'Deepen Orders so accepted quotes become execution-ready operating objects with document and compliance structure.',
  },
  {
    sprint: 'Sprint 7',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'Rebuild Dashboard into an action-first operating view instead of a passive summary surface.',
  },
  {
    sprint: 'Sprint 8',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'Bring My Card and outbound share flow into the system as a disciplined top-of-funnel entry that still reinforces the main operating path.',
  },
  {
    sprint: 'Sprint 9',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'Perform architecture cleanup so domains, services, and route ownership stay maintainable as the product matures.',
  },
  {
    sprint: 'Sprint 10',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'Prepare buyer demo, leadership walkthrough, and release readiness proof based on the now-complete operating path.',
  },
];

export const backlogSections: BacklogSection[] = [
  {
    title: 'Sprint 1 · Active · 97%',
    heading: 'Only final environment validation and signoff remain.',
    status: 'in-progress',
    badgeLabel: 'Current sprint',
    summary:
      'We are near closure, not restarting. Sprint 1 implementation is complete in the locked workspace and only real-environment confirmation remains.',
    items: [
      {
        title: 'Run the full production build in the complete workspace',
        note: 'Confirm the optimized production build finishes cleanly after the cleanup and planning realignment passes.',
        status: 'in-progress',
        stateLabel: 'Active',
      },
      {
        title: 'Run deployment validation and route-level smoke testing',
        note: 'Confirm /development, /workspace/leads, /workspace/capture, and /workspace/quotes all load without regressions in the real environment.',
        status: 'next',
        stateLabel: 'Next',
      },
      {
        title: 'Finalize readiness to Sprint 1 Complete',
        note: 'Close Sprint 1 only after build, deploy, and runtime confirmation are recorded in the repo-backed workplace.',
        status: 'next',
        stateLabel: 'Next',
      },
    ],
  },
  {
    title: 'Sprint 2 · Capture foundation',
    heading: 'Start only after Sprint 1 signoff.',
    status: 'next',
    badgeLabel: 'Ready next',
    summary:
      'Recover the original sequence by making Capture a stronger intake foundation inside the locked flow instead of jumping straight into unrelated expansion.',
    items: [
      {
        title: 'Create unified Capture entry under Leads',
        note: 'Keep intake anchored to the operating path rather than spinning off new structural modules.',
        status: 'next',
        stateLabel: 'Queued',
      },
      {
        title: 'Deepen intake review for vCard, business card, and document upload',
        note: 'Strengthen the review shell so messy real-world inputs become structured commercial context.',
        status: 'next',
        stateLabel: 'Queued',
      },
      {
        title: 'Add stronger confidence and duplicate handling states',
        note: 'Make rep review clearer before records move into qualified Lead or Draft Quote paths.',
        status: 'next',
        stateLabel: 'Queued',
      },
    ],
  },
  {
    title: 'Sprint 3 · Lead simplification',
    heading: 'Make the Lead surface operationally obvious.',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'The old repo showed that Leads still had further simplification work beyond Sprint 1 polish. That sequence should remain visible.',
    items: [
      {
        title: 'Reduce lead surface complexity',
        note: 'Strip away competing branches so the screen has one dominant operating decision at a time.',
        status: 'locked',
        stateLabel: 'Planned',
      },
      {
        title: 'Make Create Quote the dominant CTA',
        note: 'Keep qualification and commercial progression pointed toward quote creation instead of fragmented actions.',
        status: 'locked',
        stateLabel: 'Planned',
      },
      {
        title: 'Unify activity and next-step surfaces',
        note: 'Preserve one readable operational thread instead of multiple disconnected side panels or state pockets.',
        status: 'locked',
        stateLabel: 'Planned',
      },
    ],
  },
  {
    title: 'Sprint 4 · Quote builder core',
    heading: 'Take Quote from entry clarity into guided builder depth.',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'Sprint 1 built Quote entry trust and carry-forward clarity. The old roadmap correctly reserved builder depth for a later sprint.',
    items: [
      {
        title: 'Build guided quote steps',
        note: 'Turn Draft Quote into a clearer working sequence without breaking the locked product map.',
        status: 'locked',
        stateLabel: 'Planned',
      },
      {
        title: 'Define draft, pricing, and review structure',
        note: 'Move from message-level helper copy into a more complete quote operating model.',
        status: 'locked',
        stateLabel: 'Planned',
      },
      {
        title: 'Add version history and send checkpoints',
        note: 'Make the commercial review path more disciplined before trust-layer rules land in full.',
        status: 'locked',
        stateLabel: 'Planned',
      },
    ],
  },
  {
    title: 'Sprint 5 · Trust layer',
    heading: 'Enterprise control after quote builder depth exists.',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'The old plan clearly separated core Quote buildout from the trust layer. That separation should stay visible to prevent rushed scope merging.',
    items: [
      {
        title: 'Add approval rules',
        note: 'Move from approval cues into explicit policy-driven approval states and outcomes.',
        status: 'locked',
        stateLabel: 'Planned',
      },
      {
        title: 'Add audit trail structure',
        note: 'Make review, approval, change history, and accountability visible and durable.',
        status: 'locked',
        stateLabel: 'Planned',
      },
      {
        title: 'Add quote locking after send and approval',
        note: 'Protect commercial integrity after critical transitions.',
        status: 'locked',
        stateLabel: 'Planned',
      },
    ],
  },
  {
    title: 'Sprint 6 · Orders foundation',
    heading: 'Create the real post-quote operating object.',
    status: 'locked',
    badgeLabel: 'Planned',
    summary:
      'Orders should deepen only after Quote behavior and trust controls are in place, exactly as the old repo sequence implied.',
    items: [
      {
        title: 'Create Orders module and accepted-quote snapshot path',
        note: 'Make accepted commercial decisions operationally actionable without inventing alternate paths.',
        status: 'locked',
        stateLabel: 'Planned',
      },
      {
        title: 'Fold documents and compliance into order detail',
        note: 'Carry execution readiness forward inside Order rather than splitting it into detached utilities.',
        status: 'locked',
        stateLabel: 'Planned',
      },
    ],
  },
  {
    title: 'Sprint 7 · Dashboard rebuild',
    heading: 'Make the dashboard action-first.',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'Dashboard belongs later. It should summarize and accelerate the core flow, not become the primary place where work happens.',
    items: [
      {
        title: 'Rebuild dashboard around action-first operating cues',
        note: 'Remove passive vanity metrics and make next action obvious.',
        status: 'locked',
        stateLabel: 'Future',
      },
      {
        title: 'Add trade map and geographic drill-down',
        note: 'Show useful management insight only after the operating path is proven.',
        status: 'locked',
        stateLabel: 'Future',
      },
    ],
  },
  {
    title: 'Sprint 8 · My Card and outbound share',
    heading: 'Top-of-funnel capability should still reinforce the main system.',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'The older repo treated My Card as part of the product roadmap. Keep it visible without letting it interrupt core execution work.',
    items: [
      {
        title: 'Build My Card page and QR/public share flow',
        note: 'Keep it tied to request-quote and contact capture paths instead of becoming a standalone side product.',
        status: 'locked',
        stateLabel: 'Future',
      },
    ],
  },
  {
    title: 'Sprint 9 · Architecture cleanup',
    heading: 'Clean structure after product depth proves out.',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'The older repo was right to call out architecture cleanup as a deliberate sprint. It should not be forgotten just because the repo was slimmed down.',
    items: [
      {
        title: 'Split god files and reduce route sprawl',
        note: 'Refactor only when ownership gets clearer and the flow becomes easier to reason about.',
        status: 'locked',
        stateLabel: 'Future',
      },
      {
        title: 'Re-home services into clearer domains',
        note: 'Use the architecture contract to drive service boundaries instead of ad hoc convenience moves.',
        status: 'locked',
        stateLabel: 'Future',
      },
    ],
  },
  {
    title: 'Sprint 10 · Demo and release readiness',
    heading: 'Prove the system, then prepare the release story.',
    status: 'locked',
    badgeLabel: 'Future',
    summary:
      'This remains the final proving sprint: buyer demo, leadership walkthrough, and full readiness criteria.',
    items: [
      {
        title: 'Prepare buyer demo script and leadership walkthrough',
        note: 'Use the final built operating path as the story backbone.',
        status: 'locked',
        stateLabel: 'Future',
      },
      {
        title: 'Verify end-to-end readiness against release criteria',
        note: 'Close the loop between product, UX, trust, technical structure, and demo proof.',
        status: 'locked',
        stateLabel: 'Future',
      },
    ],
  },
];

export const checklistItems: ChecklistItem[] = [
  {
    id: 'repo-cleanup',
    area: 'Workspace discipline',
    label: 'Clean the repo without deleting the real operating system that keeps sprint sequencing and scope visible.',
    status: 'done',
    note: 'The repo is lean, but the development workplace again includes backlog, architecture, product contract, and UX rules so cleanup does not equal amnesia.',
  },
  {
    id: 'single-dev-workplace',
    area: 'Workspace discipline',
    label: 'Keep one active development workplace at /development with master plan, readiness, backlog, product, architecture, UX rules, and locked screen specs.',
    status: 'done',
    note: 'Operational control lives in one in-app workplace rather than scattered markdown files or conflicting route clusters.',
  },
  {
    id: 'backlog-discipline',
    area: 'Planning discipline',
    label: 'Keep the sprint backlog inside the HTML development workplace and preserve the full step sequence of remaining work.',
    status: 'done',
    note: 'The backlog again shows the real phased plan through Sprint 10 instead of collapsing later work into a vague future bucket.',
  },
  {
    id: 'html-visibility',
    area: 'Workspace discipline',
    label: 'Make the Master Checklist and Readiness status visible inside the HTML development workplace.',
    status: 'done',
    note: 'Checklist and readiness stay repo-backed and visible from the main development hub.',
  },
  {
    id: 'product-contract',
    area: 'Planning discipline',
    label: 'Keep the locked product contract visible so every sprint reinforces Capture → Lead → Quote → Order instead of drifting into side modules.',
    status: 'done',
    note: 'Product contract is restored as an in-app page and a clean doc reference.',
  },
  {
    id: 'architecture-contract',
    area: 'Planning discipline',
    label: 'Keep the architecture contract visible so later implementation depth does not turn into route sprawl or god-file creep.',
    status: 'done',
    note: 'Architecture guidance is restored without bringing back archive clutter.',
  },
  {
    id: 'ux-rules',
    area: 'Planning discipline',
    label: 'Keep the UX rules visible so future iterations stay trainable, action-first, and enterprise-safe.',
    status: 'done',
    note: 'UX rules now live in the development workplace again instead of being lost in cleanup.',
  },
  {
    id: 'ui-foundations',
    area: 'UI foundation',
    label: 'Build reusable UI foundations: StatusBadge, LeadCard, QuickActionMenu, PageHeader, SectionCard.',
    status: 'done',
    note: 'Shared components remain the base for all active Sprint 1 surfaces.',
  },
  {
    id: 'leads-application',
    area: 'Leads',
    label: 'Apply and refine the shared UI foundation in the Leads workspace preview.',
    status: 'done',
    note: 'Leads stays aligned to inherited-context, rep-review, and approval-gate language around the Quote handoff.',
  },
  {
    id: 'capture-application',
    area: 'Capture',
    label: 'Apply and refine the shared UI foundation in the Capture workspace preview.',
    status: 'done',
    note: 'Capture stays aligned to the same Sprint 1 handoff language and Create Lead versus Lead + Draft Quote guidance.',
  },
  {
    id: 'quote-entry-clarity',
    area: 'Quote',
    label: 'Keep Quote entry aligned to carried context, rep review, approval cues, and pricing-assumption clarity.',
    status: 'done',
    note: 'Quote entry shows inherited context before pricing and terms editing without changing the locked structure.',
  },
  {
    id: 'order-visibility',
    area: 'Order',
    label: 'Keep Order visible as the next structural step in the product map even while detailed Order work stays in later sprints.',
    status: 'done',
    note: 'The roadmap again makes Order depth an intentional next-stage build instead of a lost placeholder.',
  },
  {
    id: 'validation-pass',
    area: 'Validation',
    label: 'Run the validation pass available in the clean workspace and record the boundary to full-environment confirmation honestly.',
    status: 'done',
    note: 'npm ci and typecheck passed in the clean workspace. Full production-build and deployment confirmation still belongs to the complete environment.',
  },
  {
    id: 'sprint-1-complete-gate',
    area: 'Validation',
    label: 'Finalize readiness to Sprint 1 Complete after full-environment build, deployment validation, and runtime confirmation.',
    status: 'in-progress',
    note: 'This is the last 3% of Sprint 1. Implementation is complete and only full-environment confirmation remains.',
  },
];

export const readinessSummary = {
  sprint: sprintFocus.sprint,
  status: 'Sprint 1 is 97% complete; implementation is locked and only real-environment validation remains before signoff',
  buildStatus:
    'Clean-workspace validation completed through npm ci and typecheck. Full production build, deployment validation, and runtime confirmation must be rerun in the complete workspace before marking Sprint 1 Complete.',
  driftRisk: 'Low after planning realignment',
  blockers:
    'No product blockers. Remaining gate is environment-level build, deploy, and runtime confirmation in the complete workspace.',
};

export const readinessAreas = [
  {
    title: 'Development workplace lock',
    status: 'done' as ChecklistStatus,
    summary: 'The active repo again points to one development workplace that includes the real planning controls: hub, master plan, readiness, backlog, product, architecture, UX rules, and screen specs.',
  },
  {
    title: 'Roadmap continuity',
    status: 'done' as ChecklistStatus,
    summary: 'The old step sequence is restored in-app through Sprint 10 so later work stays visible and ordered instead of being flattened into vague future scope.',
  },
  {
    title: 'UI foundation status',
    status: 'done' as ChecklistStatus,
    summary: 'Shared StatusBadge, LeadCard, QuickActionMenu, PageHeader, and SectionCard continue to power the active Sprint 1 surfaces.',
  },
  {
    title: 'Leads status',
    status: 'done' as ChecklistStatus,
    summary: 'Qualified-lead selection previews carried Draft Quote context and explains the handoff without changing the Leads surface structure.',
  },
  {
    title: 'Capture status',
    status: 'done' as ChecklistStatus,
    summary: 'Capture review previews the Draft Quote carry-forward payload and distinguishes Create Lead from Lead + Draft Quote without ambiguity.',
  },
  {
    title: 'Quote status',
    status: 'done' as ChecklistStatus,
    summary: 'Quote entry separates inherited context from review-needed assumptions, keeps approval cues visible, and clarifies what the rep must confirm before send.',
  },
  {
    title: 'Validation status',
    status: 'in-progress' as ChecklistStatus,
    summary: 'Checklist and readiness reflect true near-complete state. The last remaining gate is a successful complete-environment build, deployment validation, and runtime smoke test.',
  },
  {
    title: 'Next safe move',
    status: 'next' as ChecklistStatus,
    summary: 'Do not activate Sprint 2 work yet. Finish the real-environment validation pass, mark Sprint 1 Complete, then pull the next sprint active from backlog.',
  },
];
