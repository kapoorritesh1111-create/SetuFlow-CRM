'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspaceRole, requireWorkspace } from '@/lib/workspace/auth';
import { isPackagingOrganization } from '@/lib/verticals/capability';

const REQUEST_ROLES = ['owner', 'admin', 'sales', 'manager'] as const;

type DesignRequestMeta = {
  requested: true;
  requested_at: string;
  requested_by: string;
  due_date: string | null;
  notes: string | null;
  status: 'new_request';
};

async function context() {
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) throw new Error('Not authenticated.');
  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  if (!(await isPackagingOrganization(organizationId, supabase))) throw new Error('Packaging is not enabled for this workspace.');
  return { workspace, supabase, organizationId, userId: workspace.user.id, currentRoles: workspace.currentRoles ?? [] };
}

export async function getDesignRequestQuoteState(leadId: string, quoteId?: string | null) {
  try {
    const { supabase, organizationId, currentRoles } = await context();
    const canRequest = hasWorkspaceRole(currentRoles, REQUEST_ROLES);
    const { data: quotes, error: quoteError } = await supabase
      .from('quotes')
      .select('id, quote_number, status, updated_at, industry_metadata')
      .eq('organization_id', organizationId)
      .eq('lead_id', leadId)
      .not('status', 'in', '(rejected,expired,cancelled,declined)')
      .order('updated_at', { ascending: false });
    if (quoteError) throw new Error(quoteError.message);
    const selected = (quoteId ? (quotes ?? []).find((q: any) => q.id === quoteId) : null) ?? (quotes ?? [])[0] ?? null;
    if (!selected) return { ok: true, canRequest, quote: null, lines: [] as any[] };

    const { data: lines, error: lineError } = await supabase
      .from('quote_line_items')
      .select('id, line_type, product_id, quantity, notes, input_snapshot_json, pricing_breakdown_json, updated_at')
      .eq('quote_id', selected.id)
      .in('line_type', ['packaging', 'product'])
      .order('updated_at', { ascending: false });
    if (lineError) throw new Error(lineError.message);

    const productIds = [...new Set((lines ?? []).map((line: any) => line.product_id).filter(Boolean))];
    const { data: products, error: productError } = productIds.length
      ? await supabase.from('products').select('id, name, sku, product_family_code, enabled_capabilities').eq('organization_id', organizationId).in('id', productIds)
      : { data: [], error: null };
    if (productError) throw new Error(productError.message);
    const byProduct = new Map<string, any>((products ?? []).map((p: any) => [p.id, p]));

    const normalized = (lines ?? []).map((line: any) => {
      const snapshot = line.input_snapshot_json ?? {};
      const input = snapshot.input ?? {};
      const request = snapshot.design_request ?? null;
      const product = line.product_id ? byProduct.get(line.product_id) : null;
      return {
        id: line.id,
        lineType: line.line_type,
        productName: product?.name ?? null,
        quantity: Number(line.quantity ?? input.quantity ?? 0),
        specSummary: snapshot.spec_summary ?? line.notes ?? product?.name ?? 'Packaging line',
        artworkStatus: input.artwork_status ?? null,
        kldFileId: input.kld_file_id ?? null,
        designRequest: request,
      };
    });

    return { ok: true, canRequest, quote: selected, lines: normalized };
  } catch (error) {
    return { ok: false, canRequest: false, quote: null, lines: [] as any[], error: error instanceof Error ? error.message : 'Could not load design request state.' };
  }
}

export async function requestPackagingDesign(input: { leadId: string; quoteId: string; quoteLineItemId: string; dueDate?: string | null; notes?: string | null }) {
  try {
    const { supabase, organizationId, userId, currentRoles } = await context();
    if (!hasWorkspaceRole(currentRoles, REQUEST_ROLES)) return { ok: false, error: 'Only Sales, Managers, Admins or Owners can request design work.' };

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, lead_id, status')
      .eq('id', input.quoteId)
      .eq('organization_id', organizationId)
      .eq('lead_id', input.leadId)
      .maybeSingle();
    if (quoteError) throw new Error(quoteError.message);
    if (!quote?.id) return { ok: false, error: 'Quote was not found in this workspace.' };
    if (['rejected', 'expired', 'cancelled', 'declined'].includes(String(quote.status ?? '').toLowerCase())) return { ok: false, error: 'Closed quotes cannot start new design work.' };

    const { data: line, error: lineError } = await supabase
      .from('quote_line_items')
      .select('id, quote_id, input_snapshot_json')
      .eq('id', input.quoteLineItemId)
      .eq('quote_id', quote.id)
      .maybeSingle();
    if (lineError) throw new Error(lineError.message);
    if (!line?.id) return { ok: false, error: 'Quote line was not found.' };

    const snapshot = line.input_snapshot_json ?? {};
    const now = new Date().toISOString();
    const designRequest: DesignRequestMeta = {
      requested: true,
      requested_at: now,
      requested_by: userId,
      due_date: input.dueDate?.trim() || null,
      notes: input.notes?.trim().slice(0, 1000) || null,
      status: 'new_request',
    };

    const { error: updateError } = await supabase
      .from('quote_line_items')
      .update({ input_snapshot_json: { ...snapshot, design_request: designRequest } })
      .eq('id', line.id)
      .eq('quote_id', quote.id);
    if (updateError) throw new Error(updateError.message);

    revalidatePath(`/leads/${input.leadId}/quote`);
    revalidatePath('/design-queue');
    return { ok: true, requestedAt: now };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not request design.' };
  }
}
