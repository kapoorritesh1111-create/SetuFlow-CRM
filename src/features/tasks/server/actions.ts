"use server";

import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/auditLog';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

type TaskRow = {
  id: string;
  lead_id: string | null;
  scheduled_for: string;
  status: string;
  task_type: string;
  payload: unknown;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
};

type TaskActionState = { error?: string; success?: string; task?: TaskRow; taskId?: string };
type MobileCaptureState = { error?: string; success?: string };

function revalidateTaskSurfaces() {
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  revalidatePath('/leads');
  revalidatePath('/pipeline');
  revalidatePath('/documents');
}

async function validateLeadInWorkspace(db: any, organizationId: string, leadId: string | null) {
  if (!leadId) return { ok: true as const };
  const { data: lead, error } = await db.from('leads').select('id, company_name').eq('organization_id', organizationId).eq('id', leadId).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!lead?.id) return { ok: false as const, error: 'Selected lead is not available in the active organization.' };
  return { ok: true as const, lead };
}

async function writeTaskAuditLog(input: {
  organizationId: string;
  actorUserId: string | null;
  action: 'scheduled_task_created' | 'scheduled_task_updated' | 'scheduled_task_completed' | 'scheduled_task_reopened' | 'mobile_field_note_captured' | 'mobile_field_document_captured';
  entityType: string;
  entityId?: string | null;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorUserId: input.actorUserId,
    payload: { previous: input.previous ?? null, new: input.next ?? null, metadata: input.metadata ?? {} },
  });
}

function optionalValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim() || null;
}

export async function saveScheduledTask(_: TaskActionState | undefined, formData: FormData): Promise<TaskActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const supabase = await createClient();
  const admin = createAdminSupabaseClient();
  const db = supabase as any;
  const mutationDb = (admin ?? supabase) as any;
  const id = optionalValue(formData, 'id');
  const leadId = optionalValue(formData, 'lead_id');
  const taskType = optionalValue(formData, 'task_type') ?? 'follow_up';
  const scheduledForRaw = optionalValue(formData, 'scheduled_for');
  const title = optionalValue(formData, 'title') ?? '';
  const notes = optionalValue(formData, 'notes') ?? '';
  const priority = optionalValue(formData, 'priority') ?? 'normal';
  const assignedTo = optionalValue(formData, 'assigned_to') ?? workspace.user.id;
  const linkedEntityType = optionalValue(formData, 'linked_entity_type') ?? (leadId ? 'lead' : null);
  const linkedEntityId = optionalValue(formData, 'linked_entity_id') ?? leadId;

  if (!scheduledForRaw) return { error: 'Scheduled time is required.' };
  const scheduledFor = new Date(scheduledForRaw);
  if (Number.isNaN(scheduledFor.getTime())) return { error: 'Scheduled time is invalid.' };
  if (!title) return { error: 'Task title is required.' };

  const leadCheck = await validateLeadInWorkspace(db, workspace.organization.id, leadId);
  if (!leadCheck.ok) return { error: leadCheck.error };

  const payload = {
    organization_id: workspace.organization.id,
    lead_id: leadId,
    task_type: taskType,
    scheduled_for: scheduledFor.toISOString(),
    status: 'pending',
    payload: { title, notes, priority, assigned_to: assignedTo, linked_entity_type: linkedEntityType, linked_entity_id: linkedEntityId },
    created_by: workspace.user.id,
  };

  const previousTask = id
    ? ((await mutationDb.from('scheduled_tasks').select('id, lead_id, scheduled_for, status, task_type, payload').eq('id', id).eq('organization_id', workspace.organization.id).maybeSingle()).data ?? null) as Record<string, unknown> | null
    : null;

  const query = id
    ? mutationDb.from('scheduled_tasks').update(payload).eq('id', id).eq('organization_id', workspace.organization.id)
    : mutationDb.from('scheduled_tasks').insert(payload);
  const { data, error } = await query.select('id, lead_id, scheduled_for, status, task_type, payload, completed_at, created_at, created_by').single();
  if (error) return { error: error.message };
  const task = data as TaskRow;

  await writeTaskAuditLog({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: id ? 'scheduled_task_updated' : 'scheduled_task_created',
    entityType: 'scheduled_task',
    entityId: task.id,
    previous: previousTask,
    next: { lead_id: task.lead_id, scheduled_for: task.scheduled_for, status: task.status, task_type: task.task_type, payload: task.payload as Record<string, unknown> },
    metadata: { title, priority, assigned_to: assignedTo, linked_entity_type: linkedEntityType, linked_entity_id: linkedEntityId },
  });

  revalidateTaskSurfaces();
  return { success: id ? 'Task updated.' : 'Task created.', task };
}

