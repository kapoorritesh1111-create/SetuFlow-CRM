import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SmcClientsClient, type SmcClientOrg } from "./client-view";

export const dynamic = "force-dynamic";

const SETU_ORG = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

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
  if (value.includes("live") || value.includes("active")) return "live";
  if (value.includes("entitlement")) return "entitlements";
  if (value.includes("invite")) return "invite";
  if (value.includes("provision") || value.includes("setup")) return "provision";
  return "intake";
}

function buildClient(org: AnyRow, data: Record<string, AnyRow[]>): SmcClientOrg {
  const onb = data.onboarding.find((row) => row.linked_organization_id === org.id) ?? null;
  const entitlement = data.entitlements.find((row) => row.organization_id === org.id) ?? null;
  const guru = data.guru.find((row) => row.organization_id === org.id) ?? null;
  const orgModules = rowsFor(data.grants, org.id).filter((row) => row.enabled !== false);
  const orgProducts = rowsFor(data.products, org.id).filter((row) => row.is_active !== false);
  const orgLeads = rowsFor(data.leads, org.id);
  const orgQuotes = rowsFor(data.quotes, org.id);
  const recentLeads = orgLeads.filter((row) => isRecent(row.created_at));
  const recentQuotes = orgQuotes.filter((row) => isRecent(row.created_at));

  const profileComplete = Boolean(org.legal_name || org.contact_email || org.website || onb?.website || onb?.primary_admin_email);
  const productsLoaded = orgProducts.length > 0;
  const marketsConfigured = Boolean(org.default_market_id || org.default_country_id || org.headquarters_country || (onb?.requested_markets?.length ?? 0) > 0 || (onb?.requested_countries?.length ?? 0) > 0);
  const approvalThresholds = org.approval_threshold_pct !== null && org.approval_threshold_pct !== undefined;
  const recentActivity = recentLeads.length > 0 || recentQuotes.length > 0;
  const guruEnabled = Boolean(guru?.model || guru?.ai_analytics_enabled || entitlement?.guru_monthly_request_limit);

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
  ].filter(Boolean) as string[];
  const needsAttention = [
    !profileComplete ? "Profile complete" : null,
    !productsLoaded ? "Products loaded" : null,
    !marketsConfigured ? "Markets configured" : null,
    !approvalThresholds ? "Approval threshold" : null,
    !recentActivity ? "Recent leads" : null,
    !guruEnabled ? "Guru config" : null,
  ].filter(Boolean) as string[];

  return {
    id: org.id,
    name: org.name ?? "Unnamed org",
    slug: org.slug ?? null,
    created_at: org.created_at ?? null,
    member_count: countRows(data.members, org.id),
    module_keys: orgModules.map((row) => row.module_key).filter(Boolean),
    plan: entitlement?.plan_key ?? onb?.requested_plan ?? null,
    seats: entitlement?.seat_limit ?? entitlement?.max_users ?? onb?.requested_seat_count ?? null,
    stage: stageFrom(entitlement?.onboarding_stage ?? onb?.pipeline_stage ?? onb?.status),
    health_score: healthScore,
    health_tone: healthScore >= 75 ? "green" : healthScore >= 45 ? "amber" : "red",
    governance_clear: marketsConfigured && approvalThresholds,
    markets_configured: marketsConfigured,
    security_configured: Boolean(entitlement?.allow_invites !== false && entitlement?.allow_settings_edit !== false),
    products_count: orgProducts.length,
    recent_leads_count: recentLeads.length,
    quotes_count: orgQuotes.length,
    guru_enabled: guruEnabled,
    signals,
    needs_attention: needsAttention,
    recent_activity: [
      `${orgProducts.length} active products`,
      `${recentLeads.length} recent leads in last 30 days`,
      `${orgQuotes.length} quotes created`,
      `${orgModules.length} modules enabled`,
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

  const [orgs, members, grants, onboarding, entitlements, guru, products, leads, quotes] = await Promise.all([
    admin.from("organizations").select("*"),
    admin.from("organization_members").select("organization_id"),
    admin.from("org_module_grants").select("organization_id, module_key, enabled"),
    admin.from("client_onboarding_requests").select("*"),
    admin.from("client_entitlement_profiles").select("*"),
    admin.from("workspace_guru_settings").select("*"),
    admin.from("products").select("organization_id, is_active"),
    admin.from("leads").select("organization_id, created_at"),
    admin.from("quotes").select("organization_id, created_at"),
  ]);

  const data = {
    members: members.data ?? [],
    grants: grants.data ?? [],
    onboarding: onboarding.data ?? [],
    entitlements: entitlements.data ?? [],
    guru: guru.data ?? [],
    products: products.data ?? [],
    leads: leads.data ?? [],
    quotes: quotes.data ?? [],
  };

  return ((orgs.data ?? []) as AnyRow[]).map((org) => buildClient(org, data));
}

export default async function SmcClientsPage() {
  const clients = await getData();
  return <SmcClientsClient clients={clients} />;
}
