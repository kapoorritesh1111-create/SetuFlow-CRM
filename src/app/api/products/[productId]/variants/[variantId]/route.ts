import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace/auth";
import { hasWorkspaceCapability } from "@/lib/workspace/permissions";

function textOrNull(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function numberOrNull(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string; variantId: string } },
) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return NextResponse.json({ error: "Workspace membership needed." }, { status: 401 });
  }
  if (!hasWorkspaceCapability(workspace.currentRoles, "catalog.manage")) {
    return NextResponse.json({ error: "Catalog manager access required." }, { status: 403 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return NextResponse.json({ error: "Service role is required for variant updates." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const variantName = textOrNull(body.variant_name);
  if (variantName !== undefined) patch.name = variantName;
  const skuCode = textOrNull(body.sku_code);
  if (skuCode !== undefined) patch.sku_code = skuCode;
  const packLabel = textOrNull(body.pack_label);
  if (packLabel !== undefined) patch.pack_label = packLabel;

  const unitsPerCase = numberOrNull(body.units_per_case);
  if (unitsPerCase !== undefined) patch.units_per_case = unitsPerCase;
  const moqCases = numberOrNull(body.moq_cases);
  if (moqCases !== undefined) patch.moq_cases = moqCases;
  const moqKg = numberOrNull(body.moq_kg);
  if (moqKg !== undefined) patch.moq_kg = moqKg;

  if (["unit", "case", "kg"].includes(body.pricing_mode_default)) {
    patch.pricing_mode_default = body.pricing_mode_default;
  }
  if (typeof body.is_quoteable === "boolean") {
    patch.is_quoteable = body.is_quoteable;
  }

  const result = await admin
    .from("product_variants")
    .update(patch)
    .eq("organization_id", workspace.organization.id)
    .eq("product_id", params.productId)
    .eq("id", params.variantId)
    .select("id,sku_code,name,pack_label,units_per_case,moq_cases,moq_kg,pricing_mode_default,is_quoteable")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json({ variant: result.data });
}
