"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { RFQ_STATUSES, serializeRfqWorkflow, type RfqStatus } from '@/lib/rfqWorkflow';
import { SUPPLIER_RESPONSE_STATES, type SupplierResponse } from '@/lib/supplierResponse';
import { normalizeCurrencyCode, validateOrganizationProductIds, validateOrganizationVariantIds } from '@/lib/catalog-pricing-model';

export type RfqActionState = { error?: string; success?: string; record?: any; mode?: 'create' | 'update' };

type ParsedLineItem = {
  product_id: string;
  product_variant_id?: string;
  catalog_price_id?: string;
  catalog_price_amount?: number;
  catalog_price_currency?: string;
  quantity: number;
  unit_price?: number;
  currency?: string;
  is_price_overridden?: boolean;
  override_reason?: string;
  notes?: string;
};

function parseLineItems(formData: FormData) {
  const lineItemsJson = formData.get('line_items');
  let lineItems: ParsedLineItem[] = [];
  if (typeof lineItemsJson === 'string' && lineItemsJson.trim().length) {
    const parsed = JSON.parse(lineItemsJson);
    if (Array.isArray(parsed)) {
      lineItems = parsed
        .map((item) => ({
          product_id: String(item.product_id ?? ''),
          ...(item.product_variant_id ? { product_variant_id: String(item.product_variant_id) } : {}),
          ...(item.catalog_price_id ? { catalog_price_id: String(item.catalog_price_id) } : {}),
          ...(item.catalog_price_amount !== undefined && item.catalog_price_amount !== null && item.catalog_price_amount !== '' ? { catalog_price_amount: Number(item.catalog_price_amount) } : {}),
          ...(item.catalog_price_currency ? { catalog_price_currency: normalizeCurrencyCode(String(item.catalog_price_currency)) ?? undefined } : {}),
          quantity: Number(item.quantity ?? 0),
          ...(item.unit_price !== undefined && item.unit_price !== null && item.unit_price !== '' ? { unit_price: Number(item.unit_price) } : {}),
          ...(item.currency ? { currency: normalizeCurrencyCode(String(item.currency)) ?? undefined } : {}),
          ...(item.is_price_overridden !== undefined ? { is_price_overridden: Boolean(item.is_price_overridden) } : {}),
          ...(item.override_reason ? { override_reason: String(item.override_reason) } : {}),
          ...(item.notes ? { notes: String(item.notes) } : {}),
        }))
        .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0 && (item.product_id || item.notes));
    }
  }
  return lineItems;
}

function parseSupplierResponses(raw: FormDataEntryValue | null): SupplierResponse[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => ({
        id: String(item.id ?? `supplier-${index + 1}`),
        supplierName: String(item.supplierName ?? '').trim(),
        status: SUPPLIER_RESPONSE_STATES.includes(item.status) ? item.status : 'not_sent',
        contactedAt: item.contactedAt ? String(item.contactedAt) : null,
        viewedAt: item.viewedAt ? String(item.viewedAt) : null,
        respondedAt: item.respondedAt ? String(item.respondedAt) : null,
        notes: String(item.notes ?? ''),
      }))
      .filter((item) => item.supplierName);
  } catch {
    return [];
  }
}

function validateRfqInput(input: {
  title: string;
  requestSummary: string;
  currency: string | null;
  validityDate: string | null;
  neededBy: string | null;
  status: string;
  supplierResponses: SupplierResponse[];
  lineItems: ParsedLineItem[];
}) {
  if (!input.title.trim()) return 'RFQ title is required.';
  if (!input.requestSummary.trim()) return 'Buyer request summary is required.';
  if (!input.currency) return 'Currency is required.';
  if (!input.validityDate) return 'Validity date is required.';
  if (!input.neededBy) return 'Needed-by date is required.';
  if (!RFQ_STATUSES.includes(input.status as RfqStatus)) return 'RFQ status is invalid.';
  if (!input.lineItems.length) return 'At least one RFQ line item is required.';
  if (input.supplierResponses.some((supplier) => !supplier.supplierName.trim())) return 'Supplier names are required for every tracked supplier row.';
  if (input.status === 'sent_to_suppliers' && !input.supplierResponses.length) return 'Add at least one supplier before marking the RFQ as sent to suppliers.';
  return null;
}


