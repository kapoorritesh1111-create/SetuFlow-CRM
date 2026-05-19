'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export type TermsUpdateResult = { ok: true } | { ok: false; error: string };

/**
 * Update page_one_terms (compact terms) for a profile.
 * Accepts a newline-separated string from a textarea, splits into array.
 */
export async function updatePageOneTermsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  const rawTerms = String(formData.get('page_one_terms') ?? '');
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const terms = rawTerms
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  const db = await createClient();
  const { error } = await db
    .from('organization_document_terms_profiles')
    .update({
      page_one_terms: terms,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .eq('organization_id', organization.id);

  if (error) return { ok: false, error: error.message };

  // Write history snapshot
  await db.from('document_template_history').insert({
    organization_id: organization.id,
    profile_id: profileId,
    version_number: Date.now(), // simple incrementing version for now
    changed_by: membership.user_id ?? null,
    change_notes: 'page_one_terms updated via admin editor',
    snapshot: { page_one_terms: terms },
  });

  revalidatePath('/admin/document-templates');
  return { ok: true };
}

/**
 * Update annexure_terms for a profile.
 */
export async function updateAnnexureTermsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  const rawTerms = String(formData.get('annexure_terms') ?? '');
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const terms = rawTerms
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  const db = await createClient();
  const { error } = await db
    .from('organization_document_terms_profiles')
    .update({
      annexure_terms: terms,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .eq('organization_id', organization.id);

  if (error) return { ok: false, error: error.message };

  await db.from('document_template_history').insert({
    organization_id: organization.id,
    profile_id: profileId,
    version_number: Date.now(),
    changed_by: membership.user_id ?? null,
    change_notes: 'annexure_terms updated via admin editor',
    snapshot: { annexure_terms: terms },
  });

  revalidatePath('/admin/document-templates');
  return { ok: true };
}

/**
 * Update bank_details JSON for a profile.
 * Accepts individual named fields from a form.
 */
export async function updateBankDetailsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const bankDetails = {
    bank_name: String(formData.get('bank_name') ?? '').trim(),
    account_name: String(formData.get('account_name') ?? '').trim(),
    account_number: String(formData.get('account_number') ?? '').trim(),
    branch: String(formData.get('branch') ?? '').trim(),
    swift_code: String(formData.get('swift_code') ?? '').trim(),
    iban: String(formData.get('iban') ?? '').trim(),
    ifsc: String(formData.get('ifsc') ?? '').trim(),
    sort_code: String(formData.get('sort_code') ?? '').trim(),
    currency: String(formData.get('currency') ?? '').trim(),
  };

  const db = await createClient();
  const { error } = await db
    .from('organization_document_terms_profiles')
    .update({ bank_details: bankDetails, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('organization_id', organization.id);

  if (error) return { ok: false, error: error.message };

  await db.from('document_template_history').insert({
    organization_id: organization.id,
    profile_id: profileId,
    version_number: Date.now(),
    changed_by: membership.user_id ?? null,
    change_notes: 'bank_details updated',
    snapshot: { bank_details: bankDetails },
  });

  revalidatePath('/admin/document-templates');
  return { ok: true };
}

/**
 * Update export_declarations JSON for a profile.
 */
export async function updateExportDeclarationsAction(
  _prev: TermsUpdateResult,
  formData: FormData,
): Promise<TermsUpdateResult> {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return { ok: false, error: 'Unauthorized' };

  const profileId = String(formData.get('profile_id') ?? '').trim();
  if (!profileId) return { ok: false, error: 'Profile ID required' };

  const declarations = {
    iec_number: String(formData.get('iec_number') ?? '').trim(),
    lut_arn: String(formData.get('lut_arn') ?? '').trim(),
    gstin: String(formData.get('gstin') ?? '').trim(),
    pan: String(formData.get('pan') ?? '').trim(),
    ad_code: String(formData.get('ad_code') ?? '').trim(),
    rcmc_number: String(formData.get('rcmc_number') ?? '').trim(),
    vat_number: String(formData.get('vat_number') ?? '').trim(),
    eori_number: String(formData.get('eori_number') ?? '').trim(),
  };

  const db = await createClient();
  const { error } = await db
    .from('organization_document_terms_profiles')
    .update({ export_declarations: declarations, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('organization_id', organization.id);

  if (error) return { ok: false, error: error.message };

  await db.from('document_template_history').insert({
    organization_id: organization.id,
    profile_id: profileId,
    version_number: Date.now(),
    changed_by: membership.user_id ?? null,
    change_notes: 'export_declarations updated',
    snapshot: { export_declarations: declarations },
  });

  revalidatePath('/admin/document-templates');
  return { ok: true };
}
