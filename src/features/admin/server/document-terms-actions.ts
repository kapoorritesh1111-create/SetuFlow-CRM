'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export type TermsUpdateResult = { ok: true } | { ok: false; error: string };

// Sprint 13 added columns (page_one_terms, bank_details, export_declarations, etc.)
// via MCP migrations but generated types have not been regenerated.
// All .update() calls on organization_document_terms_profiles use `as any` until
// types are regenerated with: supabase gen types typescript --project-id sjzfzloggabsmcuxktnl
type ProfileUpdate = Record<string, unknown>;

async function updateProfile(
  profileId: string,
  organizationId: string,
  payload: ProfileUpdate,
): Promise<TermsUpdateResult> {
  const db = await createClient();
  const { error } = await (db as any)
    .from('organization_document_terms_profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('organization_id', organizationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function writeHistory(
  organizationId: string,
  profileId: string,
  userId: string | null,
  notes: string,
  snapshot: ProfileUpdate,
) {
  const db = await createClient();
  await (db as any).from('document_template_history').insert({
    organization_id: organizationId,
    profile_id: profileId,
    version_number: Date.now(),
    changed_by: userId,
    change_notes: notes,
    snapshot,
  });
}

/** Update page_one_terms — one term per textarea line */
export async function updatePageOneTermsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const terms = String(formData.get('page_one_terms') ?? '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  const result = await updateProfile(profileId, organization.id, { page_one_terms: terms });
  if (!result.ok) return result;

  await writeHistory(organization.id, profileId, membership.user_id ?? null, 'page_one_terms updated', { page_one_terms: terms });
  revalidatePath('/admin/document-templates');
  return { ok: true };
}

/** Update annexure_terms — one clause per textarea line */
export async function updateAnnexureTermsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const terms = String(formData.get('annexure_terms') ?? '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  const result = await updateProfile(profileId, organization.id, { annexure_terms: terms });
  if (!result.ok) return result;

  await writeHistory(organization.id, profileId, membership.user_id ?? null, 'annexure_terms updated', { annexure_terms: terms });
  revalidatePath('/admin/document-templates');
  return { ok: true };
}

/** Update bank_details JSONB */
export async function updateBankDetailsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const bankDetails: ProfileUpdate = {
    bank_name:      String(formData.get('bank_name') ?? '').trim(),
    account_name:   String(formData.get('account_name') ?? '').trim(),
    account_number: String(formData.get('account_number') ?? '').trim(),
    branch:         String(formData.get('branch') ?? '').trim(),
    swift_code:     String(formData.get('swift_code') ?? '').trim(),
    iban:           String(formData.get('iban') ?? '').trim(),
    ifsc:           String(formData.get('ifsc') ?? '').trim(),
    sort_code:      String(formData.get('sort_code') ?? '').trim(),
    currency:       String(formData.get('currency') ?? '').trim(),
  };

  const result = await updateProfile(profileId, organization.id, { bank_details: bankDetails });
  if (!result.ok) return result;

  await writeHistory(organization.id, profileId, membership.user_id ?? null, 'bank_details updated', { bank_details: bankDetails });
  revalidatePath('/admin/document-templates');
  return { ok: true };
}

/** Update export_declarations JSONB */
export async function updateExportDeclarationsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const declarations: ProfileUpdate = {
    iec_number:  String(formData.get('iec_number') ?? '').trim(),
    lut_arn:     String(formData.get('lut_arn') ?? '').trim(),
    gstin:       String(formData.get('gstin') ?? '').trim(),
    pan:         String(formData.get('pan') ?? '').trim(),
    ad_code:     String(formData.get('ad_code') ?? '').trim(),
    rcmc_number: String(formData.get('rcmc_number') ?? '').trim(),
    vat_number:  String(formData.get('vat_number') ?? '').trim(),
    eori_number: String(formData.get('eori_number') ?? '').trim(),
  };

  const result = await updateProfile(profileId, organization.id, { export_declarations: declarations });
  if (!result.ok) return result;

  await writeHistory(organization.id, profileId, membership.user_id ?? null, 'export_declarations updated', { export_declarations: declarations });
  revalidatePath('/admin/document-templates');
  return { ok: true };
}
