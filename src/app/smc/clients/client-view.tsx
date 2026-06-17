"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
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

type TabKey = "overview" | "modules" | "entitlements" | "guru" | "lifecycle" | "activity";

type SaveState = {
  type: "idle" | "saving" | "success" | "error";
  message: string;
  moduleKey?: ModuleKey;
  apiKeyId?: string;
};

const PLAN_OPTIONS = ["starter", "growth", "professional", "enterprise", "custom"];
const BILLING_OPTIONS = ["trial", "active", "past_due", "paused", "cancelled"];
const STAGE_OPTIONS = ["intake", "provision", "guided_trial", "invite", "entitlements", "live", "paused"];
const OVERAGE_OPTIONS = ["warn_only", "warn_then_block", "allow_overage", "block_at_limit"];
const TRIAL_TEMPLATES = ["", "export_foods_basic", "ingredient_trader", "distributor_importer", "packaging_converter"];
const GURU_MODEL_OPTIONS = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"];
const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "◇" },
  { key: "modules", label: "Modules", icon: "▦" },
  { key: "entitlements", label: "Entitlements", icon: "▣" },
  { key: "guru", label: "Guru & API", icon: "✦" },
  { key: "lifecycle", label: "Lifecycle", icon: "↗" },
  { key: "activity", label: "Activity", icon: "↺" },
];

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
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 12,
    background: "#fff",
    color: "#0f172a",
  };
}

function cardStyle(extra?: CSSProperties): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.04)",
    ...extra,
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

function statusColor(type: SaveState["type"]) {
  if (type === "error") return "#ef4444";
  if (type === "success") return "#10b981";
  return "#64748b";
}

function statusLabel(client: SmcClientOrg) {
  if (client.internal) return "Platform";
  return titleCase(client.billing_status);
}

function healthColor(client: SmcClientOrg) {
  if (client.health_tone === "green") return "#10b981";
  if (client.health_tone === "amber") return "#f59e0b";
  return "#ef4444";
}

function ToggleField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px", background: "#fff", fontSize: 12, color: "#334155" }}>
      <span>{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} style={{ width: 18, height: 18, accentColor: "#279491" }} />
    </label>
  );
}

function StatusMessage({ state }: { state: SaveState }) {
  if (!state.message) return null;
  return (
    <div style={{ border: `1px solid ${state.type === "error" ? "#fecaca" : state.type === "success" ? "#bbf7d0" : "#dbe4ef"}`, background: state.type === "error" ? "#fef2f2" : state.type === "success" ? "#ecfdf5" : "#f8fafc", color: statusColor(state.type), borderRadius: 12, padding: "10px 12px", fontSize: 12, marginBottom: 12 }}>
      {state.message}
    </div>
  );
}