export async function completeScheduledTask(_: TaskActionState | undefined, formData: FormData): Promise<TaskActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.organization) return { error: 'Not authenticated.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'Task ID is required.' };
  const supabase = await createClient();
  const admin = createAdminSupabaseClient();
  const mutationDb = (admin ?? supabase) as any;
  const { data: existingTask } = await mutationDb.from('scheduled_tasks').select('id, lead_id, scheduled_for, status, task_type').eq('id', id).eq('organization_id', workspace.organization.id).maybeSingle();
  const { data, error } = await mutationDb.from('scheduled_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id).eq('organization_id', workspace.organization.id).select('id, lead_id, scheduled_for, status, task_type, payload, completed_at, created_at, created_by').single();
  if (error) return { error: error.message };
  await writeTaskAuditLog({ organizationId: workspace.organization.id, actorUserId: workspace.user?.id ?? null, action: 'scheduled_task_completed', entityType: 'scheduled_task', entityId: id, previous: (existingTask ?? null) as Record<string, unknown> | null, next: { status: 'completed' } });
  revalidateTaskSurfaces();
  return { success: 'Task completed.', task: data as TaskRow };
}

export async function reopenScheduledTask(_: TaskActionState | undefined, formData: FormData): Promise<TaskActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.organization) return { error: 'Not authenticated.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'Task ID is required.' };
  const supabase = await createClient();
  const admin = createAdminSupabaseClient();
  const mutationDb = (admin ?? supabase) as any;
  const { data: existingTask } = await mutationDb.from('scheduled_tasks').select('id, lead_id, scheduled_for, status, task_type').eq('id', id).eq('organization_id', workspace.organization.id).maybeSingle();
  const { data, error } = await mutationDb.from('scheduled_tasks').update({ status: 'pending', completed_at: null }).eq('id', id).eq('organization_id', workspace.organization.id).select('id, lead_id, scheduled_for, status, task_type, payload, completed_at, created_at, created_by').single();
  if (error) return { error: error.message };
  await writeTaskAuditLog({ organizationId: workspace.organization.id, actorUserId: workspace.user?.id ?? null, action: 'scheduled_task_reopened', entityType: 'scheduled_task', entityId: id, previous: (existingTask ?? null) as Record<string, unknown> | null, next: { status: 'pending' } });
  revalidateTaskSurfaces();
  return { success: 'Task reopened.', task: data as TaskRow };
}

export async function saveMobileFieldNote(_: MobileCaptureState | undefined, formData: FormData): Promise<MobileCaptureState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const leadId = optionalValue(formData, 'lead_id');
  const note = optionalValue(formData, 'note') ?? '';
  const kind = optionalValue(formData, 'kind') ?? 'field_note';
  if (!leadId) return { error: 'Lead is required.' };
  if (!note) return { error: 'Note is required.' };
  const supabase = await createClient();
  const db = supabase as any;
  const leadCheck = await validateLeadInWorkspace(db, workspace.organization.id, leadId);
  if (!leadCheck.ok) return { error: leadCheck.error };
  const { error } = await db.from('lead_activities').insert({ organization_id: workspace.organization.id, lead_id: leadId, actor_user_id: workspace.user.id, kind, message: note, occurred_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await writeTaskAuditLog({ organizationId: workspace.organization.id, actorUserId: workspace.user.id, action: 'mobile_field_note_captured', entityType: 'lead', entityId: leadId, metadata: { kind, note_length: String(note.length) } });
  revalidateTaskSurfaces();
  revalidatePath(`/leads/${leadId}`);
  return { success: 'Mobile field note captured.' };
}

export async function saveMobileFieldDocument(_: MobileCaptureState | undefined, formData: FormData): Promise<MobileCaptureState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const leadId = optionalValue(formData, 'lead_id');
  const fileName = optionalValue(formData, 'file_name') ?? '';
  const docType = optionalValue(formData, 'doc_type') ?? 'field_capture';
  const requirementCode = optionalValue(formData, 'requirement_code');
  const reviewNotes = optionalValue(formData, 'review_notes');
  const expiresAt = optionalValue(formData, 'expires_at');
  if (!leadId) return { error: 'Lead is required.' };
  if (!fileName) return { error: 'Document name is required.' };
  const supabase = await createClient();
  const db = supabase as any;
  const leadCheck = await validateLeadInWorkspace(db, workspace.organization.id, leadId);
  if (!leadCheck.ok) return { error: leadCheck.error };
  const { data: document, error } = await db.from('documents').insert({ organization_id: workspace.organization.id, related_entity: 'lead', related_id: leadId, file_name: fileName, doc_type: docType, requirement_code: requirementCode, status: 'field_captured', review_notes: reviewNotes, expires_at: expiresAt, uploaded_at: new Date().toISOString(), uploaded_by: workspace.user.id }).select('id').single();
  if (error) return { error: error.message };
  await writeTaskAuditLog({ organizationId: workspace.organization.id, actorUserId: workspace.user.id, action: 'mobile_field_document_captured', entityType: 'document', entityId: document?.id ?? null, metadata: { lead_id: leadId, file_name: fileName, doc_type: docType } });
  revalidateTaskSurfaces();
  revalidatePath(`/leads/${leadId}`);
  return { success: 'Mobile document logged.' };
}
