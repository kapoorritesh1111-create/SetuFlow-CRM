'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { hasWorkspaceRole } from '@/lib/workspace/auth';
import { calculatePackagingPrice, buildPackagingSpecSummary } from '@/lib/packaging/pricing-engine';
import { getPackagingTemplateById, getQuoteOptionalCharges } from '@/lib/packaging/queries';
import { getPackagingQuoteReadiness, explainPackagingPrice, suggestOptionalCharges, draftPackagingFollowUp } from '@/lib/setu-guru/packaging-guidance';
import type {
  PackagingCalculationInput,
  PackagingCalculationResult,
  PackagingPricingTemplate,
  ProductionStage,
  QuoteOptionalChargeType,
} from '@/lib/packaging/types';
import { PRODUCTION_STAGES } from '@/lib/packaging/types';
import type { PackagingGuidance } from '@/lib/setu-guru/packaging-guidance';

/**
 * S24-SPEN-203 / 204 / 205 / 208 / 211 — Packaging server actions.
 *
 * calculatePackagingQuoteLine is the single calculation entry point used by
 * BOTH the Quote Builder configurator and the admin Pricing Template Builder
 * live preview, so their numbers can never diverge.
 *
 * Growth Agent output here is advisory-only: readiness, warnings, price
 * explanation, charge suggestions, and a follow-up draft. Nothing is applied
 * without an explicit user action.
 */

type ActionContext = {
  workspace: Awaited<ReturnType<typeof requireWorkspace>>;
  supabase: any;
  organizationId: string;
  userId: string;
  currentRoles: string[];
};

async function getContext(): Promise<ActionContext> {
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) throw new Error('Not authenticated.');
  const supabase: any = await createClient();
  return { workspace, supabase, organizationId: workspace.organization.id, userId: workspace.user.id, currentRoles: workspace.currentRoles ?? [] };
}

export type PackagingCalculationResponse = {
  ok: boolean;
  error?: string;
  result?: PackagingCalculationResult;
  readiness?: PackagingGuidance;
  priceExplanation?: string | null;
  chargeSuggestions?: string[];
};

