import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MODULE_DEFINITIONS } from "@/lib/modules/module-grants";
import { SmcClientsClient, type SmcClientOrg } from "./client-view";
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = "force-dynamic";

const SETU_ORG = INTERNAL_ORG_ID;
const SENSITIVE_KEY_RE = /(token|secret|password|key|api[_-]?key|credential|authorization|bearer|jwt)/i;

type AnyRow = Record<string, any>;

function isRecent(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= 30 * 864e5;
}

function countRows(rows: AnyRow[], orgId: string) {
  return rows.filter((row) => row.organization_id === orgId).length;
}

function rowsFor(rows: AnyRow[], orgId: string) {
  return rows.filter((row) => row.organization_id === orgId);
}

function stageFrom(status: string | null | undefined) {
  const value = (status ?? "intake").toLowerCase();
  if (value.includes("live") || value.includes("active") || value.includes("converted")) return "live";
  if (value.includes("guided") || value.includes("trial")) return "guided_trial";
  if (value.includes("entitlement")) return "entitlements";
  if (value.includes("invite")) return "invite";
  if (value.includes("provision") || value.includes("setup")) return "provision";
  if (value.includes("paused")) return "paused";
  return "intake";
}

function apiPrefix(orgId: string) {
  return `api:org:${orgId}`;
}

function latestUsage(rows: AnyRow[], orgId: string) {
  return rowsFor(rows, orgId).sort((a, b) => String(b.period_month ?? "").localeCompare(String(a.period_month ?? "")))[0] ?? null;
}

function trialLeadsFor(rows: AnyRow[], orgId: string) {
  return rows.filter((row) => row.organization_id === orgId || row.trial_org_id === orgId);
}

function cleanValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length ? `${value.length} items` : "empty";
  if (typeof value === "object") return "object";
  return String(value).slice(0, 80);
}

function summarizeDelta(payload: AnyRow | null | undefined) {
  const before = payload?.before && typeof payload.before === "object" ? payload.before : {};
  const after = payload?.after && typeof payload.after === "object" ? payload.after : {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => !SENSITIVE_KEY_RE.test(key))
    .slice(0, 4);
  if (!keys.length) return "No before/after summary captured";
  return keys.map((key) => `${key}: ${cleanValue(before[key])} → ${cleanValue(after[key])}`).join("; ");
}

function auditRowsFor(rows: AnyRow[], orgId: string) {
  return rows.filter((row) => {
    const payload = row.payload ?? {};
    return row.entity_id === orgId || payload.client_org_id === orgId || payload.related_client_org_id === orgId || payload.organization_id === orgId;
  });
}

function formatAuditLine(row: AnyRow) {
  const payload = row.payload ?? {};
  const when = row.created_at ? new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Unknown time";
  const actor = row.actor_user_id ? `Actor ${String(row.actor_user_id).slice(0, 8)}` : "System actor";
  const action = String(row.action ?? "audit_event").replace(/[_-]+/g, " ");
  const entity = `${row.entity_type ?? "entity"}:${String(row.entity_id ?? payload.client_org_id ?? "-").slice(0, 8)}`;
  const related = payload.client_org_id ? `client:${String(payload.client_org_id).slice(0, 8)}` : entity;
  return `${when} · ${actor} · ${action} · ${entity} · ${related} · ${summarizeDelta(payload)}`;
}

