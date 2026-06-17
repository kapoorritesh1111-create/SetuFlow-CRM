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
  billing_status: string;
  onboarding_stage: string;
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
  guru_monthly_request_limit: number | null;
  guru_monthly_spend_limit: number | null;
  overage_policy: string;
  trial_ends_at: string | null;
  renews_at: string | null;
  max_leads: number;
  max_quotes: number;
  max_orders: number;
  max_users: number;
  allow_exports: boolean;
  allow_invites: boolean;
  allow_settings_edit: boolean;
  allow_dispatch: boolean;
  guided_mode_enabled: boolean;
  trial_template_key: string | null;
  internal_notes: string | null;
  signals: string[];
  needs_attention: string[];
  recent_activity: string[];
  internal: boolean;
};

type EntitlementResponse = {
  entitlement?: Partial<SmcClientOrg> & {
    plan_key?: string;
    seat_limit?: number;
  };
  converted_to_paid?: boolean;
  error?: string;
};

const PLAN_OPTIONS = ["starter", "growth", "professional", "enterprise", "custom"];
const BILLING_OPTIONS = ["trial", "active", "past_due", "paused", "cancelled"];
const STAGE_OPTIONS = ["intake", "provision", "guided_trial", "invite", "entitlements", "live", "paused"];
const OVERAGE_OPTIONS = ["warn_only", "warn_then_block", "allow_overage", "block_at_limit"];
const TRIAL_TEMPLATES = ["", "export_foods_basic", "ingredient_trader", "distributor_importer", "packaging_converter"];

function stageLabel(stage: string) {
  const normalized = stage.toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("live")) return "Live";
  if (normalized.includes("guided") || normalized.includes("trial")) return "Guided Trial";
  if (normalized.includes("entitlement")) return "Entitlements";
  if (normalized.includes("invite")) return "Invite";
  if (normalized.includes("provision")) return "Provision";
  if (normalized.includes("paused")) return "Paused";
  return "Intake";
}

function titleCase(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function moduleName(key: string) {
  return titleCase(key);
}

function healthClass(score: number) {
  if (score >= 75) return "green";
  if (score >= 45) return "amber";
  return "red";
}

function safeDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function fieldStyle(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid #dbe4ef",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 12,
    background: "#fff",
    color: "#0f172a",
  };
}

function boolFromForm(form: FormData, key: string) {
  return form.get(key) === "on";
}

