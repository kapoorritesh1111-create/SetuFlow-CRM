"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { MODULE_DEFINITIONS, type ModuleKey } from "@/lib/modules/module-grants";

export type SmcClientModuleGrant = {
  module_key: ModuleKey;
  enabled: boolean;
};

export type SmcClientApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
};

export type SmcClientOrg = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string | null;
  member_count: number;
  module_keys: string[];
  module_grants: SmcClientModuleGrant[];
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
  guru_requests_used: number;
  guru_spend_used: number;
  guru_model: string;
  guru_live_search_enabled: boolean;
  guru_writeback_enabled: boolean;
  guru_require_admin_approval: boolean;
  guru_ai_analytics_enabled: boolean;
  guru_daily_search_budget: number;
  api_keys: SmcClientApiKey[];
  api_rate_limit_value: number | null;
  api_rate_limit_window_ms: number | null;
  api_rate_limit_reason: string | null;
  api_rate_limit_key_prefix: string | null;
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

type ModuleGrantResponse = {
  grant?: SmcClientModuleGrant;
  error?: string;
};

type GuruAccessResponse = {
  guru_settings?: {
    model?: string;
    live_search_enabled?: boolean;
    writeback_enabled?: boolean;
    require_admin_approval?: boolean;
    ai_analytics_enabled?: boolean;
    daily_search_budget?: number;
  };
  api_rate_limit?: {
    key_prefix?: string;
    limit_value?: number;
    window_ms?: number;
    reason?: string | null;
  };
  api_keys?: SmcClientApiKey[];
  revoked_api_key_id?: string | null;
  error?: string;
};

const PLAN_OPTIONS = ["starter", "growth", "professional", "enterprise", "custom"];
const BILLING_OPTIONS = ["trial", "active", "past_due", "paused", "cancelled"];
const STAGE_OPTIONS = ["intake", "provision", "guided_trial", "invite", "entitlements", "live", "paused"];
const OVERAGE_OPTIONS = ["warn_only", "warn_then_block", "allow_overage", "block_at_limit"];
const TRIAL_TEMPLATES = ["", "export_foods_basic", "ingredient_trader", "distributor_importer", "packaging_converter"];
const GURU_MODEL_OPTIONS = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"];

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
  if (!value) return "-";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function moduleName(key: string) {
  const definition = MODULE_DEFINITIONS.find((moduleDef) => moduleDef.key === key);
  return definition?.title ?? titleCase(key);
}

function healthClass(score: number) {
  if (score >= 75) return "green";
  if (score >= 45) return "amber";
  return "red";
}

function safeDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function ratio(used: number, limit: number | null) {
  if (!limit) return "0%";
  return `${Math.min(100, Math.round((used / limit) * 100))}%`;
}

