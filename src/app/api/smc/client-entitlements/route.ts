import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SETU_ORG = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAN_KEYS = new Set(["starter", "growth", "professional", "enterprise", "custom"]);
const BILLING_STATUSES = new Set(["trial", "active", "past_due", "paused", "cancelled"]);
const ONBOARDING_STAGES = new Set(["intake", "provision", "guided_trial", "invite", "entitlements", "live", "paused"]);
const OVERAGE_POLICIES = new Set(["warn_only", "warn_then_block", "allow_overage", "block_at_limit"]);
const TRIAL_TEMPLATES = new Set(["export_foods_basic", "ingredient_trader", "distributor_importer", "packaging_converter"]);

type JsonRecord = Record<string, any>;

function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown, fallback: string, allowed: Set<string>) {
  const text = typeof value === "string" ? value.trim() : "";
  return allowed.has(text) ? text : fallback;
}

function nullableDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function positiveInt(value: unknown, fallback: number, minimum = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, parsed);
}

function numericLimit(value: unknown, fallback: number) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function boolValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

async function requireSetuOperator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, response: errorJson("Login required", 401) };
  }

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", SETU_ORG)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    return { user: null, response: errorJson("SETU Mission Control access required", 403) };
  }

  return { user, response: null };
}

export async function PATCH(request: Request) {
  const { user, response } = await requireSetuOperator();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as JsonRecord | null;
  if (!body) return errorJson("Invalid JSON body");

  const organizationId = typeof body.organization_id === "string" ? body.organization_id.trim() : "";
  if (!UUID_RE.test(organizationId)) return errorJson("Valid organization_id is required");
  if (organizationId === SETU_ORG) return errorJson("Platform organization entitlements cannot be changed from Client Orgs", 403);

  const admin = createServiceRoleClient() as any;
  if (!admin) return errorJson("Service role client is not configured", 500);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError) return errorJson(orgError.message, 500);
  if (!org) return errorJson("Client organization not found", 404);

  const { data: before } = await admin
    .from("client_entitlement_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const planKey = cleanText(body.plan_key, before?.plan_key ?? "enterprise", PLAN_KEYS);
  const billingStatus = cleanText(body.billing_status, before?.billing_status ?? "active", BILLING_STATUSES);
  const onboardingStage = cleanText(body.onboarding_stage, before?.onboarding_stage ?? "live", ONBOARDING_STAGES);
  const overagePolicy = cleanText(body.overage_policy, before?.overage_policy ?? "warn_then_block", OVERAGE_POLICIES);
  const trialTemplateRaw = typeof body.trial_template_key === "string" ? body.trial_template_key.trim() : "";

  const payload = {
    organization_id: organizationId,
    managed_by_organization_id: SETU_ORG,
    plan_key: planKey,
    billing_status: billingStatus,
    onboarding_stage: onboardingStage,
    seat_limit: positiveInt(body.seat_limit, before?.seat_limit ?? 25, 1),
    guru_monthly_request_limit: positiveInt(body.guru_monthly_request_limit, before?.guru_monthly_request_limit ?? 25000, 0),
    guru_monthly_spend_limit: numericLimit(body.guru_monthly_spend_limit, before?.guru_monthly_spend_limit ?? 2500),
    overage_policy: overagePolicy,
    trial_ends_at: nullableDate(body.trial_ends_at),
    renews_at: nullableDate(body.renews_at),
    internal_notes: typeof body.internal_notes === "string" ? body.internal_notes.trim().slice(0, 4000) : before?.internal_notes ?? null,
    max_leads: positiveInt(body.max_leads, before?.max_leads ?? 0, 0),
    max_quotes: positiveInt(body.max_quotes, before?.max_quotes ?? 0, 0),
    max_orders: positiveInt(body.max_orders, before?.max_orders ?? 0, 0),
    max_users: positiveInt(body.max_users, before?.max_users ?? 0, 0),
    allow_exports: boolValue(body.allow_exports, before?.allow_exports ?? true),
    allow_invites: boolValue(body.allow_invites, before?.allow_invites ?? true),
    allow_settings_edit: boolValue(body.allow_settings_edit, before?.allow_settings_edit ?? true),
    allow_dispatch: boolValue(body.allow_dispatch, before?.allow_dispatch ?? true),
    guided_mode_enabled: boolValue(body.guided_mode_enabled, before?.guided_mode_enabled ?? false),
    trial_template_key: trialTemplateRaw && TRIAL_TEMPLATES.has(trialTemplateRaw) ? trialTemplateRaw : null,
    updated_at: new Date().toISOString(),
  };

  const { data: entitlement, error } = await admin
    .from("client_entitlement_profiles")
    .upsert(payload, { onConflict: "organization_id" })
    .select("*")
    .single();

  if (error) return errorJson(error.message, 500);

  const convertedToPaid = before?.billing_status === "trial" && entitlement.billing_status === "active";
  const liveConversion = entitlement.billing_status === "active" && entitlement.onboarding_stage === "live";

  if (liveConversion) {
    await admin
      .from("client_onboarding_requests")
      .update({
        status: "live",
        pipeline_stage: "converted",
        requested_plan: entitlement.plan_key,
        requested_seat_count: entitlement.seat_limit,
        is_trial_request: false,
        updated_at: new Date().toISOString(),
      })
      .eq("linked_organization_id", organizationId);
  }

  await admin.from("audit_logs").insert({
    organization_id: SETU_ORG,
    actor_user_id: user!.id,
    entity_type: "client_org",
    entity_id: organizationId,
    action: convertedToPaid ? "smc_trial_converted_to_paid" : "smc_client_entitlement_updated",
    payload: {
      client_org_id: organizationId,
      client_org_name: org.name,
      before: before
        ? {
            plan_key: before.plan_key,
            billing_status: before.billing_status,
            onboarding_stage: before.onboarding_stage,
            seat_limit: before.seat_limit,
            max_users: before.max_users,
          }
        : null,
      after: {
        plan_key: entitlement.plan_key,
        billing_status: entitlement.billing_status,
        onboarding_stage: entitlement.onboarding_stage,
        seat_limit: entitlement.seat_limit,
        max_users: entitlement.max_users,
      },
      source: "smc_client_orgs",
    },
  });

  return NextResponse.json({ entitlement, converted_to_paid: convertedToPaid, onboarding_marked_live: liveConversion });
}
