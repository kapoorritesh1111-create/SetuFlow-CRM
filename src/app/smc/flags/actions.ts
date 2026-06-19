'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function str(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Create a new feature flag. Guarded — SETU internal admin only. */
export async function createFlag(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const flag_key = str(formData.get('flag_key')).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const name = str(formData.get('name')) || flag_key;
  if (!flag_key) return;
  const description = str(formData.get('description')) || null;
  const enabled = formData.get('enabled') === 'on';
  const rolloutRaw = Number.parseInt(str(formData.get('rollout_percentage')), 10);
  const rollout_percentage = Number.isFinite(rolloutRaw) ? Math.min(100, Math.max(0, rolloutRaw)) : 0;

  const admin = createAdminSupabaseClient() as any;
  await admin.from('smc_feature_flags')
    .upsert({ flag_key, name, description, enabled, rollout_percentage }, { onConflict: 'flag_key' });
  revalidatePath('/smc/flags');
}

/** Flip a flag on/off and/or update its rollout. */
export async function updateFlag(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const flag_key = str(formData.get('flag_key'));
  if (!flag_key) return;
  const enabled = formData.get('enabled') === 'on';
  const rolloutRaw = Number.parseInt(str(formData.get('rollout_percentage')), 10);
  const patch: Record<string, unknown> = { enabled };
  if (Number.isFinite(rolloutRaw)) patch.rollout_percentage = Math.min(100, Math.max(0, rolloutRaw));

  const admin = createAdminSupabaseClient() as any;
  await admin.from('smc_feature_flags').update(patch).eq('flag_key', flag_key);
  revalidatePath('/smc/flags');
}
