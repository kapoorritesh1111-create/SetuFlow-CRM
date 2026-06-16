export const dynamic = "force-dynamic";

const SETTINGS_SECTIONS = [
  {
    title: "Workspace Preferences",
    status: "Ready",
    body: "Default SMC view, compact table density, and personal workspace display preferences.",
    items: ["Default view: Issues", "Density: Comfortable", "Sidebar: Expanded"],
  },
  {
    title: "Notifications",
    status: "Next",
    body: "Route operational alerts for issues, board movement, comments, and realtime team chat.",
    items: ["In-app alerts", "Chat message alerts", "Issue assignment alerts"],
  },
  {
    title: "Team & Access",
    status: "Read only",
    body: "SMC access is controlled from organization membership and role policies.",
    items: ["Ritesh Kapoor", "Kumar Mayank", "Ankush Arya"],
  },
  {
    title: "Issue Defaults",
    status: "Ready",
    body: "Defaults used when creating SMC issues from the command center.",
    items: ["Sprint: 27", "Status: Open", "Reporter: Ritesh Kapoor"],
  },
  {
    title: "Data & Automation",
    status: "Live",
    body: "Tracker data, realtime chat, storage attachments, and deployment signals used by SMC.",
    items: ["Supabase tracker", "Realtime chat", "Attachment storage"],
  },
  {
    title: "Protected Controls",
    status: "Protected",
    body: "High-impact workspace controls stay protected until permission gates are finalized.",
    items: ["Sprint archive policy", "Automation controls", "Workspace audit trail"],
  },
];

export default function SmcSettingsPage() {
  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Operations</div>
          <h1>Settings</h1>
        </div>
      </div>

      <section className="smc-settings-page">
        <div className="smc-settings-hero">
          <div>
            <span className="smc-settings-kicker">Setu Mission Control</span>
            <h2>Workspace settings hub</h2>
            <p>
              Manage the defaults, routing, and protected controls that shape the SMC operating workspace.
            </p>
          </div>
          <div className="smc-settings-summary">
            <strong>Live workspace</strong>
            <span>Settings are shown as operational cards so the page feels useful while deeper controls are promoted.</span>
          </div>
        </div>

        <div className="smc-settings-grid">
          {SETTINGS_SECTIONS.map((section) => (
            <article className="smc-settings-card" key={section.title}>
              <div className="smc-settings-card-head">
                <h3>{section.title}</h3>
                <span>{section.status}</span>
              </div>
              <p>{section.body}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button className="smc-btn is-disabled" disabled title="Detailed controls are being promoted from page-level settings.">
                Configure soon
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