function numberFromForm(form: FormData, key: string, fallback: number) {
  const parsed = Number.parseInt(String(form.get(key) ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function SmcClientsClient({ clients }: { clients: SmcClientOrg[] }) {
  const [clientRows, setClientRows] = useState(clients);
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const [operationState, setOperationState] = useState<{ type: "idle" | "saving" | "success" | "error"; message: string }>({ type: "idle", message: "" });

  const selected = useMemo(
    () => clientRows.find((client) => client.id === selectedId) ?? clientRows[0],
    [clientRows, selectedId],
  );
  const activeClients = clientRows.filter((client) => !client.internal);
  const trialClients = activeClients.filter((client) => client.billing_status === "trial");
  const avgHealth = clientRows.length
    ? Math.round(clientRows.reduce((sum, client) => sum + client.health_score, 0) / clientRows.length)
    : 0;

  async function submitEntitlement(payload: Record<string, unknown>) {
    if (!selected || selected.internal) return;
    setOperationState({ type: "saving", message: "Saving client controls…" });

    const response = await fetch("/api/smc/client-entitlements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id: selected.id, ...payload }),
    });

    const json = (await response.json().catch(() => ({}))) as EntitlementResponse;
    if (!response.ok || json.error || !json.entitlement) {
      setOperationState({ type: "error", message: json.error ?? "Unable to update client controls." });
      return;
    }

    const entitlement = json.entitlement;
    setClientRows((rows) => rows.map((client) => {
      if (client.id !== selected.id) return client;
      const seats = Number(entitlement.seat_limit ?? entitlement.seats ?? client.seats ?? 0);
      const billingStatus = String(entitlement.billing_status ?? client.billing_status);
      const onboardingStage = String(entitlement.onboarding_stage ?? client.onboarding_stage);
      return {
        ...client,
        plan: String(entitlement.plan_key ?? entitlement.plan ?? client.plan ?? "enterprise"),
        seats,
        billing_status: billingStatus,
        onboarding_stage: onboardingStage,
        stage: onboardingStage,
        guru_monthly_request_limit: entitlement.guru_monthly_request_limit === undefined ? client.guru_monthly_request_limit : Number(entitlement.guru_monthly_request_limit),
        guru_monthly_spend_limit: entitlement.guru_monthly_spend_limit === undefined ? client.guru_monthly_spend_limit : Number(entitlement.guru_monthly_spend_limit),
        overage_policy: String(entitlement.overage_policy ?? client.overage_policy),
        trial_ends_at: (entitlement.trial_ends_at as string | null | undefined) ?? null,
        renews_at: (entitlement.renews_at as string | null | undefined) ?? null,
        max_leads: Number(entitlement.max_leads ?? client.max_leads),
        max_quotes: Number(entitlement.max_quotes ?? client.max_quotes),
        max_orders: Number(entitlement.max_orders ?? client.max_orders),
        max_users: Number(entitlement.max_users ?? client.max_users),
        allow_exports: Boolean(entitlement.allow_exports ?? client.allow_exports),
        allow_invites: Boolean(entitlement.allow_invites ?? client.allow_invites),
        allow_settings_edit: Boolean(entitlement.allow_settings_edit ?? client.allow_settings_edit),
        allow_dispatch: Boolean(entitlement.allow_dispatch ?? client.allow_dispatch),
        guided_mode_enabled: Boolean(entitlement.guided_mode_enabled ?? client.guided_mode_enabled),
        trial_template_key: (entitlement.trial_template_key as string | null | undefined) ?? null,
        internal_notes: (entitlement.internal_notes as string | null | undefined) ?? client.internal_notes,
        security_configured: Boolean((entitlement.allow_invites ?? client.allow_invites) && (entitlement.allow_settings_edit ?? client.allow_settings_edit)),
        needs_attention: billingStatus === "trial"
          ? Array.from(new Set([...client.needs_attention, "Trial conversion"]))
          : client.needs_attention.filter((item) => item !== "Trial conversion"),
        signals: billingStatus === "active"
          ? Array.from(new Set([...client.signals, "Paid/active"]))
          : client.signals.filter((item) => item !== "Paid/active"),
      };
    }));

    setOperationState({
      type: "success",
      message: json.converted_to_paid ? "Trial converted to a paid active client." : "Client controls updated.",
    });
  }

  async function saveControls(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await submitEntitlement({
      plan_key: String(form.get("plan_key") ?? selected.plan ?? "enterprise"),
      billing_status: String(form.get("billing_status") ?? selected.billing_status),
      onboarding_stage: String(form.get("onboarding_stage") ?? selected.onboarding_stage),
      seat_limit: numberFromForm(form, "seat_limit", selected.seats ?? 25),
      guru_monthly_request_limit: numberFromForm(form, "guru_monthly_request_limit", selected.guru_monthly_request_limit ?? 25000),
      guru_monthly_spend_limit: Number(form.get("guru_monthly_spend_limit") ?? selected.guru_monthly_spend_limit ?? 2500),
      overage_policy: String(form.get("overage_policy") ?? selected.overage_policy),
      trial_ends_at: String(form.get("trial_ends_at") ?? "") || null,
      renews_at: String(form.get("renews_at") ?? "") || null,
      max_leads: numberFromForm(form, "max_leads", selected.max_leads),
      max_quotes: numberFromForm(form, "max_quotes", selected.max_quotes),
      max_orders: numberFromForm(form, "max_orders", selected.max_orders),
      max_users: numberFromForm(form, "max_users", selected.max_users || selected.seats || 25),
      allow_exports: boolFromForm(form, "allow_exports"),
      allow_invites: boolFromForm(form, "allow_invites"),
      allow_settings_edit: boolFromForm(form, "allow_settings_edit"),
      allow_dispatch: boolFromForm(form, "allow_dispatch"),
      guided_mode_enabled: boolFromForm(form, "guided_mode_enabled"),
      trial_template_key: String(form.get("trial_template_key") ?? "") || null,
      internal_notes: String(form.get("internal_notes") ?? ""),
    });
  }

  async function convertTrialToPaid() {
    if (!selected) return;
    await submitEntitlement({
      plan_key: selected.plan && selected.plan !== "starter" ? selected.plan : "enterprise",
      billing_status: "active",
      onboarding_stage: "live",
      seat_limit: Math.max(selected.seats ?? 25, 25),
      trial_ends_at: null,
      renews_at: selected.renews_at ?? null,
      max_users: Math.max(selected.max_users || selected.seats || 25, 25),
      allow_exports: true,
      allow_invites: true,
      allow_settings_edit: true,
      allow_dispatch: true,
      guided_mode_enabled: false,
    });
  }

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Growth</div>
          <h1>Client Orgs</h1>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{clientRows.length}</div><div className="l">Total Orgs</div></div>
        <div className="smc-kp teal"><div className="v">{activeClients.length}</div><div className="l">Client Orgs</div></div>
        <div className="smc-kp"><div className="v">{avgHealth}</div><div className="l">Avg Health</div></div>
        <div className="smc-kp green"><div className="v">{trialClients.length}</div><div className="l">Trial Clients</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(400px, .75fr)", gap: 16, padding: "0 24px 24px", overflow: "auto" }}>
        <div className="smc-client-grid" style={{ padding: 0 }}>
          {clientRows.map((client) => (
            <button
              type="button"
              key={client.id}
              className="smc-client-card"
              onClick={() => {
                setSelectedId(client.id);
                setOperationState({ type: "idle", message: "" });
              }}
              style={{ textAlign: "left", cursor: "pointer", border: selected?.id === client.id ? "1px solid #279491" : undefined }}
            >
              <h3>
                {client.name}{" "}
                {client.internal
                  ? <span className="smc-lb" style={{ background: "#e6f5f4", color: "#279491", fontSize: 9 }}>Platform</span>
                  : <span className="smc-lb" style={{ background: client.billing_status === "trial" ? "#fef3c7" : "#ecfdf5", color: client.billing_status === "trial" ? "#d97706" : "#10b981", fontSize: 9 }}>{titleCase(client.billing_status)}</span>}
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
                <div><span className="cc-label">Stage</span><br /><span className="cc-val">{stageLabel(client.stage)}</span></div>
                <div><span className="cc-label">Modules</span><br /><span className="cc-val">{client.module_keys.length} granted</span></div>
                <div><span className="cc-label">Plan</span><br /><span className="cc-val">{titleCase(client.plan)}</span></div>
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
          <aside className="smc-client-card" style={{ position: "sticky", top: 16, alignSelf: "start", maxHeight: "calc(100vh - 120px)", overflow: "auto" }}>
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
              <div><span className="cc-label">Billing</span><br /><span className="cc-val">{titleCase(selected.billing_status)}</span></div>
              <div><span className="cc-label">Plan</span><br /><span className="cc-val">{titleCase(selected.plan)}</span></div>
              <div><span className="cc-label">Seats</span><br /><span className="cc-val">{selected.seats ?? "—"}</span></div>
              <div><span className="cc-label">Trial ends</span><br /><span className="cc-val">{safeDate(selected.trial_ends_at) || "—"}</span></div>
              <div><span className="cc-label">Renews</span><br /><span className="cc-val">{safeDate(selected.renews_at) || "—"}</span></div>
              <div><span className="cc-label">Guru requests</span><br /><span className="cc-val">{selected.guru_monthly_request_limit ?? "—"}</span></div>
              <div><span className="cc-label">Max users</span><br /><span className="cc-val">{selected.max_users || selected.seats || "—"}</span></div>
            </div>

            {!selected.internal && (
              <form key={`${selected.id}-${selected.billing_status}-${selected.plan}-${selected.seats}`} onSubmit={saveControls} style={{ marginTop: 18, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 13 }}>Client Operations</h4>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>Upgrade, convert trials, and adjust access without leaving SMC.</p>
                  </div>
                  {selected.billing_status === "trial" && (
                    <button type="button" className="smc-btn primary" onClick={convertTrialToPaid} disabled={operationState.type === "saving"} style={{ whiteSpace: "nowrap" }}>Convert to paid</button>
                  )}
                </div>

                {operationState.message && (
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: operationState.type === "error" ? "#ef4444" : operationState.type === "success" ? "#10b981" : "#64748b" }}>{operationState.message}</p>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ fontSize: 11, color: "#475569" }}>Plan<br />
                    <select name="plan_key" defaultValue={PLAN_OPTIONS.includes(selected.plan ?? "") ? selected.plan ?? "enterprise" : "enterprise"} style={fieldStyle()}>
                      {PLAN_OPTIONS.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Billing<br />
                    <select name="billing_status" defaultValue={selected.billing_status} style={fieldStyle()}>
                      {BILLING_OPTIONS.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Stage<br />
                    <select name="onboarding_stage" defaultValue={selected.onboarding_stage} style={fieldStyle()}>
                      {STAGE_OPTIONS.map((option) => <option key={option} value={option}>{stageLabel(option)}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Seats<br />
                    <input name="seat_limit" type="number" min={1} defaultValue={selected.seats ?? 25} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Trial ends<br />
                    <input name="trial_ends_at" type="date" defaultValue={safeDate(selected.trial_ends_at)} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Renews<br />
                    <input name="renews_at" type="date" defaultValue={safeDate(selected.renews_at)} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Guru requests<br />
                    <input name="guru_monthly_request_limit" type="number" min={0} defaultValue={selected.guru_monthly_request_limit ?? 25000} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Guru spend cap<br />
                    <input name="guru_monthly_spend_limit" type="number" min={0} step="0.01" defaultValue={selected.guru_monthly_spend_limit ?? 2500} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Max users<br />
                    <input name="max_users" type="number" min={0} defaultValue={selected.max_users || selected.seats || 25} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Max leads<br />
                    <input name="max_leads" type="number" min={0} defaultValue={selected.max_leads} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Max quotes<br />
                    <input name="max_quotes" type="number" min={0} defaultValue={selected.max_quotes} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Max orders<br />
                    <input name="max_orders" type="number" min={0} defaultValue={selected.max_orders} style={fieldStyle()} />
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Overage<br />
                    <select name="overage_policy" defaultValue={selected.overage_policy} style={fieldStyle()}>
                      {OVERAGE_OPTIONS.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: "#475569" }}>Trial template<br />
                    <select name="trial_template_key" defaultValue={selected.trial_template_key ?? ""} style={fieldStyle()}>
                      {TRIAL_TEMPLATES.map((option) => <option key={option || "none"} value={option}>{option ? titleCase(option) : "None"}</option>)}
                    </select>
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  {[
                    ["allow_exports", "Exports", selected.allow_exports],
                    ["allow_invites", "Invites", selected.allow_invites],
                    ["allow_settings_edit", "Settings edit", selected.allow_settings_edit],
                    ["allow_dispatch", "Dispatch", selected.allow_dispatch],
                    ["guided_mode_enabled", "Guided mode", selected.guided_mode_enabled],
                  ].map(([key, label, checked]) => (
                    <label key={String(key)} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#475569" }}>
                      <input name={String(key)} type="checkbox" defaultChecked={Boolean(checked)} /> {String(label)}
                    </label>
                  ))}
                </div>

                <label style={{ display: "block", marginTop: 12, fontSize: 11, color: "#475569" }}>Internal notes<br />
                  <textarea name="internal_notes" defaultValue={selected.internal_notes ?? ""} rows={3} style={{ ...fieldStyle(), resize: "vertical" }} />
                </label>

                <button type="submit" className="smc-btn primary" disabled={operationState.type === "saving"} style={{ width: "100%", marginTop: 12 }}>
                  {operationState.type === "saving" ? "Saving…" : "Save client controls"}
                </button>
              </form>
            )}

            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12 }}>Onboarding Pipeline</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Intake", "Provision", "Guided Trial", "Invite", "Entitlements", "Live"].map((stage) => (
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
