'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MODULE_KEYS, normalizeModuleKey, type ModuleKey } from '@/lib/modules/module-grants';
import { createClient } from '@/lib/supabase/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

type EntitlementClient = {
  from: (table: 'client_entitlement_profiles' | 'org_module_grants') => {
    upsert: (
      values: Record<string, string | number | boolean | null>,
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

function textValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number.parseInt(textValue(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function decimalValue(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number.parseFloat(textValue(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = textValue(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function checkedValue(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'on';
}

function trialTemplateValue(value: FormDataEntryValue | null) {
  const text = textValue(value);
  return ['export_foods_basic', 'ingredient_trader', 'distributor_importer', 'packaging_converter'].includes(text)
    ? text
    : 'export_foods_basic';
}

function redirectBack(notice: string, client?: string): never {
  const params = new URLSearchParams({ notice });
  if (client) params.set('client', client);
  redirect(`/admin/client-management?${params.toString()}`);
}

function returnClient(formData: FormData) {
  const value = textValue(formData.get('return_client'));
  return value || textValue(formData.get('organization_id'));
}

export async function updateClientEntitlement(formData: FormData): Promise<void> {
  const context = await requireSetuInternalAdminWorkspace();
  const client = returnClient(formData);
  if (context.missingEnv || !context.organization || !context.membership) redirectBack('entitlement-save-failed', client);

  const organizationId = textValue(formData.get('organization_id'));
  if (!organizationId) redirectBack('client-missing', client);

  const supabase = (await createClient()) as unknown as EntitlementClient;
  const { error } = await supabase.from('client_entitlement_profiles').upsert(
    {
      organization_id: organizationId,
      managed_by_organization_id: context.organization.id,
      plan_key: textValue(formData.get('plan_key')) || 'enterprise',
      billing_status: textValue(formData.get('billing_status')) || 'active',
      seat_limit: numberValue(formData.get('seat_limit'), 25),
      onboarding_stage: textValue(formData.get('onboarding_stage')) || 'entitlements',
      guru_monthly_request_limit: numberValue(formData.get('guru_monthly_request_limit'), 25000),
      guru_monthly_spend_limit: decimalValue(formData.get('guru_monthly_spend_limit'), 2500),
      overage_policy: textValue(formData.get('overage_policy')) || (textValue(formData.get('billing_status')) === 'trial' ? 'block_at_limit' : 'warn_then_block'),
      trial_ends_at: optionalDate(formData.get('trial_ends_at')),
      renews_at: optionalDate(formData.get('renews_at')),
      trial_template_key: trialTemplateValue(formData.get('trial_template_key')),
      guided_mode_enabled: checkedValue(formData.get('guided_mode_enabled')),
      max_leads: numberValue(formData.get('max_leads'), 2),
      max_quotes: numberValue(formData.get('max_quotes'), 1),
      max_orders: numberValue(formData.get('max_orders'), 1),
      max_users: numberValue(formData.get('max_users'), 1),
      allow_exports: checkedValue(formData.get('allow_exports')),
      allow_invites: checkedValue(formData.get('allow_invites')),
      allow_settings_edit: checkedValue(formData.get('allow_settings_edit')),
      allow_dispatch: checkedValue(formData.get('allow_dispatch')),
    },
    { onConflict: 'organization_id' },
  );

  if (error) redirectBack('entitlement-save-failed', client);
  revalidatePath('/admin/client-management');
  redirectBack('entitlement-saved', client);
}

export async function updateClientModuleGrant(formData: FormData): Promise<void> {
  const context = await requireSetuInternalAdminWorkspace();
  const client = returnClient(formData);
  if (context.missingEnv || !context.membership) redirectBack('module-save-failed', client);

  const organizationId = textValue(formData.get('organization_id'));
  const moduleKey = normalizeModuleKey(formData.get('module_key'));
  if (!organizationId || !moduleKey || !MODULE_KEYS.includes(moduleKey)) redirectBack('module-invalid', client);

  const enabled = formData.get('enabled') === 'true';
  const supabase = (await createClient()) as unknown as EntitlementClient;
  const { error } = await supabase.from('org_module_grants').upsert(
    {
      organization_id: organizationId,
      module_key: moduleKey,
      enabled,
      granted_by: context.membership.user_id ?? null,
    },
    { onConflict: 'organization_id,module_key' },
  );

  if (error) redirectBack('module-save-failed', client);
  revalidatePath('/admin/client-management');
  redirectBack(enabled ? 'module-enabled' : 'module-disabled', client);
}