function fieldStyle(): CSSProperties {
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

function decimalFromForm(form: FormData, key: string, fallback: number) {
  const parsed = Number(String(form.get(key) ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isModuleEnabled(client: SmcClientOrg, moduleKey: ModuleKey) {
  return client.module_grants.some((grant) => grant.module_key === moduleKey && grant.enabled);
}

function nextModuleState(grants: SmcClientModuleGrant[], grant: SmcClientModuleGrant) {
  const existing = grants.some((item) => item.module_key === grant.module_key);
  if (!existing) return [...grants, grant];
  return grants.map((item) => (item.module_key === grant.module_key ? grant : item));
}

function activeKeyCount(client: SmcClientOrg) {
  return client.api_keys.filter((key) => key.is_active && !key.revoked_at).length;
}

function statusColor(type: "idle" | "saving" | "success" | "error") {
  if (type === "error") return "#ef4444";
  if (type === "success") return "#10b981";
  return "#64748b";
}

export function SmcClientsClient({ clients }: { clients: SmcClientOrg[] }) {
  const [clientRows, setClientRows] = useState(clients);
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const [operationState, setOperationState] = useState<{ type: "idle" | "saving" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [moduleState, setModuleState] = useState<{ type: "idle" | "saving" | "success" | "error"; message: string; moduleKey?: ModuleKey }>({ type: "idle", message: "" });
  const [guruApiState, setGuruApiState] = useState<{ type: "idle" | "saving" | "success" | "error"; message: string; apiKeyId?: string }>({ type: "idle", message: "" });

  const selected = useMemo(
    () => clientRows.find((client) => client.id === selectedId) ?? clientRows[0],
    [clientRows, selectedId],
  );
  const activeClients = clientRows.filter((client) => !client.internal);
  const trialClients = activeClients.filter((client) => client.billing_status === "trial");
  const avgHealth = clientRows.length
    ? Math.round(clientRows.reduce((sum, client) => sum + client.health_score, 0) / clientRows.length)
    : 0;

  function resetStates() {
    setOperationState({ type: "idle", message: "" });
    setModuleState({ type: "idle", message: "" });
    setGuruApiState({ type: "idle", message: "" });
  }

  async function submitEntitlement(payload: Record<string, unknown>) {
    if (!selected || selected.internal) return;
    setOperationState({ type: "saving", message: "Saving client controls..." });

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

  async function submitGuruApiAccess(payload: Record<string, unknown>, options?: { apiKeyId?: string; message?: string }) {
    if (!selected || selected.internal) return;
    setGuruApiState({ type: "saving", apiKeyId: options?.apiKeyId, message: options?.message ?? "Saving Guru/API access..." });

    const response = await fetch("/api/smc/client-guru-api-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id: selected.id, ...payload }),
    });

    const json = (await response.json().catch(() => ({}))) as GuruAccessResponse;
    if (!response.ok || json.error || !json.guru_settings || !json.api_rate_limit) {
      setGuruApiState({ type: "error", apiKeyId: options?.apiKeyId, message: json.error ?? "Unable to update Guru/API access." });
      return;
    }

    setClientRows((rows) => rows.map((client) => {
      if (client.id !== selected.id) return client;
      const activeKeys = (json.api_keys ?? client.api_keys).filter((key) => key.is_active && !key.revoked_at).length;
      return {
        ...client,
        guru_enabled: true,
        guru_model: json.guru_settings?.model ?? client.guru_model,
        guru_live_search_enabled: Boolean(json.guru_settings?.live_search_enabled ?? client.guru_live_search_enabled),
        guru_writeback_enabled: Boolean(json.guru_settings?.writeback_enabled ?? client.guru_writeback_enabled),
        guru_require_admin_approval: Boolean(json.guru_settings?.require_admin_approval ?? client.guru_require_admin_approval),
        guru_ai_analytics_enabled: Boolean(json.guru_settings?.ai_analytics_enabled ?? client.guru_ai_analytics_enabled),
        guru_daily_search_budget: Number(json.guru_settings?.daily_search_budget ?? client.guru_daily_search_budget),
        api_keys: json.api_keys ?? client.api_keys,
        api_rate_limit_value: Number(json.api_rate_limit?.limit_value ?? client.api_rate_limit_value ?? 0),
        api_rate_limit_window_ms: Number(json.api_rate_limit?.window_ms ?? client.api_rate_limit_window_ms ?? 86400000),
        api_rate_limit_reason: json.api_rate_limit?.reason ?? client.api_rate_limit_reason,
        api_rate_limit_key_prefix: json.api_rate_limit?.key_prefix ?? client.api_rate_limit_key_prefix,
        signals: activeKeys > 0 || json.api_rate_limit ? Array.from(new Set([...client.signals, "API access governed", "Guru enabled"])) : client.signals,
        needs_attention: client.needs_attention.filter((item) => item !== "Guru config" && item !== "API rate limit"),
        recent_activity: client.recent_activity.map((item) => item.includes("active API keys") ? `${activeKeys} active API keys` : item),
      };
    }));

    setGuruApiState({
      type: "success",
      message: json.revoked_api_key_id ? "API key revoked and access policy saved." : "Guru/API access policy saved.",
    });
  }

  async function setModuleGrant(moduleKey: ModuleKey, enabled: boolean) {
    if (!selected || selected.internal) return;
    setModuleState({ type: "saving", moduleKey, message: `${enabled ? "Enabling" : "Disabling"} ${moduleName(moduleKey)}...` });

    const response = await fetch("/api/smc/client-module-grants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id: selected.id, module_key: moduleKey, enabled }),
    });

    const json = (await response.json().catch(() => ({}))) as ModuleGrantResponse;
    if (!response.ok || json.error || !json.grant) {
      setModuleState({ type: "error", moduleKey, message: json.error ?? "Unable to update module access." });
      return;
    }

    setClientRows((rows) => rows.map((client) => {
      if (client.id !== selected.id) return client;
      const moduleGrants = nextModuleState(client.module_grants, json.grant!);
      const moduleKeys = moduleGrants.filter((grant) => grant.enabled).map((grant) => grant.module_key);
      return {
        ...client,
        module_grants: moduleGrants,
        module_keys: moduleKeys,
        guru_enabled: moduleKeys.includes("setu_guru") || client.guru_enabled,
        needs_attention: moduleKeys.length > 0
          ? client.needs_attention.filter((item) => item !== "Module access")
          : Array.from(new Set([...client.needs_attention, "Module access"])),
        recent_activity: client.recent_activity.map((item) => item.includes("modules enabled") ? `${moduleKeys.length} modules enabled` : item),
      };
    }));

    setModuleState({ type: "success", moduleKey, message: `${moduleName(moduleKey)} ${enabled ? "enabled" : "disabled"}.` });
  }

  async function saveControls(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await submitEntitlement({
      plan_key: String(form.get("plan_key") ?? selected.plan ?? "enterprise"),
      billing_status: String(form.get("billing_status") ?? selected.billing_status),
      onboarding_stage: String(form.get("onboarding_stage") ?? selected.onboarding_stage),
      seat_limit: numberFromForm(form, "seat_limit", selected.seats ?? 25),
      guru_monthly_request_limit: numberFromForm(form, "guru_monthly_request_limit", selected.guru_monthly_request_limit ?? 25000),
      guru_monthly_spend_limit: decimalFromForm(form, "guru_monthly_spend_limit", selected.guru_monthly_spend_limit ?? 2500),
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

  async function saveGuruApiAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await submitGuruApiAccess({
      model: String(form.get("guru_model") ?? selected.guru_model),
      live_search_enabled: boolFromForm(form, "guru_live_search_enabled"),
      writeback_enabled: boolFromForm(form, "guru_writeback_enabled"),
      require_admin_approval: boolFromForm(form, "guru_require_admin_approval"),
      ai_analytics_enabled: boolFromForm(form, "guru_ai_analytics_enabled"),
      daily_search_budget: numberFromForm(form, "guru_daily_search_budget", selected.guru_daily_search_budget),
      api_rate_limit_value: numberFromForm(form, "api_rate_limit_value", selected.api_rate_limit_value ?? 1000),
      api_rate_limit_window_ms: numberFromForm(form, "api_rate_limit_window_ms", selected.api_rate_limit_window_ms ?? 86400000),
      api_rate_limit_reason: String(form.get("api_rate_limit_reason") ?? selected.api_rate_limit_reason ?? "SMC client API access policy"),
    });
  }

  async function revokeApiKey(apiKeyId: string) {
    if (!selected) return;
    await submitGuruApiAccess({
      model: selected.guru_model,
      live_search_enabled: selected.guru_live_search_enabled,
      writeback_enabled: selected.guru_writeback_enabled,
      require_admin_approval: selected.guru_require_admin_approval,
      ai_analytics_enabled: selected.guru_ai_analytics_enabled,
      daily_search_budget: selected.guru_daily_search_budget,
      api_rate_limit_value: selected.api_rate_limit_value ?? 1000,
      api_rate_limit_window_ms: selected.api_rate_limit_window_ms ?? 86400000,
      api_rate_limit_reason: selected.api_rate_limit_reason ?? "SMC client API key revoke",
      revoke_api_key_id: apiKeyId,
    }, { apiKeyId, message: "Revoking API key..." });
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(420px, .75fr)", gap: 16, padding: "0 24px 24px", overflow: "auto" }}>
        <div className="smc-client-grid" style={{ padding: 0 }}>
          {clientRows.map((client) => (
            <button
              type="button"
              key={client.id}
              className="smc-client-card"
              onClick={() => {
                setSelectedId(client.id);
                resetStates();
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
                <div><span className="cc-label">Stage</span><br /><span className="cc-val">{stageLabel(client.stage)}</span></div>
                <div><span className="cc-label">Modules</span><br /><span className="cc-val">{client.module_keys.length} enabled</span></div>
                <div><span className="cc-label">Plan</span><br /><span className="cc-val">{titleCase(client.plan)}</span></div>
                <div><span className="cc-label">API keys</span><br /><span className="cc-val">{activeKeyCount(client)} active</span></div>
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
              <div><span className="cc-label">Seats</span><br /><span className="cc-val">{selected.seats ?? "-"}</span></div>
              <div><span className="cc-label">Guru requests</span><br /><span className="cc-val">{selected.guru_requests_used}/{selected.guru_monthly_request_limit ?? "-"}</span></div>
              <div><span className="cc-label">API keys</span><br /><span className="cc-val">{activeKeyCount(selected)} active</span></div>
            </div>

            {!selected.internal && (
              <>
                <section style={{ marginTop: 18, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13 }}>Module Grants</h4>
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>Add, remove, enable, or disable client modules from SMC.</p>
                    </div>
                    <span className="smc-lb" style={{ background: "#e6f5f4", color: "#279491", fontSize: 10 }}>{selected.module_keys.length}/{MODULE_DEFINITIONS.length} enabled</span>
                  </div>

                  {moduleState.message && (
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: statusColor(moduleState.type) }}>{moduleState.message}</p>
                  )}

                  <div style={{ display: "grid", gap: 8 }}>
                    {MODULE_DEFINITIONS.map((moduleDef) => {
                      const enabled = isModuleEnabled(selected, moduleDef.key);
                      const saving = moduleState.type === "saving" && moduleState.moduleKey === moduleDef.key;
                      return (
                        <div key={moduleDef.key} style={{ border: `1px solid ${enabled ? "#99f6e4" : "#e2e8f0"}`, borderRadius: 12, padding: 10, background: enabled ? "#f0fdfa" : "#fff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div>
                              <strong style={{ display: "block", fontSize: 12, color: "#0f172a" }}>{moduleDef.title}</strong>
                              <span style={{ display: "block", marginTop: 2, fontSize: 10, color: "#64748b", lineHeight: 1.35 }}>{moduleDef.subtitle}</span>
                            </div>
                            <span className="smc-lb" style={{ background: enabled ? "#ecfdf5" : "#f1f5f9", color: enabled ? "#10b981" : "#64748b", fontSize: 9 }}>{enabled ? "Enabled" : "Disabled"}</span>
                          </div>
                          <button type="button" className={enabled ? "smc-btn" : "smc-btn primary"} disabled={saving} onClick={() => setModuleGrant(moduleDef.key, !enabled)} style={{ width: "100%", marginTop: 8 }}>
                            {saving ? "Saving..." : enabled ? "Disable / remove access" : "Enable / add access"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <form key={`${selected.id}-guru-${selected.guru_model}-${selected.api_rate_limit_value ?? "default"}`} onSubmit={saveGuruApiAccess} style={{ marginTop: 18, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13 }}>Guru Credits & API Access</h4>
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>Manage Guru runtime settings, credit posture, API keys, and rate limits per client.</p>
                    </div>
                    <span className="smc-lb" style={{ background: "#f0fdfa", color: "#0f766e", fontSize: 10 }}>{activeKeyCount(selected)} active keys</span>
                  </div>

                  {guruApiState.message && (
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: statusColor(guruApiState.type) }}>{guruApiState.message}</p>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10 }}>
                      <span className="cc-label">Monthly requests</span>
                      <div className="cc-val" style={{ marginTop: 4 }}>{selected.guru_requests_used.toLocaleString()} / {(selected.guru_monthly_request_limit ?? 0).toLocaleString()}</div>
                      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, marginTop: 8, overflow: "hidden" }}><div style={{ width: ratio(selected.guru_requests_used, selected.guru_monthly_request_limit), height: "100%", background: "#279491" }} /></div>
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10 }}>
                      <span className="cc-label">Monthly spend</span>
                      <div className="cc-val" style={{ marginTop: 4 }}>{money(selected.guru_spend_used)} / {money(selected.guru_monthly_spend_limit)}</div>
                      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, marginTop: 8, overflow: "hidden" }}><div style={{ width: ratio(selected.guru_spend_used, selected.guru_monthly_spend_limit), height: "100%", background: "#279491" }} /></div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={{ fontSize: 11, color: "#475569" }}>Guru model<br />
                      <select name="guru_model" defaultValue={selected.guru_model} style={fieldStyle()}>
                        {GURU_MODEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: 11, color: "#475569" }}>Daily search budget<br />
                      <input name="guru_daily_search_budget" type="number" min={0} defaultValue={selected.guru_daily_search_budget} style={fieldStyle()} />
                    </label>
                    <label style={{ fontSize: 11, color: "#475569" }}>API requests<br />
                      <input name="api_rate_limit_value" type="number" min={0} defaultValue={selected.api_rate_limit_value ?? 1000} style={fieldStyle()} />
                    </label>
                    <label style={{ fontSize: 11, color: "#475569" }}>Window ms<br />
                      <input name="api_rate_limit_window_ms" type="number" min={1000} defaultValue={selected.api_rate_limit_window_ms ?? 86400000} style={fieldStyle()} />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                    {[
                      { key: "guru_live_search_enabled", label: "Live search", checked: selected.guru_live_search_enabled },
                      { key: "guru_writeback_enabled", label: "Writeback", checked: selected.guru_writeback_enabled },
                      { key: "guru_require_admin_approval", label: "Admin approval", checked: selected.guru_require_admin_approval },
                      { key: "guru_ai_analytics_enabled", label: "AI analytics", checked: selected.guru_ai_analytics_enabled },
                    ].map((item) => (
                      <label key={item.key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#475569" }}>
                        <input name={item.key} type="checkbox" defaultChecked={item.checked} /> {item.label}
                      </label>
                    ))}
                  </div>

                  <label style={{ display: "block", marginTop: 12, fontSize: 11, color: "#475569" }}>Rate-limit reason<br />
                    <textarea name="api_rate_limit_reason" defaultValue={selected.api_rate_limit_reason ?? "SMC client API access policy"} rows={2} style={{ ...fieldStyle(), resize: "vertical" }} />
                  </label>

                  <button type="submit" className="smc-btn primary" disabled={guruApiState.type === "saving"} style={{ width: "100%", marginTop: 12 }}>
                    {guruApiState.type === "saving" && !guruApiState.apiKeyId ? "Saving..." : "Save Guru/API access"}
                  </button>

                  <div style={{ marginTop: 14 }}>
                    <h5 style={{ margin: "0 0 8px", fontSize: 12 }}>API keys</h5>
                    {selected.api_keys.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>No API keys have been created for this client yet.</p>}
                    <div style={{ display: "grid", gap: 8 }}>
                      {selected.api_keys.map((apiKey) => {
                        const isSaving = guruApiState.type === "saving" && guruApiState.apiKeyId === apiKey.id;
                        return (
                          <div key={apiKey.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: apiKey.is_active ? "#fff" : "#f8fafc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div>
                                <strong style={{ display: "block", fontSize: 12, color: "#0f172a" }}>{apiKey.name}</strong>
                                <span style={{ display: "block", marginTop: 2, fontSize: 10, color: "#64748b" }}>{apiKey.key_prefix} - {apiKey.scopes.length} scopes - Last used {safeDate(apiKey.last_used_at) || "never"}</span>
                              </div>
                              <span className="smc-lb" style={{ background: apiKey.is_active ? "#ecfdf5" : "#f1f5f9", color: apiKey.is_active ? "#10b981" : "#64748b", fontSize: 9 }}>{apiKey.is_active ? "Active" : "Revoked"}</span>
                            </div>
                            {apiKey.is_active && (
                              <button type="button" className="smc-btn" disabled={isSaving} onClick={() => revokeApiKey(apiKey.id)} style={{ width: "100%", marginTop: 8 }}>
                                {isSaving ? "Revoking..." : "Revoke key"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </form>

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
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: statusColor(operationState.type) }}>{operationState.message}</p>
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
                      { key: "allow_exports", label: "Exports", checked: selected.allow_exports },
                      { key: "allow_invites", label: "Invites", checked: selected.allow_invites },
                      { key: "allow_settings_edit", label: "Settings edit", checked: selected.allow_settings_edit },
                      { key: "allow_dispatch", label: "Dispatch", checked: selected.allow_dispatch },
                      { key: "guided_mode_enabled", label: "Guided mode", checked: selected.guided_mode_enabled },
                    ].map((item) => (
                      <label key={item.key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#475569" }}>
                        <input name={item.key} type="checkbox" defaultChecked={item.checked} /> {item.label}
                      </label>
                    ))}
                  </div>

                  <label style={{ display: "block", marginTop: 12, fontSize: 11, color: "#475569" }}>Internal notes<br />
                    <textarea name="internal_notes" defaultValue={selected.internal_notes ?? ""} rows={3} style={{ ...fieldStyle(), resize: "vertical" }} />
                  </label>

                  <button type="submit" className="smc-btn primary" disabled={operationState.type === "saving"} style={{ width: "100%", marginTop: 12 }}>
                    {operationState.type === "saving" ? "Saving..." : "Save client controls"}
                  </button>
                </form>
              </>
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
                {selected.module_keys.length ? selected.module_keys.map((key) => <span key={key} className="smc-lb" style={{ background: "#f1f5f9", color: "#475569", fontSize: 10 }}>{moduleName(key)}</span>) : <span style={{ color: "#94a3b8", fontSize: 12 }}>No modules enabled</span>}
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
              {selected.recent_activity.map((item) => <p key={item} style={{ margin: "4px 0", fontSize: 12, color: "#64748b" }}>- {item}</p>)}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
