'use server';

import { revalidatePath } from 'next/cache';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspaceRole, requireWorkspace } from '@/lib/workspace/auth';
import {
  derivePackagingDesignReadiness,
  productionStageRequiresReadyDesign,
  type PackagingDesignProof,
  type PackagingDesignSource,
} from '@/lib/packaging/design-proof';
import { PRODUCTION_STAGES, type ProductionStage } from '@/lib/packaging/types';

const PROOF_MAX_BYTES = 15 * 1024 * 1024;
const PROOF_ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const PRODUCTION_STAGE_WRITE_ROLES = ['owner', 'admin', 'design', 'operations'] as const;

async function context() {
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) throw new Error('Not authenticated.');
  const supabase = (await createClient()) as any;
  return {
    workspace,
    supabase,
    organizationId: workspace.organization.id,
    userId: workspace.user.id,
    currentRoles: workspace.currentRoles ?? [],
  };
}

async function requireLineInOrganization(
  supabase: any,
  organizationId: string,
  quoteLineItemId: string,
): Promise<{ id: string; quote_id: string; lead_id: string | null; quote_status: string }> {
  const { data: line, error: lineError } = await supabase
    .from('quote_line_items')
    .select('id, quote_id')
    .eq('id', quoteLineItemId)
    .maybeSingle();
  if (lineError) throw new Error(lineError.message);
  if (!line?.id) throw new Error('Quote line was not found.');

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, lead_id, status')
    .eq('id', line.quote_id)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (quoteError) throw new Error(quoteError.message);
  if (!quote?.id) throw new Error('This quote line does not belong to your organization.');

  return {
    id: line.id,
    quote_id: line.quote_id,
    lead_id: quote.lead_id ?? null,
    quote_status: quote.status ?? 'draft',
  };
}

async function latestDesignProof(
  client: any,
  organizationId: string,
  quoteLineItemId: string,
): Promise<PackagingDesignProof | null> {
  const { data, error } = await client
    .from('packaging_proofs')
    .select('id, organization_id, quote_line_item_id, version, file_path, file_name, mime_type, uploaded_by, uploaded_at, status, reviewed_at, review_comment, approval_token, token_expires_at, design_source')
    .eq('organization_id', organizationId)
    .eq('quote_line_item_id', quoteLineItemId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PackagingDesignProof | null) ?? null;
}

export async function listPackagingDesignProofs(
  quoteLineItemId: string,
): Promise<{ ok: boolean; error?: string; proofs?: PackagingDesignProof[] }> {
  try {
    const { supabase, organizationId } = await context();
    await requireLineInOrganization(supabase, organizationId, quoteLineItemId);
    const { data, error } = await supabase
      .from('packaging_proofs')
      .select('id, organization_id, quote_line_item_id, version, file_path, file_name, mime_type, uploaded_by, uploaded_at, status, reviewed_at, review_comment, approval_token, token_expires_at, design_source')
      .eq('organization_id', organizationId)
      .eq('quote_line_item_id', quoteLineItemId)
      .order('version', { ascending: false });
    if (error) throw new Error(error.message);
    return { ok: true, proofs: (data ?? []) as PackagingDesignProof[] };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not load design proofs.' };
  }
}

export async function uploadPackagingDesignProof(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; approvalUrl?: string; status?: string }> {
  try {
    const { supabase, organizationId, userId } = await context();
    const quoteLineItemId = String(formData.get('quoteLineItemId') ?? '').trim();
    const leadId = String(formData.get('leadId') ?? '').trim();
    const source: PackagingDesignSource = formData.get('designSource') === 'customer_provided'
      ? 'customer_provided'
      : 'design_team';
    const file = formData.get('file');

    if (!quoteLineItemId) return { ok: false, error: 'Missing quote line.' };
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a design file to upload.' };
    if (file.size > PROOF_MAX_BYTES) return { ok: false, error: 'File is too large (15MB limit).' };
    if (!PROOF_ALLOWED_MIME.has(file.type)) return { ok: false, error: 'Only PDF, PNG, JPEG, or WEBP files are accepted.' };

    const line = await requireLineInOrganization(supabase, organizationId, quoteLineItemId);
    const admin = createAdminSupabaseClient() as any;
    if (!admin) return { ok: false, error: 'File storage is not configured.' };

    const latest = await latestDesignProof(admin, organizationId, quoteLineItemId);
    const nextVersion = Number(latest?.version ?? 0) + 1;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || `design-v${nextVersion}`;
    const path = `packaging-proofs/${organizationId}/${quoteLineItemId}/v${nextVersion}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from('lead-attachments')
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return { ok: false, error: uploadError.message };

    const now = new Date().toISOString();
    const approvalToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const initialStatus = source === 'customer_provided' ? 'approved' : 'pending';
    const { error: insertError } = await admin.from('packaging_proofs').insert({
      organization_id: organizationId,
      quote_line_item_id: quoteLineItemId,
      version: nextVersion,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      uploaded_by: userId,
      status: initialStatus,
      reviewed_at: source === 'customer_provided' ? now : null,
      review_comment: source === 'customer_provided' ? 'Customer-provided final design.' : null,
      approval_token: approvalToken,
      design_source: source,
    });
    if (insertError) {
      await admin.storage.from('lead-attachments').remove([path]);
      return { ok: false, error: insertError.message };
    }

    revalidatePath('/design-queue');
    revalidatePath('/dispatch-board');
    revalidatePath('/orders');
    const revalidateLeadId = leadId || line.lead_id || '';
    if (revalidateLeadId) revalidatePath(`/leads/${revalidateLeadId}/quote`);

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://setuflowcrm.com';
    return {
      ok: true,
      status: initialStatus,
      approvalUrl: source === 'design_team' ? `${origin}/proof-approval/${approvalToken}` : undefined,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not upload this design.' };
  }
}

export async function advancePackagingProductionStageWithDesignGate(
  quoteLineItemId: string,
  toStage: ProductionStage,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, organizationId, userId, currentRoles } = await context();
    if (!hasWorkspaceRole(currentRoles, PRODUCTION_STAGE_WRITE_ROLES)) {
      return { ok: false, error: 'Only Design and Operations team members can update production stage.' };
    }
    if (!PRODUCTION_STAGES.some((stage) => stage.key === toStage)) {
      return { ok: false, error: 'Unknown production stage.' };
    }

    await requireLineInOrganization(supabase, organizationId, quoteLineItemId);
    if (productionStageRequiresReadyDesign(toStage)) {
      const readiness = derivePackagingDesignReadiness(
        await latestDesignProof(supabase, organizationId, quoteLineItemId),
      );
      if (!readiness.ready) {
        return {
          ok: false,
          error: 'A final design is required before Printing or any later production stage. Upload customer-provided artwork, or upload a Design Team proof and have it approved.',
        };
      }
    }

    const { error } = await supabase.from('packaging_production_stage_events').insert({
      organization_id: organizationId,
      quote_line_item_id: quoteLineItemId,
      stage: toStage,
      actor_user_id: userId,
      notes: notes?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath('/dispatch-board');
    revalidatePath('/design-queue');
    revalidatePath('/dashboard/analytics');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update the production stage.' };
  }
}
