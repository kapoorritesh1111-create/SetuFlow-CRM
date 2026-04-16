import { LOCKED_PRODUCT_FLOW, PRODUCT_ROUTES } from "@/lib/product-contract";

export type ChecklistStatus = "done" | "in-progress" | "next" | "locked";

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

export type BuyerReadyItem = {
  label: string;
  note: string;
  status: ChecklistStatus;
};

export type BuyerReadySection = {
  title: string;
  summary: string;
  status: ChecklistStatus;
  items: BuyerReadyItem[];
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
  sprint: "Sprint 9 · Active",
  percent: 96,
  percentLabel: "Sprints 1-8 closed · Sprint 9 cleanup/hardening active · Sprint 10 demo/release proof next",
};

export const sprintFocus = {
  sprint: "Sprint 9 · Active",
  title:
    "The repo now reflects a closed Sprint 8 baseline: Capture, Leads, Quotes, Trust, Orders, Dashboard, and My Card/contact-exchange are closed through Sprint 8, and Sprint 9 is the active cleanup and hardening lane ahead of Sprint 10 demo/release proof.",
  nextAction:
    "Execute Sprint 9 by tightening architecture, reducing large file risk, rerunning fresh proof, and hardening the repo for the buyer/demo push that must land before April 21.",
  flow: LOCKED_PRODUCT_FLOW.join(" → "),
};

export const readinessSummary = {
  status: "Sprints 7-8 closed · Sprint 9 active · Sprint 10 queued",
  buildStatus:
    "Use Sprint 9 hardening to rerun install, typecheck, smoke tests, and production build on the closed Sprint 8 baseline.",
  driftRisk:
    "Low — docs, development pages, package scripts, and repo artifacts now match the checked-in code and the Sprint 9 → Sprint 10 plan.",
  blockers:
    "Sprint 9 must close architecture cleanup, verification refresh, and demo-hardening before the Sprint 10 buyer/release proof push ahead of April 21.",
};

export const planningSurfaces: PlanningSurface[] = [
  {
    id: "development-home",
    title: PRODUCT_ROUTES.development.home,
    href: PRODUCT_ROUTES.development.home,
    summary:
      "Operating-system overview for the locked flow, current sprint state, and the active cleanup/execution lane.",
    status: "done",
    focus:
      "Keep the repo speaking one timeline: Sprints 1-8 are closed, Sprint 9 is active, and Sprint 10 remains the final demo/release proof lane.",
  },
  {
    id: "master-plan",
    title: PRODUCT_ROUTES.development.masterPlan,
    href: PRODUCT_ROUTES.development.masterPlan,
    summary:
      "Roadmap from the closed baseline into the active dashboard and cleanup sequence.",
    status: "done",
    focus:
      "Preserve roadmap order while making Sprint 8 closure explicit and Sprint 9/Sprint 10 sequencing visible.",
  },
  {
    id: "readiness",
    title: PRODUCT_ROUTES.development.readiness,
    href: PRODUCT_ROUTES.development.readiness,
    summary:
      "Readiness, build confidence, blockers, and proof refresh work anchored to the current cleaned repo.",
    status: "done",
    focus:
      "Keep status language honest: code is aligned, fresh proof still needs to be rerun.",
  },
  {
    id: "buyer-ready",
    title: "Buyer ready",
    href: PRODUCT_ROUTES.development.buyerReady,
    summary:
      "Gap view for what is already true in code and what still needs proof before buyer-facing confidence.",
    status: "done",
    focus:
      "Separate shipped code truth from release/demo proof that still remains.",
  },
  {
    id: "backlog",
    title: PRODUCT_ROUTES.development.backlog,
    href: PRODUCT_ROUTES.development.backlog,
    summary:
      "Repo-backed backlog showing Sprints 1-8 closed, Sprint 9 active, and Sprint 10 queued behind the hardening plan.",
    status: "done",
    focus:
      "Keep future work sequenced behind Sprint 9 without pretending later cleanup/release work is already closed.",
  },
  {
    id: "product",
    title: PRODUCT_ROUTES.development.product,
    href: PRODUCT_ROUTES.development.product,
    summary:
      "Product story, module priorities, and the locked commercial flow remain stable.",
    status: "done",
    focus: "Preserve Capture → Lead → Quote → Order as the product truth.",
  },
  {
    id: "architecture",
    title: PRODUCT_ROUTES.development.architecture,
    href: PRODUCT_ROUTES.development.architecture,
    summary:
      "Architecture guardrails focused on the real current code layout and queued cleanup lanes.",
    status: "done",
    focus: "Keep future cleanup grounded in the structure that actually exists today.",
  },
  {
    id: "ux-rules",
    title: PRODUCT_ROUTES.development.uxRules,
    href: PRODUCT_ROUTES.development.uxRules,
    summary:
      "Rules for clarity, locking, trainability, and status honesty.",
    status: "done",
    focus:
      "Prevent visual drift while dashboard and contact-exchange work deepen.",
  },
  {
    id: "screen-leads-capture",
    title: PRODUCT_ROUTES.development.screens,
    href: PRODUCT_ROUTES.development.screens,
    summary:
      "Screen-layout reference for the completed Leads + Capture foundation and the quote-first lead workspace.",
    status: "done",
    focus:
      "Keep Lead and Capture implementation aligned to the locked screen contract.",
  },
];

