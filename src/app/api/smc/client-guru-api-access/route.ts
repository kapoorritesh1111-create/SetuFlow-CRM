import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = "force-dynamic";

const SETU_ORG = INTERNAL_ORG_ID;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GURU_MODELS = new Set(["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"]);

type JsonRecord = Record<string, any>;

function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown, fallback: string, allowed: Set<string>) {
  const text = typeof value === "string" ? value.trim() : "";
  return allowed.has(text) ? text : fallback;
}

function boolValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function intLimit(value: unknown, fallback: number, minimum = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, parsed);
}

function apiPrefix(organizationId: string) {
  return `api:org:${organizationId}`;
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
  if (organizationId === SETU_ORG) return errorJson("Platform organization Guru/API access cannot be changed from Client Orgs", 403);

  const admin = createServiceRoleClient() as any;
  if (!admin) return errorJson("Service role client is not configured", 500);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError) return errorJson(orgError.message, 500);
  if (!org) return errorJson("Client organization not found", 404);

  const { data: beforeGuru } = await admin
    .from("workspace_guru_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const guruPayload = {
    organization_id: organizationId,
    model: cleanText(body.model, beforeGuru?.model ?? "gpt-4.1-mini", GURU_MODELS),
    live_search_enabled: boolValue(body.live_search_enabled, beforeGuru?.live_search_enabled ?? true),
    writeback_enabled: boolValue(body.writeback_enabled, beforeGuru?.writeback_enabled ?? false),
    require_admin_approval: boolValue(body.require_admin_approval, beforeGuru?.require_admin_approval ?? true),
    ai_analytics_enabled: boolValue(body.ai_analytics_enabled, beforeGuru?.ai_analytics_enabled ?? true),
    daily_search_budget: intLimit(body.daily_search_budget, beforeGuru?.daily_search_budget ?? 10, 0),
    updated_by: user!.id,
    updated_at: new Date().toISOString(),
  };

  const { data: guruSettings, error: guruError } = await admin
    .from("workspace_guru_settings")
    .upsert(guruPayload, { onConflict: "organization_id" })
    .select("*")
    .single();

  if (guruError) return errorJson(guruError.message, 500);

  const keyPrefix = apiPrefix(organizationId);
  const { data: beforeRate } = await admin
    .from("rate_limit_overrides")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("key_prefix", keyPrefix)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rateLimitValue = intLimit(body.api_rate_limit_value, beforeRate?.limit_value ?? 1000, 0);
  const rateLimitWindowMs = intLimit(body.api_rate_limit_window_ms, beforeRate?.window_ms ?? 86_400_000, 1000);
  const rateLimitReason = typeof body.api_rate_limit_reason === "string" ? body.api_rate_limit_reason.trim().slice(0, 1000) : beforeRate?.reason ?? "SMC client API access policy";

  let apiRateLimit = beforeRate;
  let rateError = null;
  if (beforeRate?.id) {
    const result = await admin
      .from("rate_limit_overrides")
      .update({
        limit_value: rateLimitValue,
        window_ms: rateLimitWindowMs,
        overridden_by: user!.id,
        reason: rateLimitReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", beforeRate.id)
      .select("*")
      .single();
    apiRateLimit = result.data;
    rateError = result.error;
  } else {
    const result = await admin
      .from("rate_limit_overrides")
      .insert({
        organization_id: organizationId,
        key_prefix: keyPrefix,
        limit_value: rateLimitValue,
        window_ms: rateLimitWindowMs,
        overridden_by: user!.id,
        reason: rateLimitReason,
      })
      .select("*")
      .single();
    apiRateLimit = result.data;
    rateError = result.error;
  }

  if (rateError) return errorJson(rateError.message, 500);

  if (!beforeRate || beforeRate.limit_value !== apiRateLimit.limit_value) {
    await admin.from("rate_limit_override_audit").insert({
      organization_id: organizationId,
      key_prefix: keyPrefix,
      old_value: beforeRate?.limit_value ?? null,
      new_value: apiRateLimit.limit_value,
      changed_by: user!.id,
      reason: rateLimitReason,
    });
  }

  let revokedApiKeyId: string | null = null;
  const revokeApiKeyId = typeof body.revoke_api_key_id === "string" ? body.revoke_api_key_id.trim() : "";
  if (revokeApiKeyId) {
    if (!UUID_RE.test(revokeApiKeyId)) return errorJson("Valid revoke_api_key_id is required");
    const { data: revoked, error: revokeError } = await admin
      .from("api_keys")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", revokeApiKeyId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (revokeError) return errorJson(revokeError.message, 500);
    if (!revoked) return errorJson("API key not found for this client organization", 404);
    revokedApiKeyId = revoked.id;
  }

  const { data: apiKeys } = await admin
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, created_at, revoked_at, is_active")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  await admin.from("audit_logs").insert({
    organization_id: SETU_ORG,
    actor_user_id: user!.id,
    entity_type: "client_org",
    entity_id: organizationId,
    action: revokedApiKeyId ? "smc_client_api_key_revoked" : "smc_client_guru_api_access_updated",
    payload: {
      client_org_id: organizationId,
      client_org_name: org.name,
      before: beforeGuru
        ? {
            model: beforeGuru.model,
            live_search_enabled: beforeGuru.live_search_enabled,
            writeback_enabled: beforeGuru.writeback_enabled,
            daily_search_budget: beforeGuru.daily_search_budget,
          }
        : null,
      after: {
        model: guruSettings.model,
        live_search_enabled: guruSettings.live_search_enabled,
        writeback_enabled: guruSettings.writeback_enabled,
        daily_search_budget: guruSettings.daily_search_budget,
        api_rate_limit_value: apiRateLimit.limit_value,
        api_rate_limit_window_ms: apiRateLimit.window_ms,
        revoked_api_key_id: revokedApiKeyId,
      },
      source: "smc_client_orgs",
    },
  });

  return NextResponse.json({
    guru_settings: guruSettings,
    api_rate_limit: apiRateLimit,
    api_keys: apiKeys ?? [],
    revoked_api_key_id: revokedApiKeyId,
  });
}
