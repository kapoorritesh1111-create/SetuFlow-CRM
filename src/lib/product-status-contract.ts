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
  sprint: "Sprint 5 batch 1",
  percent: 28,
  percentLabel: "28% · Approval audit trail live · Anthropic AI wired",
};

export const sprintFocus = {
  sprint: "Sprint 5 · Batch 1 active",
  title:
    "Sprint 3 remains formally closed on the deployed Leads baseline, and Sprint 4 quote-builder core remains formally closed too. Sprint 5 Batch 1 trust-layer work has now advanced through two additional slices: approval state transitions (requested / approved / rejected) now write persistent audit events via writeQuoteAuditLog inside updateQuoteWorkflow, and the Anthropic Claude AI provider is now live — setting ANTHROPIC_API_KEY in the environment activates real LLM-refined drafts for follow-ups, cover notes, intros, and compliance steps with graceful fallback to template drafts when the key is absent.",
  nextAction:
    "Keep Sprint 4 formally closed. The next safe Sprint 5 Batch 1 move is lock-state enforcement: prevent edits on quotes that have reached sent / accepted / expired status, and surface a clear read-only indicator in the fast lane and builder. Do not open full approval UI expansion or post-send revision workflow yet.",
  flow: LOCKED_PRODUCT_FLOW.join(" → "),
};

export const readinessSummary = {
  status: "Deployment verified",
  buildStatus:
    "The latest production build completed successfully, generated all static pages, finalized optimization, and deployed without a confirmed blocker. Local build discipline still matters, but deployment proof is now current and real.",
  driftRisk:
    "Controlled because the development pages, workflow state, and successful deployment proof now match. Keep future workflow changes paired with development-page updates so the repo does not drift again.",
  blockers:
    "No confirmed build blockers. Keep experimental.webpackBuildWorker = false in place until a future real build proves it is safe to remove.",
};

export const planningSurfaces: PlanningSurface[] = [
  {
    id: "development-home",
    title: PRODUCT_ROUTES.development.home,
    href: PRODUCT_ROUTES.development.home,
    summary:
      "Operating-system overview for the locked flow, current sprint status, and the next approved execution lane.",
    status: "done",
    focus:
      "Keep the repo speaking one sprint timeline again: Sprint 3 closed, Sprint 4 closed, and Sprint 5 Batch 1 active while deeper trust enforcement remains intentionally unopened.",
  },
  {
    id: "master-plan",
    title: PRODUCT_ROUTES.development.masterPlan,
    href: PRODUCT_ROUTES.development.masterPlan,
    summary:
      "Sprint roadmap for the locked flow from completed foundation work into the next product phase.",
    status: "done",
    focus:
      "Preserve the roadmap order while showing clearly that Sprint 3 is closed, Sprint 4 is formally complete, and Sprint 5 Batch 1 is now active, but only through the first safe trust-visibility slice.",
  },
  {
    id: "readiness",
    title: PRODUCT_ROUTES.development.readiness,
    href: PRODUCT_ROUTES.development.readiness,
    summary:
      "Readiness, build confidence, blockers, and anti-drift discipline anchored to current production proof.",
    status: "done",
    focus:
      "Keep the successful deployment and the active workflow truth visible together.",
  },
  {
    id: "buyer-ready",
    title: "Buyer ready",
    href: PRODUCT_ROUTES.development.buyerReady,
    summary:
      "The gap view for what is already true, what still needs to land from the approved rework, and what must be complete before buyer-facing walkthroughs.",
    status: "done",
    focus:
      "Keep buyer-readiness honest instead of implying the overall roadmap is finished: Sprint 4 quote-builder core is now complete, Sprint 5 trust-layer planning is now defined, and actual trust-layer proof plus later buyer-facing validation remain explicitly sequenced behind it.",
  },
  {
    id: "backlog",
    title: PRODUCT_ROUTES.development.backlog,
    href: PRODUCT_ROUTES.development.backlog,
    summary:
      "Repo-backed backlog showing Sprint 3 closed cleanly and later work still sequenced behind it.",
    status: "done",
    focus:
      "Keep later work sequenced behind the closed Sprint 3 baseline and avoid skipping ahead without updating the plan.",
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
      "Architecture guardrails for safe implementation as future sprints deepen the product.",
    status: "done",
    focus: "Keep future work disciplined and route-safe.",
  },
  {
    id: "ux-rules",
    title: PRODUCT_ROUTES.development.uxRules,
    href: PRODUCT_ROUTES.development.uxRules,
    summary:
      "Rules for clarity, locking, trust, and trainable workflow behavior.",
    status: "done",
    focus:
      "Prevent visual drift now that Sprint 3 is closed and later work is still sequenced.",
  },
  {
    id: "screen-leads-capture",
    title: PRODUCT_ROUTES.development.screens,
    href: PRODUCT_ROUTES.development.screens,
    summary:
      "Screen-layout reference for the completed Leads + Capture foundation and the now-closed Sprint 3 Leads baseline that later work must continue to respect.",
    status: "done",
    focus:
      "Keep Lead and Capture implementation aligned to the locked screen contract.",
  },
];