export const readinessAreas: ReadinessArea[] = [
  {
    title: "Development status is now aligned to the checked-in code",
    summary:
      "Development hub, backlog, buyer-ready view, markdown docs, and repo scripts now speak the same timeline instead of mixing old and new sprint states.",
    status: "done",
  },
  {
    title: "Repo hygiene has been restored",
    summary:
      "Legacy duplicate JSX files and stale repo artifacts were removed, and lightweight checked-in smoke tests now exist again.",
    status: "done",
  },
  {
    title: "Sprint 7 dashboard closure is part of the baseline",
    summary:
      "Dashboard is now a closed baseline lane: map-first command center, market drill-down, role-aware filters, and action queue all ship as part of Sprint 7 truth.",
    status: "done",
  },
  {
    title: "Sprint 8 outward-share work is now closed in the baseline",
    summary:
      "My Card, digital vCard preview, QR/public card journeys, save-contact, and CRM capture now exist as closed Sprint 8 baseline work.",
    status: "done",
  },
  {
    title: "Proof refresh is the first Sprint 9 hardening gate",
    summary:
      "Use the updated baseline to rerun install, typecheck, smoke tests, and production build as part of Sprint 9 hardening discipline.",
    status: "in-progress",
  },
  {
    title: "Buyer-facing assets now shift to Sprint 10 demo/release proof",
    summary:
      "Dashboard and outward-share stories are now closed through Sprint 8, and Sprint 10 must package them into a buyer-proof demo and release narrative before April 21.",
    status: "next",
  },
];

