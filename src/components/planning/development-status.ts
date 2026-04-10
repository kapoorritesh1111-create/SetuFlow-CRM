export type ChecklistStatus = 'done' | 'in-progress' | 'next' | 'locked';

export type ChecklistItem = {
  id: string;
  area: 'Workspace discipline' | 'UI foundation' | 'Leads' | 'Capture' | 'Quote' | 'Validation';
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
    label: 'Keep one active development workplace at /development with master plan, readiness, and locked screen specs.',
    status: 'done',
    note: 'Only /development, /development/master-plan, /development/readiness, and /development/screens/leads-capture remain as the operational source-of-truth pages.',
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
  status: 'Sprint 1 implementation complete; clean repo baseline ready; full-environment validation pending',
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
    summary: 'The active repo points to one development hub and only four source-of-truth pages.',
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