function MetricCard({ label, value, helper, tone }: { label: string; value: ReactNode; helper: string; tone?: string }) {
  return (
    <div style={cardStyle({ padding: 16 })}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: tone ?? "#1F487C", lineHeight: 1 }}>{value}</div>
          <div style={{ marginTop: 7, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{label}</div>
          <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>{helper}</div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 0,
        borderBottom: active ? "3px solid #4f46e5" : "3px solid transparent",
        background: active ? "#f8fafc" : "transparent",
        color: active ? "#4f46e5" : "#475569",
        fontWeight: 800,
        fontSize: 12,
        padding: "14px 12px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 7,
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

export function SmcClientsClient({ clients }: { clients: SmcClientOrg[] }) {
  const [clientRows, setClientRows] = useState(clients);
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [operationState, setOperationState] = useState<SaveState>({ type: "idle", message: "" });
  const [moduleState, setModuleState] = useState<SaveState>({ type: "idle", message: "" });
  const [guruApiState, setGuruApiState] = useState<SaveState>({ type: "idle", message: "" });

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
      body: JSON.stringify({ organization_id: selected.id, organizationId: selected.id, client_org_id: selected.id, ...payload }),
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
      body: JSON.stringify({ organization_id: selected.id, organizationId: selected.id, client_org_id: selected.id, ...payload }),
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
    const selectedOrgId = selected.id;
    setModuleState({ type: "saving", moduleKey, message: `${enabled ? "Enabling" : "Disabling"} ${moduleName(moduleKey)}...` });

    const response = await fetch("/api/smc/client-module-grants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id: selectedOrgId, organizationId: selectedOrgId, client_org_id: selectedOrgId, module_key: moduleKey, moduleKey, enabled }),
    });

    const json = (await response.json().catch(() => ({}))) as ModuleGrantResponse;
    if (!response.ok || json.error || !json.grant) {
      setModuleState({ type: "error", moduleKey, message: json.error ?? "Unable to update module access. Refresh Client Orgs and try again." });
      return;
    }

    setClientRows((rows) => rows.map((client) => {
      if (client.id !== selectedOrgId) return client;
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
    setActiveTab("lifecycle");
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

  function selectClient(clientId: string) {
    setSelectedId(clientId);
    setActiveTab("overview");
    resetStates();
  }

  function renderOverview(client: SmcClientOrg) {
    const posture = [
      { label: "Governance", value: client.governance_clear ? "Clear" : "Pending", ok: client.governance_clear },
      { label: "Guru", value: client.guru_enabled ? "Enabled" : "Not configured", ok: client.guru_enabled },
      { label: "API Access", value: activeKeyCount(client) > 0 || client.api_rate_limit_value ? "Governed" : "Not governed", ok: activeKeyCount(client) > 0 || Boolean(client.api_rate_limit_value) },
      { label: "Module Access", value: `${client.module_keys.length}/${MODULE_DEFINITIONS.length} enabled`, ok: client.module_keys.length > 0 },
      { label: "Products", value: client.products_count > 0 ? `${client.products_count} loaded` : "Not loaded", ok: client.products_count > 0 },
      { label: "Recent Leads", value: client.recent_leads_count > 0 ? `${client.recent_leads_count} recent` : "No recent leads", ok: client.recent_leads_count > 0 },
    ];

    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div style={cardStyle({ padding: 18, gridColumn: "span 1" })}>
            <h4 style={{ margin: 0, fontSize: 13 }}>Health & Status</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 18 }}>
              <div style={{ width: 108, height: 108, borderRadius: 999, border: `10px solid ${healthColor(client)}`, display: "grid", placeItems: "center", color: "#0f172a", fontWeight: 900, fontSize: 28 }}>{client.health_score}</div>
              <div style={{ flex: 1, display: "grid", gap: 8 }}>
                {["stage", "plan", "billing", "seats"].map((item) => (
                  <div key={item} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 7 }}>
                    <span style={{ color: "#64748b" }}>{titleCase(item)}</span>
                    <strong>{item === "stage" ? stageLabel(client.stage) : item === "plan" ? titleCase(client.plan) : item === "billing" ? titleCase(client.billing_status) : client.seats ?? "-"}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={cardStyle({ padding: 18 })}>
            <h4 style={{ margin: 0, fontSize: 13 }}>Operational Posture</h4>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {posture.map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12 }}>
                  <span style={{ color: "#334155" }}>{item.ok ? "✓" : "△"} {item.label}</span>
                  <strong style={{ color: item.ok ? "#10b981" : "#ef4444" }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={cardStyle({ padding: 18 })}>
            <h4 style={{ margin: 0, fontSize: 13 }}>Quick Actions</h4>
            <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
              <button type="button" className="smc-btn primary" onClick={() => setActiveTab("modules")}>Enable modules</button>
              <button type="button" className="smc-btn" onClick={() => setActiveTab("entitlements")}>Review entitlements</button>
              <button type="button" className="smc-btn" onClick={() => setActiveTab("guru")}>Manage Guru & API</button>
              <button type="button" className="smc-btn" onClick={() => setActiveTab("lifecycle")}>Open lifecycle</button>
              <button type="button" className="smc-btn" onClick={() => setActiveTab("activity")}>View activity</button>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr .7fr", gap: 16 }}>
          <div style={cardStyle({ padding: 18 })}>
            <h4 style={{ margin: 0, fontSize: 13 }}>Recent Activity</h4>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {client.recent_activity.map((item) => <div key={item} style={{ fontSize: 12, color: "#475569", display: "flex", justifyContent: "space-between", gap: 12 }}><span>↺ {item}</span><span style={{ color: "#94a3b8" }}>Now</span></div>)}
            </div>
          </div>
          <div style={cardStyle({ padding: 18, background: "linear-gradient(135deg, #fffbeb, #fff)" })}>
            <h4 style={{ margin: 0, fontSize: 13 }}>Needs Attention <span className="smc-lb" style={{ background: "#fef3c7", color: "#d97706" }}>{client.needs_attention.length}</span></h4>
            <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
              {client.needs_attention.length ? client.needs_attention.map((item) => <div key={item} style={{ border: "1px solid #fde68a", borderRadius: 12, padding: 10, background: "#fff", fontSize: 12, color: "#92400e" }}>△ {item}</div>) : <div style={{ fontSize: 12, color: "#10b981" }}>All core signals look healthy.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderModules(client: SmcClientOrg) {
    return (
      <div style={cardStyle({ padding: 18 })}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14 }}>Module Access</h4>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Enable or disable product modules for this client. Messages stay scoped to module actions.</p>
          </div>
          <span className="smc-lb" style={{ background: "#e6f5f4", color: "#279491" }}>{client.module_keys.length}/{MODULE_DEFINITIONS.length} enabled</span>
        </div>
        <div style={{ marginTop: 14 }}><StatusMessage state={moduleState} /></div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {MODULE_DEFINITIONS.map((moduleDef) => {
            const enabled = isModuleEnabled(client, moduleDef.key);
            const saving = moduleState.type === "saving" && moduleState.moduleKey === moduleDef.key;
            return (
              <div key={moduleDef.key} style={{ border: `1px solid ${enabled ? "#99f6e4" : "#e2e8f0"}`, borderRadius: 14, padding: 14, background: enabled ? "#f0fdfa" : "#fff", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong style={{ fontSize: 13, color: "#0f172a" }}>{moduleDef.title}</strong>
                    <span className="smc-lb" style={{ background: enabled ? "#ecfdf5" : "#f1f5f9", color: enabled ? "#10b981" : "#64748b", fontSize: 9 }}>{enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <p style={{ margin: "5px 0 0", fontSize: 11, color: "#64748b" }}>{moduleDef.subtitle}</p>
                </div>
                <button type="button" className={enabled ? "smc-btn" : "smc-btn primary"} disabled={saving} onClick={() => setModuleGrant(moduleDef.key, !enabled)} style={{ minWidth: 140 }}>
                  {saving ? "Saving..." : enabled ? "Disable" : "Enable"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderEntitlements(client: SmcClientOrg) {
    return (
      <form key={`${client.id}-${client.billing_status}-${client.plan}-${client.seats}`} onSubmit={saveControls} style={cardStyle({ padding: 18 })}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14 }}>Entitlements</h4>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Plan, billing, usage limits, and client access permissions.</p>
          </div>
          <button type="submit" className="smc-btn primary" disabled={operationState.type === "saving"}>{operationState.type === "saving" ? "Saving..." : "Save entitlements"}</button>
        </div>
        <StatusMessage state={operationState} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 11, color: "#475569" }}>Plan<br />
            <select name="plan_key" defaultValue={PLAN_OPTIONS.includes(client.plan ?? "") ? client.plan ?? "enterprise" : "enterprise"} style={fieldStyle()}>{PLAN_OPTIONS.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select>
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Billing<br />
            <select name="billing_status" defaultValue={client.billing_status} style={fieldStyle()}>{BILLING_OPTIONS.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select>
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Stage<br />
            <select name="onboarding_stage" defaultValue={client.onboarding_stage} style={fieldStyle()}>{STAGE_OPTIONS.map((option) => <option key={option} value={option}>{stageLabel(option)}</option>)}</select>
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Seats<br />
            <input name="seat_limit" type="number" min={1} defaultValue={client.seats ?? 25} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Trial ends<br />
            <input name="trial_ends_at" type="date" defaultValue={safeDate(client.trial_ends_at)} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Renews<br />
            <input name="renews_at" type="date" defaultValue={safeDate(client.renews_at)} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Max users<br />
            <input name="max_users" type="number" min={0} defaultValue={client.max_users || client.seats || 25} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Max leads<br />
            <input name="max_leads" type="number" min={0} defaultValue={client.max_leads} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Max quotes<br />
            <input name="max_quotes" type="number" min={0} defaultValue={client.max_quotes} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Max orders<br />
            <input name="max_orders" type="number" min={0} defaultValue={client.max_orders} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Guru requests<br />
            <input name="guru_monthly_request_limit" type="number" min={0} defaultValue={client.guru_monthly_request_limit ?? 25000} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Guru spend cap<br />
            <input name="guru_monthly_spend_limit" type="number" min={0} step="0.01" defaultValue={client.guru_monthly_spend_limit ?? 2500} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Overage<br />
            <select name="overage_policy" defaultValue={client.overage_policy} style={fieldStyle()}>{OVERAGE_OPTIONS.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select>
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Trial template<br />
            <select name="trial_template_key" defaultValue={client.trial_template_key ?? ""} style={fieldStyle()}>{TRIAL_TEMPLATES.map((option) => <option key={option || "none"} value={option}>{option ? titleCase(option) : "None"}</option>)}</select>
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 16 }}>
          <ToggleField name="allow_exports" label="Exports" defaultChecked={client.allow_exports} />
          <ToggleField name="allow_invites" label="Invites" defaultChecked={client.allow_invites} />
          <ToggleField name="allow_settings_edit" label="Settings edit" defaultChecked={client.allow_settings_edit} />
          <ToggleField name="allow_dispatch" label="Dispatch" defaultChecked={client.allow_dispatch} />
          <ToggleField name="guided_mode_enabled" label="Guided mode" defaultChecked={client.guided_mode_enabled} />
        </div>
        <label style={{ display: "block", marginTop: 14, fontSize: 11, color: "#475569" }}>Internal notes<br />
          <textarea name="internal_notes" defaultValue={client.internal_notes ?? ""} rows={4} style={{ ...fieldStyle(), resize: "vertical" }} />
        </label>
      </form>
    );
  }

  function renderGuru(client: SmcClientOrg) {
    return (
      <form key={`${client.id}-guru-${client.guru_model}-${client.api_rate_limit_value ?? "default"}`} onSubmit={saveGuruApiAccess} style={cardStyle({ padding: 18 })}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14 }}>Guru Credits & API Access</h4>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Runtime settings, credit posture, API keys, and rate limits.</p>
          </div>
          <span className="smc-lb" style={{ background: "#f0fdfa", color: "#0f766e" }}>{activeKeyCount(client)} active keys</span>
        </div>
        <StatusMessage state={guruApiState} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={cardStyle({ padding: 14, boxShadow: "none" })}>
            <span className="cc-label">Monthly requests</span>
            <div className="cc-val" style={{ marginTop: 5 }}>{client.guru_requests_used.toLocaleString()} / {(client.guru_monthly_request_limit ?? 0).toLocaleString()}</div>
            <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, marginTop: 10, overflow: "hidden" }}><div style={{ width: ratio(client.guru_requests_used, client.guru_monthly_request_limit), height: "100%", background: "#279491" }} /></div>
          </div>
          <div style={cardStyle({ padding: 14, boxShadow: "none" })}>
            <span className="cc-label">Monthly spend</span>
            <div className="cc-val" style={{ marginTop: 5 }}>{money(client.guru_spend_used)} / {money(client.guru_monthly_spend_limit)}</div>
            <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, marginTop: 10, overflow: "hidden" }}><div style={{ width: ratio(client.guru_spend_used, client.guru_monthly_spend_limit), height: "100%", background: "#279491" }} /></div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
          <label style={{ fontSize: 11, color: "#475569" }}>Guru model<br />
            <select name="guru_model" defaultValue={client.guru_model} style={fieldStyle()}>{GURU_MODEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Daily search budget<br />
            <input name="guru_daily_search_budget" type="number" min={0} defaultValue={client.guru_daily_search_budget} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>API requests<br />
            <input name="api_rate_limit_value" type="number" min={0} defaultValue={client.api_rate_limit_value ?? 1000} style={fieldStyle()} />
          </label>
          <label style={{ fontSize: 11, color: "#475569" }}>Window ms<br />
            <input name="api_rate_limit_window_ms" type="number" min={1000} defaultValue={client.api_rate_limit_window_ms ?? 86400000} style={fieldStyle()} />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14 }}>
          <ToggleField name="guru_live_search_enabled" label="Live search" defaultChecked={client.guru_live_search_enabled} />
          <ToggleField name="guru_writeback_enabled" label="Writeback" defaultChecked={client.guru_writeback_enabled} />
          <ToggleField name="guru_require_admin_approval" label="Admin approval" defaultChecked={client.guru_require_admin_approval} />
          <ToggleField name="guru_ai_analytics_enabled" label="AI analytics" defaultChecked={client.guru_ai_analytics_enabled} />
        </div>
        <label style={{ display: "block", marginTop: 14, fontSize: 11, color: "#475569" }}>Rate-limit reason<br />
          <textarea name="api_rate_limit_reason" defaultValue={client.api_rate_limit_reason ?? "SMC client API access policy"} rows={3} style={{ ...fieldStyle(), resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="submit" className="smc-btn primary" disabled={guruApiState.type === "saving"}>{guruApiState.type === "saving" && !guruApiState.apiKeyId ? "Saving..." : "Save Guru/API access"}</button>
        </div>
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 18, paddingTop: 16 }}>
          <h5 style={{ margin: "0 0 10px", fontSize: 13 }}>API keys</h5>
          {client.api_keys.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>No API keys have been created for this client yet.</p>}
          <div style={{ display: "grid", gap: 8 }}>
            {client.api_keys.map((apiKey) => {
              const isSaving = guruApiState.type === "saving" && guruApiState.apiKeyId === apiKey.id;
              return (
                <div key={apiKey.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: apiKey.is_active ? "#fff" : "#f8fafc", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 12, color: "#0f172a" }}>{apiKey.name}</strong>
                    <span style={{ display: "block", marginTop: 2, fontSize: 10, color: "#64748b" }}>{apiKey.key_prefix} - {apiKey.scopes.length} scopes - Last used {safeDate(apiKey.last_used_at) || "never"}</span>
                  </div>
                  {apiKey.is_active ? <button type="button" className="smc-btn" disabled={isSaving} onClick={() => revokeApiKey(apiKey.id)}>{isSaving ? "Revoking..." : "Revoke key"}</button> : <span className="smc-lb">Revoked</span>}
                </div>
              );
            })}
          </div>
        </div>
      </form>
    );
  }

  function renderLifecycle(client: SmcClientOrg) {
    const stages = ["Intake", "Provision", "Guided Trial", "Invite", "Entitlements", "Live"];
    return (
      <div style={cardStyle({ padding: 18 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14 }}>Lifecycle</h4>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>A dedicated home for S28-FEAT-011 trial lifecycle and paid conversion workflow.</p>
          </div>
          {client.billing_status === "trial" ? <button type="button" className="smc-btn primary" onClick={convertTrialToPaid} disabled={operationState.type === "saving"}>Convert to paid</button> : <span className="smc-lb" style={{ background: "#ecfdf5", color: "#10b981" }}>Paid/active</span>}
        </div>
        <div style={{ marginTop: 14 }}><StatusMessage state={operationState} /></div>
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {stages.map((stage) => <span key={stage} className="smc-lb" style={{ background: stage === stageLabel(client.stage) ? "#e6f5f4" : "#f1f5f9", color: stage === stageLabel(client.stage) ? "#279491" : "#64748b", padding: "7px 10px" }}>{stage}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 18 }}>
          <div style={cardStyle({ padding: 14, boxShadow: "none" })}><span className="cc-label">Current stage</span><br /><strong>{stageLabel(client.stage)}</strong></div>
          <div style={cardStyle({ padding: 14, boxShadow: "none" })}><span className="cc-label">Billing</span><br /><strong>{titleCase(client.billing_status)}</strong></div>
          <div style={cardStyle({ padding: 14, boxShadow: "none" })}><span className="cc-label">Trial ends</span><br /><strong>{safeDate(client.trial_ends_at) || "-"}</strong></div>
          <div style={cardStyle({ padding: 14, boxShadow: "none" })}><span className="cc-label">Renews</span><br /><strong>{safeDate(client.renews_at) || "-"}</strong></div>
        </div>
        <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
          Full trade-show trial lifecycle fields and conversion notes will be added here in S28-FEAT-011 without crowding module, entitlement, or Guru/API controls.
        </div>
      </div>
    );
  }

  function renderActivity(client: SmcClientOrg) {
    return (
      <div style={cardStyle({ padding: 18 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14 }}>Activity & Audit</h4>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>A dedicated home for S28-FEAT-012 client operation audit history.</p>
          </div>
          <span className="smc-lb" style={{ background: "#f1f5f9", color: "#475569" }}>Preview</span>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {client.recent_activity.map((item, index) => (
            <div key={`${item}-${index}`} style={{ display: "grid", gridTemplateColumns: "88px 1fr auto", gap: 12, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, fontSize: 12, alignItems: "center" }}>
              <span style={{ color: "#94a3b8" }}>{index === 0 ? "Today" : "Recent"}</span>
              <span style={{ color: "#334155" }}>{item}</span>
              <span className="smc-lb" style={{ background: "#e6f5f4", color: "#279491" }}>System</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
          Live audit-log timeline, actor filters, and operation history will be wired here in S28-FEAT-012.
        </div>
      </div>
    );
  }

  function renderActiveTab(client: SmcClientOrg) {
    if (client.internal) return renderOverview(client);
    if (activeTab === "modules") return renderModules(client);
    if (activeTab === "entitlements") return renderEntitlements(client);
    if (activeTab === "guru") return renderGuru(client);
    if (activeTab === "lifecycle") return renderLifecycle(client);
    if (activeTab === "activity") return renderActivity(client);
    return renderOverview(client);
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

      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 18, padding: "0 24px 24px", overflow: "auto" }}>
        <section style={cardStyle({ padding: 14, alignSelf: "start" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>All Client Organizations</h3>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>Select a client to manage operations.</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {clientRows.map((client) => (
              <button
                type="button"
                key={client.id}
                onClick={() => selectClient(client.id)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  border: selected?.id === client.id ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                  background: selected?.id === client.id ? "linear-gradient(135deg, #f8f7ff, #fff)" : "#fff",
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: selected?.id === client.id ? "0 12px 28px rgba(79, 70, 229, .12)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>{client.name} <span className="smc-lb" style={{ background: client.internal ? "#e6f5f4" : client.billing_status === "trial" ? "#fef3c7" : "#ecfdf5", color: client.internal ? "#279491" : client.billing_status === "trial" ? "#d97706" : "#10b981", fontSize: 9 }}>{statusLabel(client)}</span></h3>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>{stageLabel(client.stage)} · {titleCase(client.plan)} Plan</p>
                  </div>
                  <div style={{ width: 46, height: 46, borderRadius: 999, border: `4px solid ${healthColor(client)}`, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 900, color: healthColor(client) }}>{client.health_score}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, fontSize: 11, color: "#475569" }}>
                  <span>Modules <strong>{client.module_keys.length}/{MODULE_DEFINITIONS.length}</strong></span>
                  <span>API Keys <strong>{activeKeyCount(client)}</strong></span>
                  <span>Seats <strong>{client.seats ?? "-"}</strong></span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {selected && (
          <section style={cardStyle({ overflow: "hidden", minHeight: 620 })}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>{selected.name} <span className="smc-lb" style={{ background: selected.internal ? "#e6f5f4" : selected.billing_status === "trial" ? "#fef3c7" : "#ecfdf5", color: selected.internal ? "#279491" : selected.billing_status === "trial" ? "#d97706" : "#10b981" }}>{statusLabel(selected)}</span></h2>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>{selected.id}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`smc-lb ${healthClass(selected.health_score)}`} style={{ fontSize: 11 }}>{selected.health_score}/100</span>
                <span className="smc-lb" style={{ background: "#f1f5f9", color: "#475569" }}>{selected.module_keys.length}/{MODULE_DEFINITIONS.length} modules</span>
                <span className="smc-lb" style={{ background: "#f0fdfa", color: "#0f766e" }}>{activeKeyCount(selected)} API keys</span>
              </div>
            </div>
            <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid #e2e8f0", padding: "0 12px" }}>
              {TABS.map((tab) => (
                <TabButton key={tab.key} active={activeTab === tab.key} label={tab.label} icon={tab.icon} onClick={() => {
                  setActiveTab(tab.key);
                  resetStates();
                }} />
              ))}
            </div>
            <div style={{ padding: 20, background: "#f8fafc", minHeight: 520 }}>
              {renderActiveTab(selected)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