export const checklistItems: ChecklistItem[] = [
  {
    id: "flow-lock",
    area: "Product flow",
    label: "Capture → Lead → Quote → Order remains locked",
    note: "No planning or implementation change should redesign this operating sequence.",
    status: "done",
  },
  {
    id: "shared-product-contract",
    area: "Anti-drift structure",
    label: "Visible shell truth lives in product-contract.ts",
    note: "Top-level labels, routes, hidden modules, and shell guardrails are imported rather than rewritten inline.",
    status: "done",
  },
  {
    id: "shared-status-contract",
    area: "Anti-drift structure",
    label: "Planning and readiness truth lives in product-status-contract.ts",
    note: "Development pages and repo docs now share one timeline source again.",
    status: "done",
  },
  {
    id: "development-pages-aligned",
    area: "Development pages",
    label: "Development pages describe Sprints 1-8 closed with Sprint 9 active and Sprint 10 next",
    note: "The development hub, master plan, readiness page, backlog, and buyer-ready view now match the checked-in code rather than stale markdown history, and they sequence Sprint 9 and Sprint 10 clearly.",
    status: "done",
  },
  {
    id: "markdown-aligned",
    area: "Documentation",
    label: "Markdown docs now reflect code reality and the active rework plan",
    note: "Master plan, release readiness, product, architecture, and rework docs now describe the actual repo baseline.",
    status: "done",
  },
  {
    id: "repo-hygiene",
    area: "Repo hygiene",
    label: "Stale artifacts and dead duplicates were removed",
    note: "Legacy JSX duplicates and stale .out artifacts were removed so the repo baseline is easier to trust.",
    status: "done",
  },
  {
    id: "smoke-tests",
    area: "Validation",
    label: "Checked-in smoke tests and dashboard validation scripts exist again",
    note: "Package scripts now point to files that actually exist inside the repo.",
    status: "done",
  },
  {
    id: "fresh-verify",
    area: "Validation",
    label: "Fresh verify run is required during Sprint 9 hardening",
    note: "Install dependencies and rerun typecheck, smoke tests, and build before claiming Sprint 10 demo/release proof.",
    status: "next",
  },
];

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    sprint: "Sprint 1 · Product foundation closeout",
    summary:
      "Establish the locked flow and make the development workplace the planning source of truth.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Lock the product story and baseline operating rhythm.",
    outcomes: [
      "Development workplace pages exist and anchor planning.",
      "Leads, Capture, and Quote entry stay inside the locked scope.",
      "Baseline readiness gates are visible instead of implied.",
    ],
  },
  {
    sprint: "Sprint 2 · Capture foundation",
    summary:
      "Unify inbound capture under Leads and keep review-before-save trust visible.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Finish the inbound capture foundation cleanly.",
    outcomes: [
      "vCard, card scan, document, and inquiry intake paths exist.",
      "Capture stays subordinate to Leads instead of becoming a detached product area.",
      "Screen contracts preserve the intake foundation.",
    ],
  },
  {
    sprint: "Sprint 3 · Lead simplification",
    summary:
      "Keep Leads quote-first and reduce decision noise in the operating area.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Make quote entry the dominant next commercial action.",
    outcomes: [
      "Lead surface complexity is reduced.",
      "Quote creation/continuation is visually dominant.",
      "Support detail stays quieter and secondary until needed.",
    ],
  },
  {
    sprint: "Sprint 4 · Quote builder core",
    summary:
      "Keep the guided quote-builder truthful, enforce send-state decisions, and preserve remediation continuity.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Close the builder baseline without reopening flow structure.",
    outcomes: [
      "Guided Product → Pricing → Terms → Review → Send flow is live.",
      "Review/send checkpoints preserve exact remediation loops.",
      "The workspace and launch surfaces both align to the builder story.",
    ],
  },
  {
    sprint: "Sprint 5 · Trust layer",
    summary:
      "Approval visibility, audit events, AI assist, lock posture, and production-safe rate limiting are live.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Carry trust controls into the workflow without changing the product shell.",
    outcomes: [
      "Approval-required, approval-pending, and approval-cleared posture are visible.",
      "Audit events are written for approval transitions.",
      "Lock-state enforcement and live Orders data are in place.",
    ],
  },
  {
    sprint: "Sprint 6 · Orders foundation",
    summary:
      "Orders already carry accepted/sent quote context with documents, compliance, contracts, and dispatch-readiness signals.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Carry accepted commercial truth into execution cleanly.",
    outcomes: [
      "Orders page is live from real joined data.",
      "Documents, compliance, and contract status are folded per order.",
      "Dispatch-readiness context is visible at the order card level.",
    ],
  },
  {
    sprint: "Sprint 7 · Dashboard rebuild",
    summary:
      "Geography-first trade command center: dark map with urgency tiers, inline market drill-down panel, action queue filtered by market, passive charts removed.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Make Dashboard the command surface for geography-led commercial decisions.",
    outcomes: [
      "World map redesigned — dark ocean background, urgency-coded market tiers (critical/active/watch), node size by lead count.",
      "Clicking a market opens an inline three-panel panel: snapshot metrics, filtered action queue, top companies.",
      "Passive pipeline chart removed from default view — dashboard leads with action, not counts.",
      "Diagnostics collapsed to a toggle, no longer cluttering the main commercial view.",
    ],
  },
  {
    sprint: "Sprint 8 · My Card and outbound share",
    summary:
      "Outward contact-exchange work is now closed in the repo and forms part of the Sprint 8 baseline on top of the closed dashboard command center.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Turn contact exchange into a clean supporting loop for the core workflow.",
    outcomes: [
      "Digital vCard, preview, QR/public card actions, persistent card settings, and inbound scan-contact routes exist.",
      "Public/share surfaces now feed back into leads, quote requests, and CRM capture workflows.",
      "The lane stays subordinate to the core operating flow rather than becoming a detached product story.",
    ],
  },
  {
    sprint: "Sprint 9 · Architecture cleanup",
    summary:
      "Break up the biggest files, tighten route ownership, and keep proof tooling lightweight and real.",
    badgeLabel: "Active",
    status: "in-progress",
    objective: "Reduce codebase friction, refresh proof, and harden the repo for the pre-April-21 demo window.",
    outcomes: [
      "Large quote/query files are split by responsibility.",
      "Preview/demo overlap is reduced.",
      "Repo proof remains checked in and easy to run.",
    ],
  },
  {
    sprint: "Sprint 10 · Demo and release readiness",
    summary:
      "Refresh the walkthroughs, proof points, and end-to-end validation needed for broader release confidence.",
    badgeLabel: "Queued",
    status: "locked",
    objective: "Close the roadmap with current proof instead of inherited assumptions.",
    outcomes: [
      "Buyer demo script is ready from the cleaned baseline.",
      "Leadership walkthrough is ready.",
      "End-to-end readiness is verified against release criteria.",
    ],
  },
];