export async function calculatePackagingQuoteLine(params: {
  templateId: string;
  input: PackagingCalculationInput;
  quoteId?: string | null;
}): Promise<PackagingCalculationResponse> {
  try {
    const { supabase, organizationId } = await getContext();
    const template = await getPackagingTemplateById(organizationId, params.templateId, supabase);
    if (!template) return { ok: false, error: 'Pricing template not found for this workspace.' };

    const result = calculatePackagingPrice(template, params.input);
    const charges = params.quoteId
      ? await getQuoteOptionalCharges(organizationId, params.quoteId, supabase)
      : [];
    const readiness = getPackagingQuoteReadiness(result, params.input, charges);
    return {
      ok: true,
      result,
      readiness,
      priceExplanation: explainPackagingPrice(result),
      chargeSuggestions: suggestOptionalCharges(params.input, charges),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Calculation failed.' };
  }
}

export type SavePackagingLineResponse = {
  ok: boolean;
  error?: string;
  lineId?: string;
  followUpDraft?: string;
};

export async function savePackagingQuoteLine(params: {
  quoteId: string;
  leadId: string;
  familyId: string;
  templateId: string;
  input: PackagingCalculationInput;
  lineId?: string | null;
}): Promise<SavePackagingLineResponse> {
  try {
    const { supabase, organizationId, userId } = await getContext();

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, organization_id, lead_id, status, currency, display_currency, current_version_id')
      .eq('organization_id', organizationId)
      .eq('id', params.quoteId)
      .maybeSingle();
    if (quoteError || !quote?.id) return { ok: false, error: 'Quote not found in this workspace.' };
    const lockedStatuses = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined', 'sent']);
    if (lockedStatuses.has(String(quote.status || '').toLowerCase())) {
      return { ok: false, error: 'This quote is locked. Create a new quote to add packaging lines.' };
    }

    const template = await getPackagingTemplateById(organizationId, params.templateId, supabase);
    if (!template) return { ok: false, error: 'Pricing template not found for this workspace.' };

    const { data: family } = await supabase
      .from('packaging_service_families')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('id', params.familyId)
      .maybeSingle();
    if (!family?.id) return { ok: false, error: 'Service family not found for this workspace.' };

    const result = calculatePackagingPrice(template, params.input);
    if (!result.ok) {
      return { ok: false, error: result.validation_errors.join(' ') || 'Fix validation errors before saving.' };
    }

    const specSummary = buildPackagingSpecSummary(family.name, template, params.input);
    const quantity = Math.max(1, Math.floor(Number(params.input.quantity ?? 1)));
    const now = new Date().toISOString();

    const snapshot = {
      family_id: family.id,
      family_name: family.name,
      template_id: template.id,
      template_name: template.name,
      input: params.input,
      spec_summary: specSummary,
    };

    const lineRow = {
      quote_id: quote.id,
      product_id: null,
      product_variant_id: null,
      line_type: 'packaging',
      packaging_family_id: family.id,
      packaging_template_id: template.id,
      input_snapshot_json: snapshot,
      pricing_breakdown_json: { breakdown: result.breakdown, warnings: result.warnings, meta: result.meta, lead_time: result.lead_time },
      calculation_version: result.calculation_version,
      quantity,
      unit_price: result.unit_price,
      currency: result.currency,
      catalog_price_amount: result.unit_price,
      catalog_price_currency: result.currency,
      notes: specSummary,
      is_price_overridden: false,
    };

    let lineId = params.lineId ?? null;
    if (lineId) {
      const { error } = await supabase
        .from('quote_line_items')
        .update({ ...lineRow, updated_at: now })
        .eq('id', lineId)
        .eq('quote_id', quote.id)
        .eq('line_type', 'packaging');
      if (error) return { ok: false, error: error.message };
    } else {
      const { data: inserted, error } = await supabase
        .from('quote_line_items')
        .insert(lineRow)
        .select('id')
        .maybeSingle();
      if (error) return { ok: false, error: error.message };
      lineId = inserted?.id ?? null;
    }

    // Mirror into the current quote version so review, approval, and PDF flows
    // see the packaging line alongside product lines.
    if (quote.current_version_id) {
      if (lineId) {
        await supabase
          .from('quote_version_line_items')
          .delete()
          .eq('quote_version_id', quote.current_version_id)
          .eq('line_type', 'packaging')
          .like('product_name', `%[${lineId.slice(0, 8)}]`);
      }
      const versionRow = {
        quote_version_id: quote.current_version_id,
        product_id: null,
        product_variant_id: null,
        line_type: 'packaging',
        sku_code: `PKG-${String(lineId ?? '').slice(0, 8).toUpperCase()}`,
        hsn_code: null,
        product_name: specSummaryVersionName(specSummary, lineId),
        category_type: 'packaging',
        pack_label: family.name,
        basis_applied: 'exw',
        pricing_mode: 'unit',
        moq: quantity,
        final_unit_price: result.unit_price,
        final_case_price: result.total_price,
        display_currency: result.currency,
        is_overridden: false,
        line_notes: specSummary,
        sort_order: 500,
        calculation_meta: {
          source: 'packaging_configurator',
          calculation_version: result.calculation_version,
          breakdown: result.breakdown,
          warnings: result.warnings,
          lead_time: result.lead_time,
          input_snapshot: snapshot,
        },
      };
      await supabase.from('quote_version_line_items').insert(versionRow);
      const { count } = await supabase
        .from('quote_version_line_items')
        .select('id', { count: 'exact', head: true })
        .eq('quote_version_id', quote.current_version_id);
      await supabase
        .from('quote_versions')
        .update({ total_line_count: Number(count ?? 0), updated_at: now })
        .eq('id', quote.current_version_id)
        .eq('quote_id', quote.id);
    }

    await supabase.from('lead_activities').insert({
      organization_id: organizationId,
      lead_id: params.leadId,
      actor_user_id: userId,
      kind: 'quote_updated',
      message: `Packaging line saved: ${specSummary}`,
      occurred_at: now,
    });

    const followUpDraft = draftPackagingFollowUp({
      familyName: family.name,
      specSummary,
      input: params.input,
      leadTime: result.lead_time,
    });

    revalidatePath(`/leads/${params.leadId}/quote`);
    revalidatePath(`/leads/${params.leadId}`);
    return { ok: true, lineId: lineId ?? undefined, followUpDraft };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save the packaging line.' };
  }
}

function specSummaryVersionName(specSummary: string, lineId: string | null) {
  return lineId ? `${specSummary} [${lineId.slice(0, 8)}]` : specSummary;
}

export async function deletePackagingQuoteLine(params: {
  quoteId: string;
  leadId: string;
  lineId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, organizationId } = await getContext();
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, current_version_id')
      .eq('organization_id', organizationId)
      .eq('id', params.quoteId)
      .maybeSingle();
    if (!quote?.id) return { ok: false, error: 'Quote not found in this workspace.' };

    const { error } = await supabase
      .from('quote_line_items')
      .delete()
      .eq('id', params.lineId)
      .eq('quote_id', quote.id)
      .eq('line_type', 'packaging');
    if (error) return { ok: false, error: error.message };

    if (quote.current_version_id) {
      await supabase
        .from('quote_version_line_items')
        .delete()
        .eq('quote_version_id', quote.current_version_id)
        .eq('line_type', 'packaging')
        .like('product_name', `%[${params.lineId.slice(0, 8)}]`);
    }

    revalidatePath(`/leads/${params.leadId}/quote`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not remove the packaging line.' };
  }
}

// ---------------------------------------------------------------------------
// S24-SPEN-208 — Optional charges (separated from calculated line pricing)
// ---------------------------------------------------------------------------

export async function addQuoteOptionalCharge(params: {
  quoteId: string;
  leadId: string;
  chargeType: QuoteOptionalChargeType;
  label: string;
  amount: number;
  currency: string;
  taxable?: boolean;
  notes?: string | null;
  lineItemId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, organizationId, userId } = await getContext();
    const { data: quote } = await supabase
      .from('quotes')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', params.quoteId)
      .maybeSingle();
    if (!quote?.id) return { ok: false, error: 'Quote not found in this workspace.' };
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Charge amount must be greater than zero.' };
    if (!params.label.trim()) return { ok: false, error: 'Charge label is required.' };

    const { error } = await supabase.from('quote_optional_charges').insert({
      organization_id: organizationId,
      quote_id: quote.id,
      quote_line_item_id: params.lineItemId ?? null,
      charge_type: params.chargeType,
      label: params.label.trim(),
      amount,
      currency: params.currency || 'INR',
      taxable: Boolean(params.taxable),
      notes: params.notes?.trim() || null,
      created_by: userId,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${params.leadId}/quote`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not add the charge.' };
  }
}

export async function removeQuoteOptionalCharge(params: {
  chargeId: string;
  leadId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, organizationId } = await getContext();
    const { error } = await supabase
      .from('quote_optional_charges')
      .delete()
      .eq('id', params.chargeId)
      .eq('organization_id', organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${params.leadId}/quote`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not remove the charge.' };
  }
}

// ---------------------------------------------------------------------------
// S24-SPEN-204 — Pricing Template Builder admin actions
// ---------------------------------------------------------------------------

export type TemplateDraft = Omit<PackagingPricingTemplate, 'id' | 'organization_id'> & { id?: string | null };

export async function savePackagingTemplate(draft: TemplateDraft): Promise<{ ok: boolean; error?: string; templateId?: string }> {
  try {
    const { supabase, organizationId } = await getContext();
    if (!draft.name?.trim()) return { ok: false, error: 'Template name is required.' };
    if (!draft.slug?.trim()) return { ok: false, error: 'Template slug is required.' };

    const row = {
      organization_id: organizationId,
      family_id: draft.family_id ?? null,
      slug: draft.slug.trim(),
      name: draft.name.trim(),
      description: draft.description ?? null,
      currency: draft.currency || 'INR',
      is_active: draft.is_active !== false,
      calculation_version: draft.calculation_version || 1,
      allowed_dimension_ranges_json: draft.allowed_dimension_ranges_json ?? { area_formula: 'service' },
      material_rates_json: draft.material_rates_json ?? [],
      print_rules_json: draft.print_rules_json ?? { basis: 'none' },
      finish_addon_rates_json: draft.finish_addon_rates_json ?? [],
      moq_tiers_json: draft.moq_tiers_json ?? { moq: 0, tiers: [] },
      setup_charges_json: draft.setup_charges_json ?? [],
      rush_options_json: draft.rush_options_json ?? [],
      lead_time_rules_json: draft.lead_time_rules_json ?? {},
      waste_factor_pct: Number(draft.waste_factor_pct ?? 0),
      adhesive_options_json: draft.adhesive_options_json ?? [],
      print_process: draft.print_process ?? 'digital',
      flexo_rules_json: draft.print_process === 'flexo' ? (draft.flexo_rules_json ?? null) : null,
      updated_at: new Date().toISOString(),
    };

    if (draft.id) {
      const { error } = await supabase
        .from('packaging_pricing_templates')
        .update(row)
        .eq('id', draft.id)
        .eq('organization_id', organizationId);
      if (error) return { ok: false, error: error.message };
      revalidatePath('/admin/packaging-templates');
      return { ok: true, templateId: draft.id };
    }

    const { data, error } = await supabase
      .from('packaging_pricing_templates')
      .insert(row)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/packaging-templates');
    return { ok: true, templateId: data?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save the template.' };
  }
}

export async function duplicatePackagingTemplate(templateId: string): Promise<{ ok: boolean; error?: string; templateId?: string }> {
  try {
    const { supabase, organizationId } = await getContext();
    const template = await getPackagingTemplateById(organizationId, templateId, supabase);
    if (!template) return { ok: false, error: 'Template not found.' };
    const stamp = Date.now().toString(36).slice(-4);
    const { data, error } = await supabase
      .from('packaging_pricing_templates')
      .insert({
        organization_id: organizationId,
        family_id: template.family_id,
        slug: `${template.slug}-copy-${stamp}`,
        name: `${template.name} (Copy)`,
        description: template.description,
        currency: template.currency,
        is_active: false,
        calculation_version: template.calculation_version,
        allowed_dimension_ranges_json: template.allowed_dimension_ranges_json,
        material_rates_json: template.material_rates_json,
        print_rules_json: template.print_rules_json,
        finish_addon_rates_json: template.finish_addon_rates_json,
        moq_tiers_json: template.moq_tiers_json,
        setup_charges_json: template.setup_charges_json,
        rush_options_json: template.rush_options_json,
        lead_time_rules_json: template.lead_time_rules_json,
        waste_factor_pct: template.waste_factor_pct,
        adhesive_options_json: template.adhesive_options_json ?? [],
        print_process: template.print_process ?? 'digital',
        flexo_rules_json: template.flexo_rules_json ?? null,
      })
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/packaging-templates');
    return { ok: true, templateId: data?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not duplicate the template.' };
  }
}

/**
 * S27-STARK-C1/C2 — Saved SKU spec cards for fast reorder. A rep names and
 * saves the exact input snapshot of a calculated packaging line against the
 * client (lead); reordering just replays that snapshot into the configurator
 * with the current template rules, instead of re-entering every field.
 */
export async function savePackagingSpec(params: {
  leadId: string;
  familyId: string;
  templateId: string;
  name: string;
  input: PackagingCalculationInput;
}): Promise<{ ok: boolean; error?: string; specId?: string }> {
  try {
    const { supabase, organizationId, userId } = await getContext();
    const name = params.name.trim();
    if (!name) return { ok: false, error: 'Give this spec a name (e.g. the client SKU or product name).' };

    const template = await getPackagingTemplateById(organizationId, params.templateId, supabase);
    if (!template) return { ok: false, error: 'Pricing template not found.' };
    const result = calculatePackagingPrice(template, params.input);

    const { data, error } = await supabase
      .from('packaging_saved_specs')
      .insert({
        organization_id: organizationId,
        lead_id: params.leadId,
        family_id: params.familyId,
        template_id: params.templateId,
        name,
        input_snapshot_json: { input: params.input },
        last_unit_price: result.ok ? result.unit_price : null,
        last_currency: result.currency,
        last_calculated_at: new Date().toISOString(),
        created_by: userId,
      })
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${params.leadId}/quote`);
    return { ok: true, specId: data?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save this spec.' };
  }
}

export async function deletePackagingSavedSpec(specId: string, leadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, organizationId } = await getContext();
    const { error } = await supabase.from('packaging_saved_specs').delete().eq('id', specId).eq('organization_id', organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${leadId}/quote`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not delete this spec.' };
  }
}

export async function listPackagingProofs(quoteLineItemId: string): Promise<{ ok: boolean; error?: string; proofs?: import('@/lib/packaging/types').PackagingProof[] }> {
  try {
    const { organizationId } = await getContext();
    const { getPackagingProofs } = await import('@/lib/packaging/queries');
    const proofs = await getPackagingProofs(organizationId, quoteLineItemId);
    return { ok: true, proofs };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not load proofs.' };
  }
}

const PROOF_MAX_BYTES = 15 * 1024 * 1024;
const PROOF_ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

/**
 * S27-STARK-D3 — Upload an artwork proof version. Authenticated (requireWorkspace)
 * so only signed-in team members can upload. Storage write and the DB insert both
 * go through the admin client since the app doesn't run per-user storage RLS for
 * this bucket; access control is enforced at this action boundary instead. The
 * approval_token is generated with crypto.randomUUID() (cryptographically random,
 * effectively unguessable) — it is the only credential the public approval page
 * accepts.
 */
export async function uploadPackagingProof(formData: FormData): Promise<{ ok: boolean; error?: string; approvalUrl?: string }> {
  try {
    const { organizationId, userId } = await getContext();
    const quoteLineItemId = String(formData.get('quoteLineItemId') ?? '');
    const leadId = String(formData.get('leadId') ?? '');
    const file = formData.get('file');
    if (!quoteLineItemId) return { ok: false, error: 'Missing quote line.' };
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a file to upload.' };
    if (file.size > PROOF_MAX_BYTES) return { ok: false, error: 'File is too large (15MB limit).' };
    if (!PROOF_ALLOWED_MIME.has(file.type)) return { ok: false, error: 'Only PDF, PNG, JPEG, or WEBP files are accepted.' };

    const { createAdminSupabaseClient } = await import('@/lib/supabase/admin');
    const admin = createAdminSupabaseClient() as any;
    if (!admin) return { ok: false, error: 'File storage is not configured.' };

    const { getPackagingProofs } = await import('@/lib/packaging/queries');
    const existing = await getPackagingProofs(organizationId, quoteLineItemId, admin as any);
    const nextVersion = (existing[0]?.version ?? 0) + 1;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const path = `packaging-proofs/${organizationId}/${quoteLineItemId}/v${nextVersion}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from('lead-attachments').upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return { ok: false, error: uploadError.message };

    const approvalToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const { error: insertError } = await admin.from('packaging_proofs').insert({
      organization_id: organizationId,
      quote_line_item_id: quoteLineItemId,
      version: nextVersion,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      uploaded_by: userId,
      status: 'pending',
      approval_token: approvalToken,
    });
    if (insertError) return { ok: false, error: insertError.message };

    revalidatePath(`/leads/${leadId}/quote`);
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://setuflowcrm.com';
    return { ok: true, approvalUrl: `${origin}/proof-approval/${approvalToken}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not upload this proof.' };
  }
}

/**
 * S27-STARK — Service families previously had no admin UI at all (only ever
 * seeded via SQL/seed-data.ts). This is what /admin/packaging-families uses
 * to create and edit them.
 */
export async function savePackagingFamily(draft: {
  id: string | null;
  slug: string;
  name: string;
  description: string | null;
  pricing_mode: 'dimensional' | 'service';
  quote_time_inputs: { key: string; label: string }[];
  default_unit: string;
  default_lead_time: string | null;
  sort_order: number;
  is_active: boolean;
}): Promise<{ ok: boolean; error?: string; familyId?: string }> {
  try {
    const { supabase, organizationId } = await getContext();
    const slug = draft.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const name = draft.name.trim();
    if (!slug || !name) return { ok: false, error: 'Name and slug are required.' };

    const row = {
      organization_id: organizationId,
      slug,
      name,
      description: draft.description?.trim() || null,
      pricing_mode: draft.pricing_mode,
      quote_time_inputs: draft.quote_time_inputs,
      default_unit: draft.default_unit.trim() || 'pcs',
      default_lead_time: draft.default_lead_time?.trim() || null,
      sort_order: draft.sort_order,
      is_active: draft.is_active,
      updated_at: new Date().toISOString(),
    };

    if (draft.id) {
      const { error } = await supabase.from('packaging_service_families').update(row).eq('id', draft.id).eq('organization_id', organizationId);
      if (error) return { ok: false, error: error.message };
      revalidatePath('/admin/packaging-families');
      revalidatePath('/products');
      return { ok: true, familyId: draft.id };
    }

    const { data, error } = await supabase.from('packaging_service_families').insert(row).select('id').maybeSingle();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/packaging-families');
    revalidatePath('/products');
    return { ok: true, familyId: data?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save this family.' };
  }
}

/**
 * S27-STARK-REFLIB-01 — Reference library (materials, finishes, service
 * items) server actions. Stored per organization; every write is scoped to
 * the caller's own org via getContext()/RLS, same as the rest of this file.
 */

function slugifyReferenceKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') || `item_${Date.now()}`;
}

export async function seedPackagingReferenceDefaults(): Promise<{ ok: boolean; error?: string; addedCount?: number }> {
  try {
    const { supabase, organizationId } = await getContext();
    const { data, error } = await supabase.rpc('seed_packaging_reference_defaults', { p_organization_id: organizationId });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/packaging-reference-library');
    revalidatePath('/admin/packaging-templates');
    return { ok: true, addedCount: typeof data === 'number' ? data : 0 };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not set up the starter library.' };
  }
}

export type ReferenceItemDraft = {
  id?: string | null;
  category: 'material' | 'finish' | 'service_item';
  key?: string | null;
  name: string;
  description?: string | null;
  default_thickness?: string | null;
  default_unit_hint?: string | null;
  swatch_color?: string | null;
  sort_order?: number;
};

export async function savePackagingReferenceItem(
  draft: ReferenceItemDraft,
): Promise<{ ok: boolean; error?: string; item?: import('@/lib/packaging/types').PackagingReferenceItem }> {
  try {
    const { supabase, organizationId } = await getContext();
    const name = draft.name.trim();
    if (!name) return { ok: false, error: 'Name is required.' };
    const key = draft.key?.trim() ? slugifyReferenceKey(draft.key) : slugifyReferenceKey(name);
    const swatchColor = draft.swatch_color?.trim();
    const normalizedSwatch = swatchColor && /^#[0-9a-fA-F]{6}$/.test(swatchColor) ? swatchColor : null;

    const row = {
      organization_id: organizationId,
      category: draft.category,
      key,
      name,
      description: draft.description?.trim() || null,
      default_thickness: draft.default_thickness?.trim() || null,
      default_unit_hint: draft.default_unit_hint?.trim() || null,
      swatch_color: normalizedSwatch,
      source: 'custom' as const,
      sort_order: draft.sort_order ?? 500,
      updated_at: new Date().toISOString(),
    };

    if (draft.id) {
      const { data, error } = await supabase
        .from('packaging_reference_items')
        .update(row)
        .eq('id', draft.id)
        .eq('organization_id', organizationId)
        .select('id, organization_id, category, key, name, description, default_thickness, default_unit_hint, swatch_color, is_active, source, sort_order')
        .maybeSingle();
      if (error) return { ok: false, error: error.message };
      revalidatePath('/admin/packaging-reference-library');
      revalidatePath('/admin/packaging-templates');
      return { ok: true, item: data };
    }

    const { data, error } = await supabase
      .from('packaging_reference_items')
      .insert(row)
      .select('id, organization_id, category, key, name, description, default_thickness, default_unit_hint, swatch_color, is_active, source, sort_order')
      .maybeSingle();
    if (error) {
      // Unique (organization_id, category, key) collision — most likely the buyer
      // typed a name that slugifies to an existing key. Surface a clear message
      // instead of a raw constraint error.
      if (error.code === '23505') return { ok: false, error: `An item with a matching key already exists in this category. Try a more specific name.` };
      return { ok: false, error: error.message };
    }
    revalidatePath('/admin/packaging-reference-library');
    revalidatePath('/admin/packaging-templates');
    return { ok: true, item: data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save this item.' };
  }
}

export async function setPackagingReferenceItemActive(id: string, isActive: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, organizationId } = await getContext();
    const { error } = await supabase
      .from('packaging_reference_items')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/packaging-reference-library');
    revalidatePath('/admin/packaging-templates');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update this item.' };
  }
}

/**
 * S27-STARK-E1 — Production-stage tracking (Phase E).
 * Write access restricted to owner/admin/design/operations, per Ritesh
 * ("Design + Operations roles only" — owner/admin included as the standing
 * super-role convention used everywhere else in this codebase).
 */
const PRODUCTION_STAGE_WRITE_ROLES = ['owner', 'admin', 'design', 'operations'] as const;

async function assertCanEditProductionStage(currentRoles: string[]) {
  if (!hasWorkspaceRole(currentRoles, PRODUCTION_STAGE_WRITE_ROLES)) {
    throw new Error('Only Design and Operations team members can update production stage.');
  }
}

/** Defensive check: the line item must actually belong to a quote in this org before we log a stage event against it. */
async function assertLineBelongsToOrg(supabase: any, organizationId: string, quoteLineItemId: string) {
  const { data: line, error: lineError } = await supabase
    .from('quote_line_items')
    .select('id, quote_id')
    .eq('id', quoteLineItemId)
    .maybeSingle();
  if (lineError) throw new Error(lineError.message);
  if (!line) throw new Error('Packaging line not found.');
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', line.quote_id)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (quoteError) throw new Error(quoteError.message);
  if (!quote) throw new Error('This packaging line does not belong to your organization.');
}

export async function advancePackagingProductionStage(
  quoteLineItemId: string,
  toStage: ProductionStage,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, organizationId, userId, currentRoles } = await getContext();
    await assertCanEditProductionStage(currentRoles);
    if (!PRODUCTION_STAGES.some((stage) => stage.key === toStage)) return { ok: false, error: 'Unknown production stage.' };
    await assertLineBelongsToOrg(supabase, organizationId, quoteLineItemId);

    const { error } = await supabase.from('packaging_production_stage_events').insert({
      organization_id: organizationId,
      quote_line_item_id: quoteLineItemId,
      stage: toStage,
      actor_user_id: userId,
      notes: notes?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath('/dispatch-board');
    revalidatePath('/dashboard/analytics');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update the production stage.' };
  }
}