export const readinessAreas: ReadinessArea[] = [
  {
    title: "Development status is now repo-backed and aligned",
    summary:
      "The development hub, master plan, readiness board, and backlog now all report the same sprint state instead of mixed timelines.",
    status: "done",
  },
  {
    title: "Current production deployment is verified",
    summary:
      "The latest external build completed successfully, generated static pages, finalized optimization, and deployed without a confirmed blocker.",
    status: "done",
  },
  {
    title: "Sprint 2 foundation is formally complete",
    summary:
      "The current baseline is stable enough to close Sprint 2 without changing working build-safe code.",
    status: "done",
  },
  {
    title: "Sprint 3 workflow state is complete and accurately reflected",
    summary:
      "Lead simplification is now complete and the current repo reflects the quote-first workspace, decisive commercial state, prioritized quote-prep lane, passive activity, compact lead-reference tray, collapsed lower support detail, quieter shared supporting-record surface, and passive support watchlist defined by the Sprint 3 rework.",
    status: "done",
  },
  {
    title: "Buyer readiness still has explicit post-Sprint-3 work",
    summary:
      "The successful deployment does not mean the full rework is buyer-ready yet. Sprint 4 quote-builder core is now complete in the repo, and Sprint 5 Batch 1 now carries one safe runtime slice across the fast lane and the guided send checkpoint, while deeper trust-layer implementation, end-to-end buyer QA, and later buyer-facing proof still remain sequenced work.",
    status: "next",
  },
  {
    title: "No new build blocker is confirmed",
    summary:
      "Build risk is currently low, but the existing worker fix stays in place until a future real build proves the repo no longer needs it.",
    status: "done",
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
    note: "development-status.ts remains a compatibility pass-through instead of owning its own timeline.",
    status: "done",
  },
  {
    id: "development-pages-aligned",
    area: "Development pages",
    label:
      "Development pages now show Sprint 3 closed and Sprint 4 formally closed",
    note: "The development hub, master plan, readiness page, backlog, buyer-ready view, and screen references now speak the same status language with Sprint 3 formally closed, Sprint 4 formally closed, and Sprint 5 opened for the first safe runtime slice while deeper trust work remains intentionally unopened.",
    status: "done",
  },
  {
    id: "capture-foundation",
    area: "Sprint completion",
    label: "Sprint 2 Capture foundation is reflected as complete",
    note: "Lead and Capture foundation status is now closed in the planning surfaces instead of being left in a stale transitional state.",
    status: "done",
  },
  {
    id: "build-verification",
    area: "Validation",
    label:
      "Production build and deployment proof are recorded in the status source",
    note: "Development status now reflects the real production outcome: clean build, clean deployment, and no confirmed new blocker.",
    status: "done",
  },
  {
    id: "worker-fix-protection",
    area: "Build safety",
    label: "Existing webpack worker fix remains protected",
    note: "Do not remove experimental.webpackBuildWorker = false until a future real build proves it is unnecessary.",
    status: "done",
  },
  {
    id: "sprint-3-entry",
    area: "Next phase",
    label:
      "Sprint 5 trust-layer Batch 1 trust runtime starts through one safe slice",
    note: "Sprint 4 remains closed, and the first Sprint 5 batch now carries one safe runtime slice across the fast lane and the guided send checkpoint: approval gate, audit-event map, and lock-state visibility stay visible without changing the closed Sprint 4 builder rules.",
    status: "in-progress",
  },
];

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    sprint: "Sprint 1 · Product foundation closeout",
    summary:
      "Keep one active development workplace, align Leads, Capture, and Quote entry, and close baseline readiness.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Establish the locked flow and make the development workplace the planning source of truth.",
    outcomes: [
      "Development workplace pages exist and anchor planning.",
      "Leads, Capture, and Quote entry stay inside the locked product scope.",
      "Baseline readiness gates are visible instead of implied.",
    ],
  },
  {
    sprint: "Sprint 2 · Capture foundation",
    summary:
      "Create the unified Capture entry under Leads and lock the intake review foundation to the current product contract.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Finish the Leads + Capture foundation and close the sprint with real build and production proof.",
    outcomes: [
      "Leads + Capture planning surfaces are aligned in the development workplace.",
      "Clean production build has already been verified and deployed successfully.",
      "Sprint 2 is now formally complete in the repo status source.",
    ],
  },
  {
    sprint: "Sprint 3 · Lead simplification",
    summary:
      "Reduce lead-surface complexity and turn the lead page into a quote-first commercial workspace.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Close Lead simplification cleanly without changing the locked commercial flow or destabilizing the build.",
    outcomes: [
      "Lead surface complexity is reduced through a quote-first workspace hierarchy.",
      "Create Quote or Continue Quote becomes the dominant CTA when a lead is ready.",
      "Workflow support now prioritizes one blocker at a time, keeps the blocker summary inside the quote-prep lane instead of a duplicate support hero, summarizes above-the-fold quote readiness as one decisive commercial state instead of four equal tracks, folds supporting records into a compact lead-reference tray, and keeps lower support detail collapsed by default until a blocker is explicitly inspected, while quote creation or continuation stays above the fold, activity history remains passive until deeper quote review is needed, and the shared supporting-record surface can collapse back to a lighter summary drawer once full detail is no longer required.",
    ],
  },
  {
    sprint: "Sprint 4 · Quote builder core",
    summary:
      "Keep the guided quote-builder sequence truthful and extend the live workspace by keeping exact remediation loops visible again after users return to the originating review or send checkpoint.",
    badgeLabel: "Done",
    status: "done",
    objective:
      "Close Quote builder core cleanly now that Sprint 3 is finished and keep it stable until Sprint 5 is intentionally opened.",
    outcomes: [
      "Guided steps remain Product, Pricing, Terms, Review, and Send.",
      "The Quotes entry now reflects the guided builder instead of an order-conversion shortcut.",
      "The live quote draft now follows Product, Pricing, Terms, Review, and Send instead of a loose three-step sequence.",
      "The live workspace now keeps builder-step readiness, validation prompts, and recommendations visible after version history and send-checkpoint posture landed.",
      "Existing quote editing now reopens inside Product, Pricing, Terms, Review, and Send and targets the next needed step from the fast lane.",
      "Review and send now surface pricing-risk cues for overrides, MOQ pressure, approval posture, and send blockers inside the builder itself.",
      "Builder review and send now keep current version, latest sent checkpoint, and latest approved checkpoint visible inside the same guided editor.",
      "Pricing lines now surface line-level readiness issues plus quick-fix actions for MOQ pressure, missing product linkage, missing catalog baseline, zero quantity, and missing override reasons before review or send.",
      "Review and send remediation now lands users on the exact field or pricing line that still needs work inside the same builder, returns directly to the originating checkpoint, keeps that checkpoint loop visible after users return, turns checkpoint guidance into aligned continue-and-save actions tied to the explicit blocked-versus-caution-versus-ready decision state, keeps the leading reason visible in the footer at the moment of action, enforces that state on the actual submit path, locks save/create to the Send checkpoint itself, hands blocked submit directly into the leading exact fix target, and requires explicit caution acknowledgement before save/create can continue.",
    ],
  },
  {
    sprint: "Sprint 5 · Trust layer",
    summary:
      "Batch 1 starts the trust layer by surfacing the approval gate, audit-event map, and quote lock-state contract inside the live quote workspace and the guided send checkpoint.",
    badgeLabel: "Batch 1 active",
    status: "in-progress",
    objective:
      "Start the trust contract through one visibility-first runtime slice without opening new top-level modules or deeper enforcement early.",
    outcomes: [
      "Approval-required, approval-pending, and approval-cleared trust posture is now visible in the fast lane and the guided send checkpoint.",
      "Approval state transitions (requested / approved / rejected) now write persistent audit events in updateQuoteWorkflow via writeQuoteAuditLog.",
      "Anthropic Claude AI provider is now live — ANTHROPIC_API_KEY activates real LLM-refined drafts with graceful template fallback.",
      "Post-send and outcome lock posture is visible before deeper enforcement begins.",
    ],
  },
  {
    sprint: "Sprint 6 · Orders foundation",
    summary:
      "Create the Orders module around accepted-quote snapshots and fold related execution surfaces under it.",
    badgeLabel: "Locked",
    status: "locked",
    objective: "Carry accepted commercial truth into execution cleanly.",
    outcomes: [
      "Orders exist as a first-class execution area.",
      "Documents and compliance stay subordinate to Orders.",
      "Accepted-quote context remains intact through handoff.",
    ],
  },
  {
    sprint: "Sprint 7 · Dashboard rebuild",
    summary:
      "Rebuild Dashboard to be action-first with trade-map context and less vanity reporting.",
    badgeLabel: "Locked",
    status: "locked",
    objective:
      "Make Dashboard useful only after the core operating workflow is stable.",
    outcomes: [
      "Dashboard emphasizes action over passive metrics.",
      "Trade map and geographic drill-down support decision making.",
      "Workflow surfaces stay primary for day-to-day work.",
    ],
  },
  {
    sprint: "Sprint 8 · My Card and outbound share",
    summary:
      "Build outbound identity and sharing loops that feed qualified demand back into the workflow.",
    badgeLabel: "Locked",
    status: "locked",
    objective:
      "Turn offline relationship moments into structured demand without breaking the core shell.",
    outcomes: [
      "My Card page exists as an outbound identity layer.",
      "QR and public-card flows support follow-up.",
      "Request-quote actions reconnect sharing to the commercial workflow.",
    ],
  },
  {
    sprint: "Sprint 9 · Architecture cleanup",
    summary:
      "Split god files, tighten service boundaries, and reduce legacy route sprawl after the workflow is stable.",
    badgeLabel: "Locked",
    status: "locked",
    objective: "Scale only after product and sprint truth are stable.",
    outcomes: [
      "Large files are split into cleaner domain ownership.",
      "Services become more explicit and reusable.",
      "Legacy route clutter is reduced without changing the shell.",
    ],
  },
  {
    sprint: "Sprint 10 · Demo and release readiness",
    summary:
      "Prepare the walkthroughs, proofs, and final validation needed for broader release confidence.",
    badgeLabel: "Locked",
    status: "locked",
    objective: "Close the roadmap with real demo and release readiness proof.",
    outcomes: [
      "Buyer demo script is ready.",
      "Leadership walkthrough is ready.",
      "End-to-end readiness is verified against release criteria.",
    ],
  },
];