async function fetchRfqRecord(db: any, organizationId: string, rfqId: string) {
  const { data, error } = await db
    .from('rfqs')
    .select(`
      id,
      lead_id,
      status,
      currency,
      validity_date,
      created_at,
      updated_at,
      notes,
      rfq_line_items (
        id,
        product_id,
        product_variant_id,
        catalog_price_id,
        catalog_price_amount,
        catalog_price_currency,
        quantity,
        unit_price,
        currency,
        is_price_overridden,
        override_reason,
        notes
      )
    `)
    .eq('organization_id', organizationId)
    .eq('id', rfqId)
    .maybeSingle();

  if (error) return { error: error.message, record: null };
  const record = data ? { ...data, lineItems: Array.isArray(data.rfq_line_items) ? data.rfq_line_items : [] } : null;
  if (record && 'rfq_line_items' in record) delete (record as any).rfq_line_items;
  return { error: null, record };
}

function revalidateCommercialViews(leadId?: string) {
  revalidatePath('/dashboard');
  revalidatePath('/leads');
  revalidatePath('/pipeline');
  if (leadId) {
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/quote`);
  }
}

export async function createRfq(_: RfqActionState | undefined, formData: FormData): Promise<RfqActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'You do not have permission to manage RFQs.' };

  const currentUser = workspace.user;
  const organization = workspace.organization;

  const leadId = String(formData.get('lead_id') ?? '').trim() || null;
  const title = String(formData.get('title') ?? '').trim();
  const requestSummary = String(formData.get('request_summary') ?? '').trim();
  const currency = normalizeCurrencyCode(String(formData.get('currency') ?? '').trim());
  const validityDate = String(formData.get('validity_date') ?? '').trim() || null;
  const neededBy = String(formData.get('needed_by') ?? '').trim() || null;
  const plainNotes = String(formData.get('notes') ?? '').trim();
  const status = (String(formData.get('status') ?? 'draft').trim() || 'draft') as RfqStatus;
  const supplierResponses = parseSupplierResponses(formData.get('supplier_responses'));

  let lineItems: ParsedLineItem[] = [];
  try {
    lineItems = parseLineItems(formData);
  } catch {
    return { error: 'Failed to parse RFQ line items.' };
  }

  const validationError = validateRfqInput({ title, requestSummary, currency, validityDate, neededBy, status, supplierResponses, lineItems });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const db = supabase as any;
  const productValidation = await validateOrganizationProductIds(
    db,
    workspace.organization.id,
    lineItems.map((item) => item.product_id),
  );
  if (!productValidation.ok) return { error: productValidation.error };
  const variantValidation = await validateOrganizationVariantIds(
    db,
    workspace.organization.id,
    lineItems.map((item) => item.product_variant_id ?? ''),
  );
  if (!variantValidation.ok) return { error: variantValidation.error };

  const notes = serializeRfqWorkflow(plainNotes, {
    title,
    requestSummary,
    neededBy,
    buyerSubmittedAt: status === 'submitted' ? new Date().toISOString() : null,
    sentToSuppliersAt: status === 'sent_to_suppliers' ? new Date().toISOString() : null,
    supplierResponses,
  });

  const lineItemsPayload = lineItems.map((item) => {
    const finalCurrency = item.currency ?? currency;
    const isPriceOverridden = item.is_price_overridden ?? (item.catalog_price_amount !== undefined && item.catalog_price_amount !== null && item.unit_price !== undefined ? Number(item.unit_price) !== Number(item.catalog_price_amount) : false);

    return {
      product_id: item.product_id || null,
      product_variant_id: item.product_variant_id || null,
      catalog_price_id: null,
      catalog_price_amount: item.catalog_price_amount ?? null,
      catalog_price_currency: item.catalog_price_currency ?? finalCurrency,
      quantity: item.quantity,
      unit_price: item.unit_price ?? item.catalog_price_amount ?? null,
      currency: finalCurrency,
      is_price_overridden: isPriceOverridden,
      override_reason: isPriceOverridden ? item.override_reason ?? null : null,
      overridden_by: isPriceOverridden ? currentUser.id : null,
      overridden_at: isPriceOverridden ? new Date().toISOString() : null,
      notes: item.notes ?? null,
    };
  });

  const { data: createdRfqResult, error: createRfqTxError } = await db.rpc('app_create_rfq_with_line_items_and_fanout_tx', {
    p_organization_id: organization.id,
    p_lead_id: leadId,
    p_created_by: currentUser.id,
    p_status: status,
    p_currency: currency,
    p_validity_date: validityDate,
    p_notes: notes,
    p_line_items: lineItemsPayload,
    p_request_summary: requestSummary,
    p_supplier_response_count: supplierResponses.length,
    p_action_source: 'createRfq',
  });

  if (createRfqTxError) return { error: createRfqTxError.message };

  const rfq = Array.isArray(createdRfqResult) ? createdRfqResult[0] : createdRfqResult;
  if (!rfq?.rfq_id) return { error: 'Failed to create RFQ.' };

  const fetched = await fetchRfqRecord(db, organization.id, rfq.rfq_id);
  if (fetched.error) return { error: fetched.error };

  revalidateCommercialViews(rfq.lead_id ?? undefined);
  return { success: 'RFQ created.', record: fetched.record, mode: 'create' };
}

export async function updateRfqWorkflow(_: RfqActionState | undefined, formData: FormData): Promise<RfqActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'You do not have permission to manage RFQs.' };

  const currentUser = workspace.user;
  const organization = workspace.organization;

  const rfqId = String(formData.get('rfq_id') ?? '').trim();
  if (!rfqId) return { error: 'RFQ ID is required.' };

  const supabase = await createClient();
  const db = supabase as any;
  const { data: existing, error: existingError } = await db
    .from('rfqs')
    .select('id, lead_id, status, currency, validity_date, notes')
    .eq('organization_id', organization.id)
    .eq('id', rfqId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'RFQ not found.' };

  const supplierResponses = parseSupplierResponses(formData.get('supplier_responses'));
  const status = String(formData.get('status') ?? 'draft').trim() || 'draft';
  const title = String(formData.get('title') ?? '').trim();
  const requestSummary = String(formData.get('request_summary') ?? '').trim();
  const plainNotes = String(formData.get('notes') ?? '').trim();
  const validityDate = String(formData.get('validity_date') ?? '').trim() || null;
  const currency = normalizeCurrencyCode(String(formData.get('currency') ?? '').trim());
  const neededBy = String(formData.get('needed_by') ?? '').trim() || null;

  let lineItems: ParsedLineItem[] = [];
  try {
    lineItems = parseLineItems(formData);
  } catch {
    return { error: 'Failed to parse RFQ line items.' };
  }

  const validationError = validateRfqInput({
    title,
    requestSummary,
    currency,
    validityDate,
    neededBy,
    status,
    supplierResponses,
    lineItems,
  });
  if (validationError) return { error: validationError };

  const productValidation = await validateOrganizationProductIds(
    db,
    workspace.organization.id,
    lineItems.map((item) => item.product_id),
  );
  if (!productValidation.ok) return { error: productValidation.error };
  const variantValidation = await validateOrganizationVariantIds(
    db,
    workspace.organization.id,
    lineItems.map((item) => item.product_variant_id ?? ''),
  );
  if (!variantValidation.ok) return { error: variantValidation.error };

  const notes = serializeRfqWorkflow(plainNotes, {
    title,
    requestSummary,
    neededBy,
    sentToSuppliersAt: status === 'sent_to_suppliers' ? new Date().toISOString() : null,
    supplierResponses,
  });

  const lineItemsPayload = lineItems.map((item) => {
    const finalCurrency = item.currency ?? currency;
    const isPriceOverridden = item.is_price_overridden ?? (item.catalog_price_amount !== undefined && item.catalog_price_amount !== null && item.unit_price !== undefined ? Number(item.unit_price) !== Number(item.catalog_price_amount) : false);

    return {
      product_id: item.product_id || null,
      product_variant_id: item.product_variant_id || null,
      catalog_price_id: null,
      catalog_price_amount: item.catalog_price_amount ?? null,
      catalog_price_currency: item.catalog_price_currency ?? finalCurrency,
      quantity: item.quantity,
      unit_price: item.unit_price ?? item.catalog_price_amount ?? null,
      currency: finalCurrency,
      is_price_overridden: isPriceOverridden,
      override_reason: isPriceOverridden ? item.override_reason ?? null : null,
      overridden_by: isPriceOverridden ? currentUser.id : null,
      overridden_at: isPriceOverridden ? new Date().toISOString() : null,
      notes: item.notes ?? null,
    };
  });

  const { data: updatedRfqResult, error: updateRfqTxError } = await db.rpc('app_update_rfq_with_line_items_and_fanout_tx', {
    p_organization_id: organization.id,
    p_rfq_id: rfqId,
    p_actor_user_id: currentUser.id,
    p_status: status,
    p_currency: currency,
    p_validity_date: validityDate,
    p_notes: notes,
    p_line_items: lineItemsPayload,
    p_request_summary: requestSummary,
    p_supplier_response_count: supplierResponses.length,
    p_action_source: 'updateRfqWorkflow',
  });

  if (updateRfqTxError) return { error: updateRfqTxError.message };

  const updatedRfq = Array.isArray(updatedRfqResult) ? updatedRfqResult[0] : updatedRfqResult;
  if (!updatedRfq?.rfq_id) return { error: 'Failed to update RFQ.' };

  const fetched = await fetchRfqRecord(db, organization.id, rfqId);
  if (fetched.error) return { error: fetched.error };

  revalidateCommercialViews(existing.lead_id ?? undefined);
  return { success: 'RFQ workflow updated.', record: fetched.record, mode: 'update' };
}