export const backlogSections: BacklogSection[] = [
  {
    title: "Closed baseline · Sprints 1-6",
    heading:
      "Capture, Leads, Quotes, Trust, and Orders are closed baseline work and should not be reopened casually",
    sprint: "Sprints 1-6",
    badgeLabel: "Done",
    summary:
      "The workflow baseline is already substantial in code. Current work should extend from this baseline, not rewrite it.",
    description:
      "Treat the Capture → Lead → Quote → Order operating path as closed through Sprint 6. Preserve those wins while active dashboard work and cleanup move forward.",
    status: "done",
    items: [
      {
        title: "Sprint 2 · Capture foundation",
        note: "Inbound capture stays preserved under Leads with review-before-save trust.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Sprint 3 · Lead simplification",
        note: "Keep the quote-first lead workspace stable and avoid reopening surface sprawl.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Sprint 4-5 · Quotes and trust",
        note: "Builder, approvals, audit, locking, and send posture are baseline truth now.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Sprint 6 · Orders foundation",
        note: "Orders already carry execution context and should remain the trusted handoff from commercial work.",
        stateLabel: "Done",
        status: "done",
      },
    ],
  },
  {
    title: "Sprint 9 · Active",
    heading:
      "Architecture cleanup, proof refresh, and demo hardening are the active execution lane",
    sprint: "Sprint 9",
    badgeLabel: "Active",
    summary:
      "Sprint 7 dashboard work and Sprint 8 outward-share work are now baseline truth. The active job is to harden the repo, reduce large-file risk, and refresh proof before the April 21 demo window.",
    description:
      "Do not reopen closed Dashboard or My Card scope. Sprint 9 should tighten architecture, verification confidence, and demo polish while keeping the commercial workflow stable.",
    status: "in-progress",
    items: [
      {
        title: "Refresh proof on the current baseline",
        note: "Run install, typecheck, smoke tests, and production build on the current repo and keep the result honest in the development pages.",
        stateLabel: "Active",
        status: "in-progress",
      },
      {
        title: "Reduce architecture risk in the largest files",
        note: "Split the biggest quote/query files and remove remaining route overlap without destabilizing the closed baseline.",
        stateLabel: "Active",
        status: "in-progress",
      },
      {
        title: "Polish demo-critical surfaces",
        note: "Tighten final demo-facing trust, copy, and workflow quality ahead of Sprint 10 proof closure.",
        stateLabel: "Next",
        status: "next",
      },
      {
        title: "Protect closed workflow lanes",
        note: "Do not reopen older sprint work while Sprint 9 hardening is underway.",
        stateLabel: "Guardrail",
        status: "done",
      },
    ],
  },
  {
    title: "Sprint 10 · Next",
    heading:
      "Buyer demo, release proof, and final readiness remain sequenced behind the active Sprint 9 hardening lane",
    sprint: "Sprint 10",
    badgeLabel: "Queued",
    summary:
      "Later work is visible and real, but it stays behind the active Sprint 9 proof and cleanup lane.",
    description:
      "Sprint 10 is the final buyer/demo/release proof lane and should culminate in a demo-ready product before April 21.",
    status: "next",
    items: [
      {
        title: "Sprint 8 · My Card and contact exchange",
        note: "Closed baseline: outward-share, public card, QR, save-contact, and CRM capture now exist in the repo.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Sprint 9 · Architecture cleanup and hardening",
        note: "Split the biggest files, reduce route overlap, and refresh proof before the buyer/demo window.",
        stateLabel: "Active",
        status: "in-progress",
      },
      {
        title: "Sprint 10 · Demo and release proof",
        note: "Refresh walkthroughs, end-to-end evidence, and release signoff material from the stabilized baseline before April 21.",
        stateLabel: "Upcoming",
        status: "locked",
      },
    ],
  },
];