function buildClient(org: AnyRow, data: Record<string, AnyRow[]>): SmcClientOrg {
  const onb = data.onboarding.find((row) => row.linked_organization_id === org.id) ?? null;
  const entitlement = data.entitlements.find((row) => row.organization_id === org.id) ?? null;
  const guru = data.guru.find((row) => row.organization_id === org.id) ?? null;
  const usage = latestUsage(data.usage, org.id);
  const apiKeys = rowsFor(data.apiKeys, org.id);
  const activeApiKeys = apiKeys.filter((row) => row.is_active !== false && !row.revoked_at);
  const apiRateLimit = data.rateLimits.find((row) => row.organization_id === org.id && row.key_prefix === apiPrefix(org.id)) ?? null;
  const orgModuleRows = rowsFor(data.grants, org.id);
  const orgModules = orgModuleRows.filter((row) => row.enabled !== false);
  const moduleGrants = MODULE_DEFINITIONS.map((moduleDef) => {
    const grant = orgModuleRows.find((row) => row.module_key === moduleDef.key);
    return { module_key: moduleDef.key, enabled: Boolean(grant?.enabled) };
  });
  const orgProducts = rowsFor(data.products, org.id).filter((row) => row.is_active !== false);
  const orgLeads = rowsFor(data.leads, org.id);
  const trialLeads = trialLeadsFor(data.leads, org.id);
  const primaryTrialLead = trialLeads[0] ?? null;
  const orgQuotes = rowsFor(data.quotes, org.id);
  const recentLeads = orgLeads.filter((row) => isRecent(row.created_at));
  const recentQuotes = orgQuotes.filter((row) => isRecent(row.created_at));
  const auditTimeline = auditRowsFor(data.auditLogs, org.id)
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 12)
    .map(formatAuditLine);

  const profileComplete = Boolean(org.legal_name || org.contact_email || org.website || onb?.website || onb?.primary_admin_email || primaryTrialLead?.email);
  const productsLoaded = orgProducts.length > 0;
  const marketsConfigured = Boolean(org.default_market_id || org.default_country_id || org.headquarters_country || (onb?.requested_markets?.length ?? 0) > 0 || (onb?.requested_countries?.length ?? 0) > 0 || primaryTrialLead?.country);
  const approvalThresholds = org.approval_threshold_pct !== null && org.approval_threshold_pct !== undefined;
  const recentActivity = recentLeads.length > 0 || recentQuotes.length > 0 || auditTimeline.length > 0;
  const guruEnabled = Boolean(guru?.model || guru?.ai_analytics_enabled || entitlement?.guru_monthly_request_limit || moduleGrants.some((grant) => grant.module_key === "setu_guru" && grant.enabled));
  const stage = stageFrom(entitlement?.onboarding_stage ?? onb?.pipeline_stage ?? onb?.status);
  const billingStatus = entitlement?.billing_status ?? (onb?.is_trial_request ? "trial" : "active");
  const plan = entitlement?.plan_key ?? (onb?.requested_plan === "trial" ? "starter" : onb?.requested_plan) ?? null;
  const seats = entitlement?.seat_limit ?? entitlement?.max_users ?? onb?.requested_seat_count ?? null;

  const healthScore = Math.min(100,
    (profileComplete ? 20 : 0) +
    (productsLoaded ? 20 : 0) +
    (marketsConfigured ? 20 : 0) +
    (approvalThresholds ? 15 : 0) +
    (recentActivity ? 15 : 0) +
    (guruEnabled ? 10 : 0),
  );

  const signals = [
    profileComplete ? "Profile complete" : null,
    productsLoaded ? "Products loaded" : null,
    marketsConfigured ? "Markets configured" : null,
    approvalThresholds ? "Approval thresholds set" : null,
    recentActivity ? "Recent activity" : null,
    guruEnabled ? "Guru enabled" : null,
    activeApiKeys.length > 0 || apiRateLimit ? "API access governed" : null,
    billingStatus === "active" ? "Paid/active" : null,
    onb?.wants_trade_events || primaryTrialLead?.trade_show_name ? "Trade-show context" : null,
  ].filter(Boolean) as string[];
  const needsAttention = [
    !profileComplete ? "Profile complete" : null,
    !productsLoaded ? "Products loaded" : null,
    !marketsConfigured ? "Markets configured" : null,
    !approvalThresholds ? "Approval threshold" : null,
    !recentActivity ? "Recent leads" : null,
    !guruEnabled ? "Guru config" : null,
    billingStatus === "trial" ? "Trial conversion" : null,
    moduleGrants.every((grant) => !grant.enabled) ? "Module access" : null,
    !apiRateLimit && activeApiKeys.length > 0 ? "API rate limit" : null,
  ].filter(Boolean) as string[];

  return {
    id: org.id,
    name: org.name ?? "Unnamed org",
    slug: org.slug ?? null,
    created_at: org.created_at ?? null,
    member_count: countRows(data.members, org.id),
    module_keys: orgModules.map((row) => row.module_key).filter(Boolean),
    module_grants: moduleGrants,
    plan,
    seats,
    billing_status: billingStatus,
    onboarding_stage: entitlement?.onboarding_stage ?? stage,
    stage,
    health_score: healthScore,
    health_tone: healthScore >= 75 ? "green" : healthScore >= 45 ? "amber" : "red",
    governance_clear: marketsConfigured && approvalThresholds,
    markets_configured: marketsConfigured,
    security_configured: Boolean(entitlement?.allow_invites !== false && entitlement?.allow_settings_edit !== false),
    products_count: orgProducts.length,
    recent_leads_count: recentLeads.length,
    quotes_count: orgQuotes.length,
    guru_enabled: guruEnabled,
    guru_monthly_request_limit: entitlement?.guru_monthly_request_limit ?? null,
    guru_monthly_spend_limit: entitlement?.guru_monthly_spend_limit ?? null,
    guru_requests_used: Number(usage?.guru_requests_used ?? 0),
    guru_spend_used: Number(usage?.guru_spend_used ?? 0),
    guru_model: guru?.model ?? "gpt-4.1-mini",
    guru_live_search_enabled: guru?.live_search_enabled ?? true,
    guru_writeback_enabled: guru?.writeback_enabled ?? false,
    guru_require_admin_approval: guru?.require_admin_approval ?? true,
    guru_ai_analytics_enabled: guru?.ai_analytics_enabled ?? true,
    guru_daily_search_budget: guru?.daily_search_budget ?? 10,
    api_keys: apiKeys.map((key) => ({
      id: key.id,
      name: key.name ?? "Unnamed key",
      key_prefix: key.key_prefix ? `${String(key.key_prefix).slice(0, 7)}…` : "redacted",
      scopes: key.scopes ?? [],
      last_used_at: key.last_used_at ?? null,
      created_at: key.created_at ?? null,
      revoked_at: key.revoked_at ?? null,
      is_active: key.is_active !== false && !key.revoked_at,
    })),
    api_rate_limit_value: apiRateLimit?.limit_value ?? null,
    api_rate_limit_window_ms: apiRateLimit?.window_ms ?? null,
    api_rate_limit_reason: apiRateLimit?.reason ?? null,
    api_rate_limit_key_prefix: apiRateLimit?.key_prefix ? `${String(apiRateLimit.key_prefix).slice(0, 12)}…` : apiPrefix(org.id),
    overage_policy: entitlement?.overage_policy ?? "warn_then_block",
    trial_ends_at: entitlement?.trial_ends_at ?? null,
    renews_at: entitlement?.renews_at ?? null,
    max_leads: entitlement?.max_leads ?? 0,
    max_quotes: entitlement?.max_quotes ?? 0,
    max_orders: entitlement?.max_orders ?? 0,
    max_users: entitlement?.max_users ?? seats ?? 0,
    allow_exports: entitlement?.allow_exports ?? true,
    allow_invites: entitlement?.allow_invites ?? true,
    allow_settings_edit: entitlement?.allow_settings_edit ?? true,
    allow_dispatch: entitlement?.allow_dispatch ?? true,
    guided_mode_enabled: entitlement?.guided_mode_enabled ?? false,
    trial_template_key: entitlement?.trial_template_key ?? null,
    internal_notes: entitlement?.internal_notes ?? null,
    lifecycle_request_id: onb?.id ?? null,
    lifecycle_status: onb?.status ?? null,
    lifecycle_pipeline_stage: onb?.pipeline_stage ?? null,
    lifecycle_source: onb?.source ?? primaryTrialLead?.source_type ?? null,
    lifecycle_source_detail: onb?.source_detail ?? primaryTrialLead?.source_label ?? null,
    lifecycle_industry: onb?.industry ?? primaryTrialLead?.main_product_category ?? null,
    lifecycle_lead_score: onb?.lead_score ?? null,
    lifecycle_tags: onb?.tags ?? [],
    lifecycle_requested_modules: onb?.requested_modules ?? [],
    lifecycle_requested_plan: onb?.requested_plan ?? null,
    lifecycle_requested_seat_count: onb?.requested_seat_count ?? null,
    lifecycle_wants_trade_events: Boolean(onb?.wants_trade_events ?? primaryTrialLead?.trade_show_name),
    lifecycle_primary_admin_name: onb?.primary_admin_name ?? primaryTrialLead?.contact_name ?? null,
    lifecycle_primary_admin_email: onb?.primary_admin_email ?? primaryTrialLead?.email ?? org.contact_email ?? null,
    lifecycle_primary_phone: onb?.primary_phone ?? primaryTrialLead?.phone ?? null,
    lifecycle_website: onb?.website ?? primaryTrialLead?.website ?? org.website ?? null,
    lifecycle_last_contact_at: onb?.last_contact_at ?? primaryTrialLead?.last_contacted_at ?? null,
    lifecycle_next_follow_up_at: onb?.next_follow_up_at ?? primaryTrialLead?.next_follow_up_at ?? null,
    lifecycle_pricing_notes: onb?.pricing_rules_notes ?? null,
    lifecycle_product_notes: onb?.product_category_notes ?? primaryTrialLead?.products_or_needs ?? null,
    lifecycle_additional_notes: onb?.additional_notes ?? primaryTrialLead?.notes ?? null,
    lifecycle_trade_show_name: primaryTrialLead?.trade_show_name ?? onb?.source_detail ?? null,
    lifecycle_booth_number: primaryTrialLead?.booth_number ?? null,
    lifecycle_main_product_category: primaryTrialLead?.main_product_category ?? onb?.industry ?? null,
    trial_lead_count: trialLeads.length,
    signals,
    needs_attention: needsAttention,
    recent_activity: auditTimeline.length ? auditTimeline : [
      `${orgProducts.length} active products`,
      `${recentLeads.length} recent leads in last 30 days`,
      `${orgQuotes.length} quotes created`,
      `${orgModules.length} modules enabled`,
      `${activeApiKeys.length} active API keys`,
      `${Number(usage?.guru_requests_used ?? 0)} Guru requests used`,
      `${trialLeads.length} trial-linked leads`,
      `Billing status: ${billingStatus}`,
    ],
    internal: org.id === SETU_ORG,
  };
}

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: setuMembership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", SETU_ORG)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !setuMembership) redirect("/dashboard");

  const admin = createServiceRoleClient() as any;
  if (!admin) return [];

  const [orgs, members, grants, onboarding, entitlements, guru, apiKeys, rateLimits, usage, products, leads, quotes, auditLogs] = await Promise.all([
    admin.from("organizations").select("*"),
    admin.from("organization_members").select("organization_id"),
    admin.from("org_module_grants").select("organization_id, module_key, enabled"),
    admin.from("client_onboarding_requests").select("*"),
    admin.from("client_entitlement_profiles").select("*"),
    admin.from("workspace_guru_settings").select("*"),
    admin.from("api_keys").select("id, organization_id, name, key_prefix, scopes, last_used_at, created_at, revoked_at, is_active"),
    admin.from("rate_limit_overrides").select("id, organization_id, key_prefix, limit_value, window_ms, reason, updated_at"),
    admin.from("client_usage_rollups").select("organization_id, period_month, guru_requests_used, guru_spend_used"),
    admin.from("products").select("organization_id, is_active"),
    admin.from("leads").select("organization_id, trial_org_id, created_at, contact_name, email, phone, website, source_type, source_label, trade_show_name, booth_number, main_product_category, products_or_needs, notes, country, last_contacted_at, next_follow_up_at"),
    admin.from("quotes").select("organization_id, created_at"),
    admin.from("audit_logs").select("id, organization_id, actor_user_id, entity_type, entity_id, action, payload, created_at").eq("organization_id", SETU_ORG).order("created_at", { ascending: false }).limit(250),
  ]);

  const data = {
    members: members.data ?? [],
    grants: grants.data ?? [],
    onboarding: onboarding.data ?? [],
    entitlements: entitlements.data ?? [],
    guru: guru.data ?? [],
    apiKeys: apiKeys.data ?? [],
    rateLimits: rateLimits.data ?? [],
    usage: usage.data ?? [],
    products: products.data ?? [],
    leads: leads.data ?? [],
    quotes: quotes.data ?? [],
    auditLogs: auditLogs.data ?? [],
  };

  return ((orgs.data ?? []) as AnyRow[]).map((org) => buildClient(org, data));
}

export default async function SmcClientsPage() {
  const clients = await getData();
  return <SmcClientsClient clients={clients} />;
}
