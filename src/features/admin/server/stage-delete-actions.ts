'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

async function getAdminContext() {
  const { missingEnv, membership, organization } = await requireWorkspace();
  if (missingEnv || !membership || !organization) return null;
  const supabase = (await createClient()) as any;
  const { data: roleRows, error } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('organization_member_id', membership.id);
  if (error) return null;
  const roles = (roleRows ?? []).map((row: any) => row?.roles?.name).filter(Boolean);
  if (!roles.includes('owner') && !roles.includes('admin')) return null;
  return { supabase, organization };
}

function redirectWithNotice(notice: string): never {
  redirect(`/admin/pipelines?notice=${encodeURIComponent(notice)}#stages-top`);
  throw new Error('Redirect failed');
}

export async function deletePipelineStage(formData: FormData): Promise<void> {
  const context = await getAdminContext();
  if (!context) return;
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const { supabase, organization } = context;
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('id, pipeline_id, pipelines!inner(organization_id)')
    .eq('id', id)
    .eq('pipelines.organization_id', organization.id)
    .maybeSingle();
  if (!stage) redirectWithNotice('stage-delete-not-found');

  const [{ count: currentLeadCount }, { count: historyFromCount }, { count: historyToCount }] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('stage_id', id),
    supabase.from('lead_stage_history').select('id', { count: 'exact', head: true }).eq('from_stage_id', id),
    supabase.from('lead_stage_history').select('id', { count: 'exact', head: true }).eq('to_stage_id', id),
  ]);
  if ((currentLeadCount ?? 0) > 0 || (historyFromCount ?? 0) > 0 || (historyToCount ?? 0) > 0) {
    redirectWithNotice('stage-delete-blocked-in-use');
  }

  const { error } = await supabase.from('pipeline_stages').delete().eq('id', id);
  if (error) redirectWithNotice('stage-delete-failed');
  revalidatePath('/admin/pipelines');
  revalidatePath('/admin/stages');
  redirectWithNotice('stage-deleted');
}

export async function deleteNextStep(formData: FormData): Promise<void> {
  const context = await getAdminContext();
  if (!context) return;
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const { supabase, organization } = context;
  const { data: step } = await supabase
    .from('next_steps')
    .select('id')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (!step) redirectWithNotice('next-step-delete-not-found');

  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('next_step_id', id);
  if ((count ?? 0) > 0) redirectWithNotice('next-step-delete-blocked-in-use');

  const { error } = await supabase.from('next_steps').delete().eq('id', id).eq('organization_id', organization.id);
  if (error) redirectWithNotice('next-step-delete-failed');
  revalidatePath('/admin/pipelines');
  revalidatePath('/admin/stages');
  redirectWithNotice('next-step-deleted');
}