export const productTracks: ProductTrack[] = [
  {
    id: "capture",
    title: "Capture wedge",
    summary:
      "Capture foundation is complete and remains the inbound wedge under Leads.",
    status: "done",
    scope: [
      "Business card scan",
      "vCard import",
      "RFQ intake",
      "Buyer text parsing",
      "Lead merge and draft quote actions",
    ],
  },
  {
    id: "lead",
    title: "Lead operating area",
    summary:
      "Lead simplification is complete and the lead surface remains quote-first in the shipped baseline.",
    status: "done",
    scope: [
      "Lead list",
      "Lead detail",
      "Activity",
      "Next actions",
      "Create Quote dominance",
    ],
  },
  {
    id: "quote",
    title: "Quote hero workflow",
    summary:
      "Quote builder core and trust controls are baseline truth now.",
    status: "done",
    scope: [
      "Guided builder",
      "Pricing support",
      "Terms",
      "Review",
      "Send",
      "Approvals",
      "Versioning",
      "Locking",
    ],
  },
  {
    id: "order",
    title: "Order execution entry",
    summary:
      "Orders foundation is complete with execution-readiness context folded into each order card.",
    status: "done",
    scope: [
      "Snapshot",
      "Documents",
      "Compliance",
      "Operations tabs",
      "Execution readiness",
      "Blockers",
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard awareness layer",
    summary:
      "Dashboard rebuild is closed in the repo and now serves as the stable command-center baseline.",
    status: "done",
    scope: [
      "Today actions",
      "Market command view",
      "At-risk work",
      "Trade intelligence",
      "Map drill-down",
    ],
  },
  {
    id: "my-card",
    title: "My Card sharing loop",
    summary:
      "My Card and contact-exchange work are now closed through Sprint 8 and form the outbound-share support lane for the locked workflow.",
    status: "next",
    scope: [
      "QR share",
      "Contact save",
      "Public card view",
      "Request quote call-to-action",
      "Persistent card settings",
      "CRM lead capture",
    ],
  },
];

export const architectureLanes: ArchitectureLane[] = [
  {
    id: "workflow-shell",
    title: "Workflow-first shell",
    summary:
      "Top-level product understanding stays anchored to Leads, Quotes, Orders, Dashboard, and Admin.",
    status: "done",
    target:
      "Users should understand the product quickly without module clutter.",
  },
  {
    id: "contract-owned-truth",
    title: "Contract-owned product truth",
    summary:
      "Visible shell and planning status are owned by shared repo contracts rather than scattered page copy.",
    status: "done",
    target: "Prevent the repo from speaking in two sprint timelines at once.",
  },
  {
    id: "capture-foundation",
    title: "Leads + Capture foundation",
    summary:
      "The Lead and Capture foundation is complete and remains locked as later work deepens around it.",
    status: "done",
    target: "Keep the completed intake foundation stable.",
  },
  {
    id: "lead-simplification",
    title: "Lead-surface simplification",
    summary:
      "The Leads surface stays quote-first with quieter support layers and on-demand detail.",
    status: "done",
    target:
      "Keep quote launch dominant until a real quote exists, then expose review cleanly.",
  },
  {
    id: "repo-hygiene",
    title: "Repo truth and proof hygiene",
    summary:
      "Package scripts, docs, and checked-in validation must stay as real as the code itself.",
    status: "done",
    target:
      "Avoid hidden drift between implementation, docs, and proof claims.",
  },
  {
    id: "quote-cleanup",
    title: "Quote/query decomposition",
    summary:
      "Large quote and query files remain the main cleanup target after status truth and dashboard closure stabilize.",
    status: "next",
    target:
      "Reduce coupling and reasoning cost in the busiest parts of the codebase.",
  },
];

export const uxRules: UxRule[] = [
  {
    id: "flow-first",
    title: "Lead with the workflow",
    rule: "Every development page and product screen should make Capture → Lead → Quote → Order obvious.",
    status: "done",
  },
  {
    id: "no-top-level-sprawl",
    title: "Do not reopen module sprawl",
    rule: "Important capabilities can be real without becoming competing top-level product stories.",
    status: "done",
  },
  {
    id: "capture-wedge",
    title: "Capture stays the intake wedge",
    rule: "Capture belongs inside the Leads operating model and the completed foundation should remain intact.",
    status: "done",
  },
  {
    id: "lead-next-action",
    title: "Make the lead next action obvious",
    rule: "The lead workspace should keep quote creation or continuation visually dominant when a lead is ready.",
    status: "done",
  },
  {
    id: "status-honesty",
    title: "Status must describe implementation truth",
    rule: "Do not describe seeded or historical work as freshly proven, and do not describe active code as if it were absent.",
    status: "done",
  },
  {
    id: "shared-foundations",
    title: "Reuse shared UI foundations",
    rule: "Shared building blocks should remain the baseline instead of spawning one-off status surfaces.",
    status: "done",
  },
  {
    id: "mobile-first",
    title: "Keep mobile and tablet quality strict",
    rule: "Touch-first quality remains mandatory before desktop polish expands.",
    status: "done",
  },
];

export const buyerReadySections: BuyerReadySection[] = [
  {
    title: "Already true in the current repo baseline",
    summary:
      "These outcomes are already visible in code and should now be treated as baseline truth rather than future intent.",
    status: "done",
    items: [
      {
        label: "Workflow baseline is closed through Sprint 6",
        note: "Capture, Leads, Quotes, trust controls, and Orders are all present in the current codebase.",
        status: "done",
      },
      {
        label: "Dashboard closure is now baseline truth",
        note: "Dashboard routes, widgets, map surfaces, and interactive layout code already exist in the repo.",
        status: "done",
      },
      {
        label: "Contact-exchange work is closed through Sprint 8",
        note: "Digital vCard, preview, QR/public card, save-contact, CRM capture, and scan-contact routes now exist and should stay sequenced as support work.",
        status: "done",
      },
    ],
  },
  {
    title: "Still needed before buyer-facing proof",
    summary:
      "The codebase is substantial, and Sprint 9 now needs to harden architecture, refresh proof, and finish demo polish on top of the closed Sprint 8 baseline before April 21.",
    status: "in-progress",
    items: [
      {
        label: "Sprint 7 dashboard closure is complete",
        note: "The action-first, geography-led dashboard command surface is now part of the closed product baseline.",
        status: "done",
      },
      {
        label: "Refresh technical proof on the cleaned baseline",
        note: "Run install, typecheck, smoke tests, and production build so readiness claims are current rather than inherited.",
        status: "next",
      },
      {
        label: "Run buyer-demo journeys end to end",
        note: "Validate real storylines across Leads, Quote, Orders, dashboard context, and outward-share follow-up.",
        status: "next",
      },
    ],
  },
  {
    title: "Sprint 9-10 closeout still remains",
    summary:
      "Architecture cleanup, proof refresh, and final buyer/demo proof stay sequenced after the now-closed Sprint 8 baseline.",
    status: "next",
    items: [
      {
        label: "Sprint 8 outward-share execution",
        note: "Closed baseline: My Card/contact-exchange outward share now routes save/share paths back into the commercial workflow.",
        status: "done",
      },
      {
        label: "Sprint 9 architecture cleanup",
        note: "Split the biggest files, reduce route overlap, and harden proof before the April 21 demo window.",
        status: "next",
      },
      {
        label: "Sprint 10 demo and release readiness",
        note: "Refresh walkthrough assets, proof points, and signoff material from the stabilized baseline.",
        status: "locked",
      },
    ],
  },
];

export const screenPlans: ScreenPlan[] = [
  {
    id: "leads-capture",
    title: "Leads + Capture foundation",
    route: PRODUCT_ROUTES.development.screens,
    summary:
      "The Leads + Capture screen contract is complete and remains the locked inbound foundation.",
    status: "done",
    primaryGoal:
      "Keep inbound lead creation and quote-starting handoff clear and stable.",
    layout: [
      {
        title: "Left rail intake modes",
        purpose: "Let users choose how they are bringing information in.",
        blocks: [
          "Scan business card",
          "Import vCard",
          "Paste buyer text",
          "Upload RFQ or notes",
        ],
      },
      {
        title: "Center intake review",
        purpose: "Normalize the parsed contact, company, request, and intent.",
        blocks: [
          "Parsed contact",
          "Company match",
          "Inquiry summary",
          "Suggested next action",
        ],
      },
      {
        title: "Right rail actions",
        purpose: "Move from intake to structured work.",
        blocks: ["Create lead", "Merge existing", "Create Lead + Draft Quote"],
      },
    ],
    actions: ["Create lead", "Merge existing", "Create Lead + Draft Quote"],
    dataContracts: [
      "captureModes",
      "parsedContact",
      "parsedCompany",
      "buyerRequest",
      "mergeCandidates",
      "intakeActions",
    ],
  },
  {
    id: "lead-workspace",
    title: "Lead workspace simplification",
    route: PRODUCT_ROUTES.workspace.leads,
    summary:
      "The lead workspace is now the stable quote-first operating area and should remain that way while later sprints deepen around it.",
    status: "done",
    primaryGoal:
      "Help reps understand the lead state quickly and move into quoting without competing surface noise.",
    layout: [
      {
        title: "Lead list clarity",
        purpose: "Reduce clutter and make state easy to scan.",
        blocks: [
          "Lead row summary",
          "Qualification cues",
          "Owner and next action",
        ],
      },
      {
        title: "Lead detail focus",
        purpose:
          "Keep commercial context and next steps clear without surface overload.",
        blocks: [
          "Compact lead-reference tray",
          "On-demand full detail",
          "Passive lead log",
          "Prioritized support queue",
          "Collapsed support detail by default",
          "Shared supporting-record panel",
          "Collapsible record summary drawer",
          "Passive support watchlist",
        ],
      },
      {
        title: "Primary CTA emphasis",
        purpose:
          "Make Create Quote the obvious next step when a lead is ready.",
        blocks: [
          "Decisive commercial state",
          "Unified current blocker card",
          "Compact supporting-record tray",
          "Quote CTA",
        ],
      },
    ],
    actions: ["Create Quote", "Continue Quote", "Review blocker"],
    dataContracts: [
      "leadSummary",
      "commercialState",
      "supportQueue",
      "supportWatchlist",
      "activityLog",
      "quoteLaunchState",
    ],
  },
  {
    id: "my-card",
    title: "My Card / Share Contact",
    route: PRODUCT_ROUTES.workspace.myCard,
    summary:
      "Outbound contact exchange is now closed through Sprint 8 and feeds back into the locked workflow instead of forming a detached story.",
    status: "done",
    primaryGoal:
      "Keep contact exchange as a clean supporting loop for follow-up and quote creation while Sprint 9 hardens the baseline.",
    layout: [
      {
        title: "Identity-first card",
        purpose: "Let recipients understand who is reaching out immediately.",
        blocks: ["Rep identity", "Role and org", "Direct actions"],
      },
      {
        title: "QR and sharing panel",
        purpose: "Make it easy to save, share, and re-open the card.",
        blocks: ["QR code", "Share actions", "Request quote CTA"],
      },
    ],
    actions: ["Share contact", "Open public card", "Request quote"],
    dataContracts: ["contactCard", "shareActions", "publicCardCTA"],
  },
];

export const sprintSummary = {
  activeSprint: "Sprint 9 · Active",
  completedSprint: "Sprint 8 · Closed baseline",
  roadmapMilestones,
  backlogSections,
  planningSurfaces,
};

export const masterPlan = roadmapMilestones;
