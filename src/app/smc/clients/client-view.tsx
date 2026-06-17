"use client";

import { useMemo, useState } from "react";

export type SmcClientOrg = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string | null;
  member_count: number;
  module_keys: string[];
  plan: string | null;
  seats: number | null;
  stage: string;
  health_score: number;
  health_tone: "red" | "amber" | "green";
  governance_clear: boolean;
  markets_configured: boolean;
  security_configured: boolean;
  products_count: number;
  recent_leads_count: number;
  quotes_count: number;
  guru_enabled: boolean;
  signals: string[];
  needs_attention: string[];
  recent_activity: string[];
  internal: boolean;
};

function stageLabel(stage: string) {
  const normalized = stage.toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("live")) return "Live";
  if (normalized.includes("entitlement")) return "Entitlements";
  if (normalized.includes("invite")) return "Invite";
  if (normalized.includes("provision")) return "Provision";
  return "Intake";
}

function moduleName(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function healthClass(score: number) {
  if (score >= 75) return "green";
  if (score >= 45) return "amber";
  return "red";
}

export function SmcClientsClient({ clients }: { clients: SmcClientOrg[] }) {
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const selected = useMemo(
    () => clients.find((client) => client.id === selectedId) ?? clients[0],
    [clients, selectedId],
  );
  const activeClients = clients.filter((client) => !client.internal);
  const avgHealth = clients.length
    ? Math.round(clients.reduce((sum, client) => sum + client.health_score, 0) / clients.length)
    : 0;

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Growth</div>
          <h1>Client Orgs</h1>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{clients.length}</div><div className="l">Total Orgs</div></div>
        <div className="smc-kp teal"><div className="v">{activeClients.length}</div><div className="l">Client Orgs</div></div>
        <div className="smc-kp"><div className="v">{avgHealth}</div><div className="l">Avg Health</div></div>
        <div className="smc-kp green"><div className="v">{clients.filter((client) => client.governance_clear).length}</div><div className="l">Governance Clear</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(340px, .65fr)", gap: 16, padding: "0 24px 24px", overflow: "auto" }}>
        <div className="smc-client-grid" style={{ padding: 0 }}>
          {clients.map((client) => (
            <button
              type="button"
              key={client.id}
              className="smc-client-card"
              onClick={() => setSelectedId(client.id)}
              style={{ textAlign: "left", cursor: "pointer", border: selected?.id === client.id ? "1px solid #279491" : undefined }}
            >
              <h3>
                {client.name}{" "}
                {client.internal
                  ? <span className="smc-lb" style={{ background: "#e6f5f4", color: "#279491", fontSize: 9 }}>Platform</span>
                  : <span className="smc-lb" style={{ background: "#ecfdf5", color: "#10b981", fontSize: 9 }}>{stageLabel(client.stage)}</span>}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
                <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${client.health_score}%`, height: "100%", background: client.health_tone === "green" ? "#10b981" : client.health_tone === "amber" ? "#f59e0b" : "#ef4444" }} />
                </div>
                <strong style={{ fontSize: 12, color: client.health_tone === "green" ? "#10b981" : client.health_tone === "amber" ? "#d97706" : "#ef4444" }}>{client.health_score}</strong>
              </div>
              <div className="cc-meta">
                <div><span className="cc-label">Org ID</span><br /><span className="cc-val" style={{ fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{client.id.slice(0, 8)}</span></div>
                <div><span className="cc-label">Slug</span><br /><span className="cc-val">{client.slug ?? "—"}</span></div>
                <div><span className="cc-label">Members</span><br /><span className="cc-val">{client.member_count}</span></div>
                <div><span className="cc-label">Modules</span><br /><span className="cc-val">{client.module_keys.length} granted</span></div>
                <div><span className="cc-label">Plan</span><br /><span className="cc-val">{client.plan ?? "—"}</span></div>
                <div><span className="cc-label">Seats</span><br /><span className="cc-val">{client.seats ?? "—"}</span></div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <span className={`smc-lb ${healthClass(client.health_score)}`} style={{ fontSize: 10 }}>{client.health_score >= 75 ? "Healthy" : "Needs attention"}</span>
                <span className="smc-lb" style={{ background: client.governance_clear ? "#ecfdf5" : "#fef3c7", color: client.governance_clear ? "#10b981" : "#d97706", fontSize: 10 }}>{client.governance_clear ? "Governance clear" : "Governance pending"}</span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <aside className="smc-client-card" style={{ position: "sticky", top: 16, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <span className="cc-label">Selected org</span>
                <h2 style={{ margin: "4px 0 0", fontSize: 20 }}>{selected.name}</h2>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>{selected.id}</p>
              </div>
              <span className="smc-lb" style={{ background: selected.health_tone === "green" ? "#ecfdf5" : selected.health_tone === "amber" ? "#fef3c7" : "#fef2f2", color: selected.health_tone === "green" ? "#10b981" : selected.health_tone === "amber" ? "#d97706" : "#ef4444" }}>{selected.health_score}/100</span>
            </div>
            <div className="cc-meta" style={{ marginTop: 16 }}>
              <div><span className="cc-label">Stage</span><br /><span className="cc-val">{stageLabel(selected.stage)}</span></div>
              <div><span className="cc-label">Plan</span><br /><span className="cc-val">{selected.plan ?? "—"}</span></div>
              <div><span className="cc-label">Seats</span><br /><span className="cc-val">{selected.seats ?? "—"}</span></div>
              <div><span className="cc-label">Guru</span><br /><span className="cc-val">{selected.guru_enabled ? "Enabled" : "Not enabled"}</span></div>
              <div><span className="cc-label">Products</span><br /><span className="cc-val">{selected.products_count}</span></div>
              <div><span className="cc-label">Recent leads</span><br /><span className="cc-val">{selected.recent_leads_count}</span></div>
              <div><span className="cc-label">Quotes</span><br /><span className="cc-val">{selected.quotes_count}</span></div>
              <div><span className="cc-label">Security</span><br /><span className="cc-val">{selected.security_configured ? "On" : "Pending"}</span></div>
            </div>
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12 }}>Onboarding Pipeline</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Intake", "Provision", "Invite", "Entitlements", "Live"].map((stage) => (
                  <span key={stage} className="smc-lb" style={{ background: stage === stageLabel(selected.stage) ? "#e6f5f4" : "#f1f5f9", color: stage === stageLabel(selected.stage) ? "#279491" : "#64748b", fontSize: 10 }}>{stage}</span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12 }}>Modules</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selected.module_keys.length ? selected.module_keys.map((key) => <span key={key} className="smc-lb" style={{ background: "#f1f5f9", color: "#475569", fontSize: 10 }}>{moduleName(key)}</span>) : <span style={{ color: "#94a3b8", fontSize: 12 }}>No modules granted</span>}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12 }}>Healthy Signals</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selected.signals.map((signal) => <span key={signal} className="smc-lb" style={{ background: "#ecfdf5", color: "#10b981", fontSize: 10 }}>{signal}</span>)}
              </div>
            </div>
            {selected.needs_attention.length > 0 && <div style={{ marginTop: 16 }}><h4 style={{ margin: "0 0 8px", fontSize: 12 }}>Needs Attention</h4><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{selected.needs_attention.map((signal) => <span key={signal} className="smc-lb" style={{ background: "#fef3c7", color: "#d97706", fontSize: 10 }}>{signal}</span>)}</div></div>}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12 }}>Recent Activity</h4>
              {selected.recent_activity.map((item) => <p key={item} style={{ margin: "4px 0", fontSize: 12, color: "#64748b" }}>• {item}</p>)}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
