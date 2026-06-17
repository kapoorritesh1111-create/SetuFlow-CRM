import { NextResponse } from "next/server";
import { MODULE_KEYS, normalizeModuleKey } from "@/lib/modules/module-grants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SETU_ORG = "3327b9a7-aadb-44b0-9793-30c4045d3c92";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

type JsonRecord = Record<string, any>;

function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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
  if (organizationId === SETU_ORG) return errorJson("Platform organization module grants cannot be changed from Client Orgs", 403);

  const moduleKey = normalizeModuleKey(body.module_key);
  if (!moduleKey) return errorJson(`Valid module_key is required. Allowed: ${MODULE_KEYS.join(", ")}`);

  const enabled = body.enabled === true;
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
    .from("org_module_grants")
    .select("id, organization_id, module_key, enabled, granted_at, granted_by, updated_at")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();

  const payload = {
    organization_id: organizationId,
    module_key: moduleKey,
    enabled,
    granted_by: user!.id,
    granted_at: before?.granted_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: grant, error } = await admin
    .from("org_module_grants")
    .upsert(payload, { onConflict: "organization_id,module_key" })
    .select("id, organization_id, module_key, enabled, granted_at, granted_by, updated_at")
    .single();

  if (error) return errorJson(error.message, 500);

  await admin.from("audit_logs").insert({
    organization_id: SETU_ORG,
    actor_user_id: user!.id,
    entity_type: "client_org_module_grant",
    entity_id: organizationId,
    action: enabled ? "smc_client_module_enabled" : "smc_client_module_disabled",
    payload: {
      client_org_id: organizationId,
      client_org_name: org.name,
      module_key: moduleKey,
      before: before ? { enabled: before.enabled, updated_at: before.updated_at } : null,
      after: { enabled: grant.enabled, updated_at: grant.updated_at },
      source: "smc_client_orgs",
    },
  });

  return NextResponse.json({ grant });
}
