const sections = [
  {
    title: "Live Access Preflight",
    badge: "Required first",
    items: [
      "Confirm GitHub main access before code changes.",
      "Confirm live Supabase tracker read/write access.",
      "Confirm Vercel project/deployment access before resolution.",
      "Stop and report blockers when access is missing.",
    ],
  },
  {
    title: "Issue Selection",
    badge: "Tracker led",
    items: [
      "Read open issues across active sprints from public.sprint_issues.",
      "Respect severity, priority, dependencies, and parent task scope.",
      "Move the selected issue to In Progress before implementation.",
      "Add a checkpoint note with pending work and caveats.",
    ],
  },
  {
    title: "Fix Scope Rules",
    badge: "Small safe changes",
    items: [
      "Inspect current main files before editing.",
      "Use the smallest safe issue-scoped change.",
      "Do not touch unrelated routes, business logic, schema, or copy.",
      "Every new API route must include auth, organization scope, validation, and error handling.",
    ],
  },
  {
    title: "SMC Isolation",
    badge: "Internal only",
    items: [
      "SMC UI changes stay inside src/app/smc/.",
      "SMC API changes stay inside src/app/api/smc/.",
      "Do not affect SaaS routes such as dashboard, quotes, orders, leads, or public marketing.",
      "All SMC data access must stay scoped to the SETU Flow organization.",
    ],
  },
  {
    title: "Tracker Checkpoints",
    badge: "Touchpoints",
    items: [
      "Update tracker after selection, code changes, validation, GitHub, Vercel, or blockers.",
      "Each note should include completed work, files changed, Supabase changes, validation status, pending items, and caveats.",
      "Use In Review for ZIP handoff or PR review before deploy.",
      "Do not mark Resolved until deployed and verified.",
    ],
  },
  {
    title: "Closeout Proof",
    badge: "Deploy gated",
    items: [
      "Validation must include TypeScript or a clear reason why it could not run.",
      "Resolution requires main branch proof and Vercel READY/PASSED proof.",
      "If Vercel fails, inspect logs and keep the issue In Progress or In Review.",
      "Final response should include access, changes, files, Supabase, validation, progress, and next step.",
    ],
  },
  {
    title: "Setu Guru Knowledge Rule",
    badge: "Alignment",
    items: [
      "When product behavior, help content, routing, prompts, or UI logic changes Setu Guru behavior, update the related knowledge/help/policy file.",
      "Include the knowledge update in the tracker checkpoint.",
      "Add or update a regression prompt showing expected answer behavior.",
      "Do not close until product behavior and Setu Guru knowledge match.",
    ],
  },
  {
    title: "Handoff Format",
    badge: "Operator ready",
    items: [
      "Live Access Preflight",
      "Started Issue",
      "Changes Made",
      "Files Changed",
      "Supabase Changes",
      "GitHub Proof",
      "Vercel Proof",
      "Tracker Updates",
      "Validation",
      "Sprint Progress",
      "Next Step",
    ],
  },
];

export default function SmcProtocolPage() {
  return (
    <div className="smc-protocol">
      <div className="smc-ph">
        <div>
          <div className="bc">Setu Mission Control</div>
          <h1>Ops Protocol</h1>
        </div>
        <div className="ha">
          <span className="smc-protocol-pill">Internal execution rules</span>
        </div>
      </div>
      <div className="smc-protocol-hero">
        <div>
          <p className="smc-protocol-eyebrow">SMC agent workflow</p>
          <h2>Run every coding pass with live tracker discipline.</h2>
          <p>
            Use this page as the operating checklist for SMC work: preflight,
            select, checkpoint, validate, review, deploy, and only then resolve.
          </p>
        </div>
        <div className="smc-protocol-score">
          <span>Review gate</span>
          <strong>In Review</strong>
          <small>Resolved only after deployment proof</small>
        </div>
      </div>
      <div className="smc-protocol-grid">
        {sections.map((section) => (
          <section key={section.title} className="smc-protocol-card">
            <div className="smc-protocol-card-head">
              <h3>{section.title}</h3>
              <span>{section.badge}</span>
            </div>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
