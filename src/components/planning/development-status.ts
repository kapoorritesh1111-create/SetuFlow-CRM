export type ChecklistStatus = 'done' | 'in-progress' | 'next' | 'locked';

export type ChecklistItem = {
  id: string;
  area: 'Workspace discipline' | 'Planning discipline' | 'UI foundation' | 'Leads' | 'Capture' | 'Quote' | 'Validation';
  label: string;
  status: ChecklistStatus;
  note: string;
};

export const sprintFocus = {
  sprint: 'Sprint 1',
  title: 'Sprint 1 implementation complete with a clean minimal repo baseline and full-environment validation still pending',
  flow: 'Capture → Lead → Quote → Order',
  nextAction:
    'Use the complete workspace to rerun the full production build and deployment validation, then mark Sprint 1 Complete without adding new product scope.',
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

export const backlogSections: BacklogSection[] = [
  {
    title: 'Sprint 1 · Active',
    heading: 'Only the final validation gate remains active.',
    status: 'in-progress',
    badgeLabel: 'Active now',
    summary:
      'Implementation, cleanup, and copy alignment are complete. The only active backlog items are environment-level validation and Sprint 1 signoff.',
    items: [
      {
        title: 'Run the full production build in the complete workspace',
        note: 'Use the real environment to confirm the optimized production build finishes cleanly after the ultra-clean repo pass.',
        status: 'in-progress',
        stateLabel: 'Active',
      },
      {
        title: 'Run deployment validation in the complete workspace',
        note: 'Confirm no runtime regressions or deployment-specific issues before readiness is marked Sprint 1 Complete.',
        status: 'next',
        stateLabel: 'Next',
      },
      {
        title: 'Finalize readiness to Sprint 1 Complete',
        note: 'Close the final validation gate only after build and deployment confirmation are complete in the real environment.',
        status: 'next',
        stateLabel: 'Next',
      },
    ],
  },
  {
    title: 'Next up · Not active',
    heading: 'Visible for continuity, locked from implementation.',
    status: 'locked',
    badgeLabel: 'Locked',
    summary:
      'These are likely follow-on themes after Sprint 1 signoff, but they stay non-active until Sprint 1 is formally closed.',
    items: [
      {
        title: 'Deepen quote approval flow detail',
        note: 'Only consider after Sprint 1 is complete and the next sprint is explicitly opened.',
        status: 'locked',
        stateLabel: 'Locked',
      },
      {
        title: 'Extend order-entry handoff clarity',
        note: 'Keep visible as the likely next flow step, but do not start it during Sprint 1.',
        status: 'locked',
        stateLabel: 'Locked',
      },
      {
        title: 'Tighten role-based visibility rules',
        note: 'Useful future work, but not part of the current locked scope.',
        status: 'locked',
        stateLabel: 'Locked',
      },
    ],
  },
  {
    title: 'Parking lot',
    heading: 'Explicitly not in scope right now.',
    status: 'locked',
    badgeLabel: 'Do not touch',
    summary:
      'Keep these visible so they do not sneak into the sprint through side conversations or repo drift.',
    items: [
      {
        title: 'CRM analytics expansion',
        note: 'Out of Sprint 1 scope.',
        status: 'locked',
        stateLabel: 'Parked',
      },
      {
        title: 'AI suggestions and automation layers',
        note: 'Do not activate until the core Capture → Lead → Quote → Order path is fully validated in production.',
        status: 'locked',
        stateLabel: 'Parked',
      },
      {
        title: 'New top-level modules or alternate workflow paths',
        note: 'Blocked by the locked master plan. Do not redesign product structure.',
        status: 'locked',
        stateLabel: 'Blocked',
      },
    ],
  },
];

export const checklistItems: ChecklistItem[] = [
  {
    id: 'repo-cleanup',
    area: 'Workspace discipline',
    label: 'Clean the repo down to one active development workplace and remove drift from duplicate, experimental, and outdated planning surfaces.',
    status: 'done',
    note: 'Active planning now lives in the HTML development workplace only, and the repo is stripped back to app code plus two essential docs.',
  },
  {
    id: 'single-dev-workplace',
    area: 'Workspace discipline',
    label: 'Keep one active development workplace at /development with master plan, readiness, backlog, and locked screen specs.',
    status: 'done',
    note: 'Operational control now lives in /development, /development/master-plan, /development/readiness, /development/backlog, and /development/screens/leads-capture.',
  },
  {
    id: 'backlog-discipline',
    area: 'Planning discipline',
    label: 'Keep the sprint backlog inside the HTML development workplace so future work stays visible without bringing markdown clutter back.',
    status: 'done',
    note: 'Backlog is now repo-backed at /development/backlog and acts as the no-drift gate for active Sprint 1 work.',
  },
  {
    id: 'html-visibility',
    area: 'Workspace discipline',
    label: 'Make the Master Checklist and Readiness status visible inside the HTML development workplace.',
    status: 'done',
    note: 'Checklist and readiness stay repo-backed and visible from the main development hub.',
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
    id: 'mobile-qa',
    area: 'Leads',
    label: 'Run the responsive/mobile/tablet QA pass for Leads and Capture against the locked spec.',
    status: 'done',
    note: 'Layouts still respect mobile stacking, tap-first actions, and sticky CTA behavior aligned to the locked Leads/Capture spec.',
  },
  {
    id: 'sprint-1-hold',
    area: 'Capture',
    label: 'Hold scope inside Sprint 1 and avoid redesigning the product structure.',
    status: 'done',
    note: 'Work remains locked to Capture → Lead → Quote → Order with no structural redesign.',
  },
  {
    id: 'quote-handoff',
    area: 'UI foundation',
    label: 'Refine quote-entry handoff states and CTA clarity from qualified leads and reviewed capture records.',
    status: 'done',
    note: 'Qualified Leads and reviewed Capture records clearly explain when Quote is available and what carries forward.',
  },
  {
    id: 'quote-entry-clarity',
    area: 'Quote',
    label: 'Extend carried-context clarity into the Quote entry surface using the same shared foundations.',
    status: 'done',
    note: 'Quote entry shows inherited context before pricing and terms editing without changing the locked structure.',
  },
  {
    id: 'quote-helper-polish',
    area: 'Quote',
    label: 'Tighten Draft Quote helper copy, approval cues, and pricing-assumption review messaging inside the existing Quote entry surface.',
    status: 'done',
    note: 'Quote keeps inherited context, review-needed assumptions, and approval cues visible in one disciplined flow.',
  },
  {
    id: 'quote-language-consistency',
    area: 'Quote',
    label: 'Run the final micro-polish pass so Leads, Capture, and Quote all use the same inherited-context, rep-review, and approval-gate language.',
    status: 'done',
    note: 'All three active Sprint 1 surfaces use the same trust-language anchors.',
  },
  {
    id: 'validation-pass',
    area: 'Validation',
    label: 'Run the final validation pass available in the clean workspace and record the boundary to full-environment confirmation honestly.',
    status: 'done',
    note: 'npm ci and typecheck passed in the clean workspace. Full production-build and deployment confirmation still belongs to the complete environment.',
  },
  {
    id: 'sprint-1-complete-gate',
    area: 'Validation',
    label: 'Finalize readiness to Sprint 1 Complete after complete-workspace build and deployment validation.',
    status: 'next',
    note: 'Implementation and cleanup are complete. The only remaining gate is full-environment validation and release confirmation.',
  },
];

export const readinessSummary = {
  sprint: sprintFocus.sprint,
  status: 'Sprint 1 implementation complete; clean repo baseline and in-app backlog ready; full-environment validation pending',
  buildStatus:
    'Clean-workspace validation completed through npm ci and typecheck. Full production build and deployment confirmation must be rerun in the complete workspace before marking Sprint 1 Complete.',
  driftRisk: 'Low',
  blockers:
    'No product blockers. Remaining gate is environment-level build and deployment confirmation in the complete workspace.',
};

export const readinessAreas = [
  {
    title: 'Development workplace lock',
    status: 'done' as ChecklistStatus,
    summary: 'The active repo points to one development hub with one backlog page and four locked implementation source-of-truth pages.',
  },
  {
    title: 'Backlog discipline',
    status: 'done' as ChecklistStatus,
    summary: 'Sprint backlog now lives at /development/backlog so planning stays visible without adding repo clutter back.',
  },
  {
    title: 'Repo cleanliness',
    status: 'done' as ChecklistStatus,
    summary: 'The repo now keeps only active app code, essential config, public assets, and two minimal docs. Archived notes and iteration clutter are removed.',
  },
  {
    title: 'UI foundation status',
    status: 'done' as ChecklistStatus,
    summary: 'Shared StatusBadge, LeadCard, QuickActionMenu, PageHeader, and SectionCard continue to power the active Sprint 1 surfaces.',
  },
  {
    title: 'Leads status',
    status: 'done' as ChecklistStatus,
    summary: 'Qualified-lead selection previews inherited context, keeps rep-review cues visible, and uses the same approval-gate language as Quote.',
  },
  {
    title: 'Capture status',
    status: 'done' as ChecklistStatus,
    summary: 'Capture review previews inherited context, distinguishes Create Lead from Lead + Draft Quote, and keeps rep-review language aligned with Quote.',
  },
  {
    title: 'Quote status',
    status: 'done' as ChecklistStatus,
    summary: 'Quote entry uses the same inherited-context, rep-review, and approval-gate language across lead-origin and capture-origin draft states.',
  },
  {
    title: 'Implementation completeness',
    status: 'done' as ChecklistStatus,
    summary: 'Sprint 1 product and UX implementation is complete inside the locked scope with no drift beyond Capture → Lead → Quote → Order.',
  },
  {
    title: 'Validation status',
    status: 'in-progress' as ChecklistStatus,
    summary: 'Clean-workspace validation completed through npm ci and typecheck. Full production build and deployment confirmation still needs the complete environment.',
  },
];