export const backlogSections: BacklogSection[] = [
  {
    title: "Sprint 3 · Complete",
    heading:
      "Lead simplification is active without drifting from the locked flow",
    sprint: "Sprint 3",
    badgeLabel: "Done",
    summary:
      "Sprint 2 is complete and Sprint 3 is now formally closed. The next lane is the sequenced buyer-ready work that follows Lead simplification, not architecture drift, not module sprawl, and not optional redesign work.",
    description:
      "Sprint 3 is now closed on the deployed quote-first Leads baseline. Preserve this narrowed workspace, keep Create Quote dominant, keep support guidance collapsed into the quote-prep lane, and do not reopen closed simplification work unless a real blocker proves the baseline wrong.",
    status: "done",
    items: [
      {
        title: "Reduce lead surface complexity",
        note: "Remove friction and simplify what users see first on the Leads surface.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Make Create Quote the dominant CTA",
        note: "When a lead is ready, quote creation or continuation must be the clearest commercial move on the page.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Unify activity and next-action surfaces",
        note: "Keep notes and history passive, prioritize one support blocker at a time, avoid duplicated support CTAs in the sticky bar, and avoid duplicate blocker guidance inside the workflow lane.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Keep build-safe discipline while Sprint 3 closes",
        note: "Do not touch the worker fix or other stable build-safe code unless a real blocker proves it is necessary.",
        stateLabel: "Done",
        status: "done",
      },
    ],
  },
  {
    title: "Sprint 4 complete · Sprint 5 Batch 1 active",
    heading:
      "Quote builder core is closed, and Sprint 5 Batch 1 is now the next controlled lane",
    sprint: "Sprints 4-6",
    badgeLabel: "Next",
    summary:
      "Sprint 4 quote-builder core is complete, and Sprint 5 Batch 1 now carries one safe runtime slice from the quote fast lane into the guided send checkpoint.",
    description:
      "This protects the plan from inventing extra Sprint 4 work while keeping Sprint 5 constrained to one safe visibility-first runtime slice before deeper trust enforcement begins.",
    status: "done",
    items: [
      {
        title: "Sprint 4 · Quote builder core",
        note: "Sprint 4 is now formally complete: Review and Send keep the explicit blocked, caution, or ready action state visible inside the footer with the leading reason shown at the moment of action, enforce that state on the actual submit path, keep save/create locked to the Send checkpoint, reopen the leading exact fix target on blocked submit, and require explicit caution confirmation before save/create can continue, all while preserving the same exact-target continuity and without opening trust-layer work early.",
        stateLabel: "Done",
        status: "done",
      },
      {
        title: "Sprint 5 · Trust layer",
        note: "Batch 1 is now at 28%: trust visibility live in fast lane and send checkpoint; approval audit trail wired in updateQuoteWorkflow; Anthropic AI provider live with LLM drafts. Next slice: lock-state enforcement on sent/accepted/expired quotes.",
        stateLabel: "Batch 1 active",
        status: "in-progress",
      },
      {
        title: "Sprint 6 · Orders foundation",
        note: "Orders depth stays visible, but it does not become active work before the earlier commercial path is ready.",
        stateLabel: "Locked",
        status: "locked",
      },
    ],
  },
  {
    title: "Sprints 7 to 10 · Locked",
    heading:
      "Dashboard, outbound share, architecture cleanup, and final release proof remain later-phase work",
    sprint: "Sprints 7-10",
    badgeLabel: "Locked",
    summary:
      "Keep the long-range roadmap visible without pretending it belongs to the immediate execution lane.",
    description:
      "These phases matter, but they stay locked until the current sprint sequence is completed in order.",
    status: "locked",
    items: [
      {
        title: "Sprint 7 · Dashboard rebuild",
        note: "Action-first dashboard work remains a later phase.",
        stateLabel: "Locked",
        status: "locked",
      },
      {
        title: "Sprint 8 · My Card and outbound share",
        note: "Identity and share loops stay subordinate to the core workflow until later.",
        stateLabel: "Locked",
        status: "locked",
      },
      {
        title: "Sprints 9 and 10 · Cleanup and release proof",
        note: "Architecture cleanup and broader demo/release readiness stay visible but inactive.",
        stateLabel: "Locked",
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
      "Sprint 2 Capture foundation is complete. The current goal is to preserve it while later ingestion depth stays queued.",
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
      "Leads are the next execution lane. Sprint 3 should simplify the surface and make quote-starting action more obvious.",
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
      "Quote builder core is now complete in Sprint 4, with the guided five-step live draft flow, builder-step guidance, edit continuity, pricing-risk cues, version continuity, pricing-line readiness cues, exact-target remediation, return-loop continuity, checkpoint re-entry continuity, explicit checkpoint decisioning, aligned continue-and-save action behavior, real submit enforcement, blocked-submit handoff, and caution confirmation all in place.",
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
      "Orders remain part of the locked product shell, but deeper execution work stays sequenced for Sprint 6.",
    status: "locked",
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
      "Dashboard work remains a later-phase rebuild after the core commercial flow is stable.",
    status: "locked",
    scope: [
      "Today actions",
      "Pipeline health",
      "At-risk work",
      "Trade intelligence",
    ],
  },
  {
    id: "my-card",
    title: "My Card sharing loop",
    summary:
      "My Card stays visible as a support surface, but its demand-generation loop remains later-phase work.",
    status: "locked",
    scope: [
      "QR share",
      "Contact save",
      "Public card view",
      "Request quote call-to-action",
    ],
  },
];

export const architectureLanes: ArchitectureLane[] = [
  {
    id: "workflow-shell",
    title: "Workflow-first shell",
    summary:
      "Top-level product understanding is anchored to Leads, Quotes, Orders, Dashboard, and Admin.",
    status: "done",
    target:
      "Users should understand the product quickly without module clutter.",
  },
  {
    id: "contract-owned-truth",
    title: "Contract-owned product truth",
    summary:
      "Visible shell and planning status are both owned by shared lib contracts instead of duplicated page-level maps.",
    status: "done",
    target: "Prevent the repo from speaking in two sprint timelines at once.",
  },
  {
    id: "capture-foundation",
    title: "Leads + Capture foundation",
    summary:
      "The Lead and Capture planning foundation is complete and should now be preserved while the next sprint starts.",
    status: "done",
    target: "Keep the completed Sprint 2 foundation stable.",
  },
  {
    id: "lead-simplification",
    title: "Lead-surface simplification",
    summary:
      "Sprint 3 is simplifying the Leads experience now by making the lead page read like a quote-first workspace with one decisive above-the-fold commercial state, then a prioritized support queue before deeper Quote and Orders work.",
    status: "done",
    target:
      "Keep quote launch dominant until a real quote exists, then expose quote review cleanly.",
  },
  {
    id: "hidden-services",
    title: "Complexity hidden in services",
    summary:
      "Pricing, documents, contracts, compliance, capture parsing, and RFQ logic should stay behind the workflow shell.",
    status: "locked",
    target:
      "Expose only what helps the user move Capture → Lead → Quote → Order forward.",
  },
  {
    id: "trust-layers",
    title: "Approvals, audit, and locking",
    summary:
      "Trust layers remain a later sprint so the architecture does not jump ahead of the product sequence.",
    status: "locked",
    target:
      "Reduce buyer fear and operational ambiguity without changing the shell.",
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
    rule: "Pipeline, RFQ, documents, contracts, compliance, and similar complexity should not become competing top-level destinations.",
    status: "done",
  },
  {
    id: "capture-wedge",
    title: "Capture stays the intake wedge",
    rule: "Capture belongs inside the Leads operating model and the completed Sprint 2 foundation should remain intact.",
    status: "done",
  },
  {
    id: "lead-next-action",
    title: "Make the lead next action obvious",
    rule: "Sprint 3 should reduce lead complexity and make Create Quote the dominant CTA when the lead is ready.",
    status: "done",
  },
  {
    id: "status-honesty",
    title: "Status must describe implementation truth",
    rule: "Do not describe unverified work as complete, and do not hide proven build or deployment success once it is real.",
    status: "done",
  },
  {
    id: "shared-foundations",
    title: "Reuse shared UI foundations",
    rule: "StatusBadge, LeadCard, QuickActionMenu, PageHeader, and SectionCard stay the baseline building blocks.",
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
    title: "Already true in the deployed baseline",
    summary:
      "These rework outcomes are already visible in the current deployed product and should now be treated as baseline truth.",
    status: "done",
    items: [
      {
        label: "Deployment proof is current",
        note: "The latest production build completed and deployed successfully, so development pages should stop speaking as if deployment is still only partially verified.",
        status: "done",
      },
      {
        label: "Leads is now quote-first",
        note: "The lead surface has been simplified into one commercial lane with quieter support surfaces and on-demand records.",
        status: "done",
      },
      {
        label: "Capture → Lead → Quote → Order remains locked",
        note: "The rework preserved the product structure instead of introducing new top-level modules.",
        status: "done",
      },
    ],
  },
  {
    title: "Still needed before buyer-facing readiness",
    summary:
      "These are the remaining gaps from the approved rework that still need to be finished before the product is ready for buyer-facing walkthroughs or signoff. Sprint 4 quote-builder core itself is now complete.",
    status: "in-progress",
    items: [
      {
        label: "Close Sprint 3 formally",
        note: "Sprint 3 is now formally closed in the development pages and buyer-ready tracking no longer treats Lead simplification as an open batch.",
        status: "done",
      },
      {
        label: "Build Sprint 4 quote-builder core",
        note: "Sprint 4 quote-builder core is now complete: the live quote draft follows Product, Pricing, Terms, Review, and Send, workspace guidance is live, edit continuity is step-aware, pricing-risk cues stay visible inside review and send, builder-side version continuity is visible before save or send, pricing lines surface readiness issues plus quick-fix actions, Review/Send point to the exact field or pricing line that still needs work, and after users return from that exact fix the originating checkpoint keeps the same loop visible with reopen-or-clear actions, while Review/Send keep the explicit blocked-versus-caution-versus-ready action state plus its leading reason visible in the footer, enforce that state on the real submit path, keep save/create locked to the Send checkpoint, reopen the leading exact fix target on blocked submit, and require explicit caution confirmation before save/create can continue before deeper trust work lands later.",
        status: "done",
      },
      {
        label: "Add trust-layer proof",
        note: "Sprint 5 Batch 1 is now at 28%: approval gate and lock-state visibility are live in the fast lane and send checkpoint; approval state transitions (requested / approved / rejected) now write persistent audit events; Anthropic AI is wired with LLM-refined drafts and graceful template fallback. Next: lock-state enforcement (prevent edits on sent/accepted/expired quotes).",
        status: "in-progress",
      },
      {
        label: "Strengthen end-to-end buyer QA",
        note: "Run buyer-demo journeys across Leads, Quote, and Order handoff so buyer-facing walkthroughs are based on proven flows rather than page-level success alone.",
        status: "next",
      },
    ],
  },
  {
    title: "Release-proof and handoff work still pending",
    summary:
      "The later rework phases that turn the shipped product into a buyer-ready story are still explicitly sequenced behind the active sprint.",
    status: "locked",
    items: [
      {
        label: "Orders foundation depth",
        note: "Accepted-quote snapshots, execution readiness, and subordinate document or compliance surfaces remain later roadmap work.",
        status: "locked",
      },
      {
        label: "Buyer demo and leadership walkthrough assets",
        note: "Formal walkthrough scripts, proof points, and signoff materials are still part of the release-readiness endgame.",
        status: "locked",
      },
      {
        label: "Final release-readiness closure",
        note: "The roadmap still requires the later demo and release-readiness sprint before broader external confidence is claimed.",
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
      "The Sprint 2 Leads + Capture screen contract is complete and should stay locked while Sprint 3 starts.",
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
      "Sprint 3 is actively simplifying the Leads workspace and making the quote-starting workspace visually dominant through one decisive above-the-fold commercial state while support work queues behind one current blocker, the blocker summary lives inside that same queue, the right rail stays compressed into a passive support watchlist with on-demand detail, and the shared supporting-record surface can collapse back to a lighter summary drawer when full detail is no longer needed.",
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
          "Collapsible record summary drawer",
          "Passive support watchlist",
        ],
      },
    ],
    actions: ["Create Quote", "Continue Quote", "Advance qualification"],
    dataContracts: [
      "leadSummary",
      "leadTimeline",
      "qualificationState",
      "nextAction",
      "quoteEntryState",
    ],
  },
  {
    id: "quote-builder",
    title: "Quote builder core",
    route: PRODUCT_ROUTES.app.quotes,
    summary:
      "Sprint 4 quote-builder core is now complete: workspace guidance is visible, edit continuity is step-aware, pricing-risk cues are live, builder-side version continuity is visible, pricing-line readiness cues are live, exact-target remediation is in place, remediation return-loop continuity is live, checkpoint re-entry continuity is live, checkpoint decision contract is live with aligned continue-and-save action behavior, blocked submit now hands users into the leading exact fix target, and caution-level send posture requires explicit confirmation before save/create can continue. Sprint 5 Batch 1 has now started through a safe runtime slice in the fast lane and the guided send checkpoint, but deeper trust enforcement remains intentionally unopened.",
    status: "done",
    primaryGoal:
      "Keep the live quote draft stable on the approved Sprint 4 builder structure while Sprint 5 Batch 1 is active and deeper trust enforcement remains intentionally unopened.",
    layout: [
      {
        title: "Step rail",
        purpose: "Keep progress and structure obvious.",
        blocks: ["Product", "Pricing", "Terms", "Review", "Send"],
      },
      {
        title: "Main builder canvas",
        purpose: "Focus on one step at a time while preserving context.",
        blocks: [
          "Current step form",
          "Validation prompts",
          "Recommendations",
          "Step-aware edit drawer",
          "Pricing readiness cues",
        ],
      },
      {
        title: "Summary and controls",
        purpose: "Surface commercial truth and trust cues.",
        blocks: [
          "Quote summary",
          "Margin or risk cues",
          "Version checkpoints",
          "Approval state",
          "Send control",
          "Exact remediation target",
          "Remediation return path",
          "Checkpoint loop status",
        ],
      },
    ],
    actions: ["Save draft", "Request approval", "Send quote"],
    dataContracts: [
      "quoteSteps",
      "quoteDraft",
      "pricingSummary",
      "riskFlags",
      "quoteVersionCheckpoint",
      "approvalState",
      "pricingLineIssues",
      "stepRecommendations",
      "remediationTarget",
      "remediationSourceStep",
    ],
  },
  {
    id: "orders",
    title: "Orders workspace",
    route: PRODUCT_ROUTES.app.orders,
    summary:
      "Orders remain sequenced for later foundation work after the earlier sprints are complete.",
    status: "locked",
    primaryGoal:
      "Expose order readiness and inherited commercial truth when the roadmap reaches Sprint 6.",
    layout: [
      {
        title: "Orders list",
        purpose: "Show operational status and exceptions quickly.",
        blocks: ["Order rows", "Accepted-quote source", "Operational status"],
      },
      {
        title: "Order detail tabs",
        purpose:
          "Organize post-acceptance work without fragmenting the product.",
        blocks: ["Snapshot", "Documents", "Compliance", "Operations"],
      },
      {
        title: "Readiness panel",
        purpose: "Make blockers and next steps visible.",
        blocks: ["Document readiness", "Execution blockers", "Owner actions"],
      },
    ],
    actions: ["Review snapshot", "Resolve blockers", "Advance readiness"],
    dataContracts: [
      "orders",
      "orderSnapshot",
      "documentChecklist",
      "complianceState",
      "executionBlockers",
    ],
  },
  {
    id: "my-card",
    title: "My Card / Share Contact",
    route: PRODUCT_ROUTES.workspace.myCard,
    summary:
      "Outbound contact sharing remains later-phase work after the earlier workflow sprints are complete.",
    status: "locked",
    primaryGoal:
      "Convert trade-show and partner interactions into captured commercial demand later in the roadmap.",
    layout: [
      {
        title: "Profile card",
        purpose: "Present a clean shareable identity.",
        blocks: [
          "Representative profile",
          "Company profile",
          "Save contact CTA",
        ],
      },
      {
        title: "QR and sharing panel",
        purpose: "Bridge physical meetings and digital follow-up.",
        blocks: ["QR code", "Share actions", "Request quote CTA"],
      },
    ],
    actions: ["Share contact", "Open public card", "Request quote"],
    dataContracts: [
      "profileCard",
      "shareLinks",
      "qrPayload",
      "publicCardActions",
    ],
  },
];

export const developmentWorkspace = {
  flow: LOCKED_PRODUCT_FLOW.join(" → "),
  activeSprint: "Sprint 3 · Complete",
  completedSprint: "Sprint 2 · Complete",
  planningSurfaces,
  roadmapMilestones,
  backlogSections,
  productTracks,
  architectureLanes,
  uxRules,
  screenPlans,
  buyerReadySections,
};

export const masterPlan = roadmapMilestones;
export const backlog = backlogSections;
export const productPlan = productTracks;
export const architecturePlan = architectureLanes;
export const uxRulesPlan = uxRules;
export const developmentScreens = screenPlans;
export const buyerReadyPlan = buyerReadySections;
