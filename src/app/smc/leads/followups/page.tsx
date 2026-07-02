import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { FollowUpBoard } from './followup-board';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: string; company_name: string; primary_admin_name: string | null;
  primary_admin_email: string; primary_phone: string | null;
  pipeline_stage: string | null; status: string;
  next_follow_up_at: string | null; last_contact_at: string | null;
  lead_score: number | null; internal_notes: string | null;
  assigned_to_name: string | null; assigned_to_user_id: string | null;
  source: string | null; source_detail: string | null;
  demo_scheduled_at: string | null; demo_completed_at: string | null;
  demo_outcome: string | null; demo_notes: string | null;
  activity_log: unknown[];
};

async function assertMember() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const { data: m } = await (sb as any).from('organization_members').select('id')
    .eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  if (!m) redirect('/');
  return { sb, userId: user.id };
}

async function logActivityAction(formData: FormData) {
  'use server';
  const { sb, userId } = await assertMember();
  const leadId = String(formData.get('lead_id') ?? '');
  const kind = String(formData.get('kind') ?? 'note');
  const note = String(formData.get('note') ?? '').trim();
  const actorName = String(formData.get('actor_name') ?? 'Team');
  if (!leadId || !note) return;
  const entry = { id: crypto.randomUUID(), kind, note, actor_name: actorName, actor_user_id: userId, created_at: new Date().toISOString() };
  const { data: existing } = await (sb as any).from('client_onboarding_requests').select('activity_log').eq('id', leadId).single();
  const log = Array.isArray(existing?.activity_log) ? existing.activity_log : [];
  const patch: Record<string, unknown> = { activity_log: [...log, entry], updated_at: new Date().toISOString() };
  if (['call', 'email', 'whatsapp', 'demo_completed'].includes(kind)) patch.last_contact_at = entry.created_at;
  await (sb as any).from('client_onboarding_requests').update(patch).eq('id', leadId);
  revalidatePath('/smc/leads/followups');
}

async function rescheduleAction(formData: FormData) {
  'use server';
  const { sb, userId } = await assertMember();
  const leadId = String(formData.get('lead_id') ?? '');
  const date = String(formData.get('next_follow_up_at') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const actorName = String(formData.get('actor_name') ?? 'Team');
  if (!leadId || !date) return;
  const entry = { id: crypto.randomUUID(), kind: 'follow_up_set', note: note || `Follow-up rescheduled to ${date}`, actor_name: actorName, actor_user_id: userId, created_at: new Date().toISOString() };
  const { data: existing } = await (sb as any).from('client_onboarding_requests').select('activity_log').eq('id', leadId).single();
  const log = Array.isArray(existing?.activity_log) ? existing.activity_log : [];
  await (sb as any).from('client_onboarding_requests').update({
    next_follow_up_at: new Date(date).toISOString(),
    activity_log: [...log, entry],
    updated_at: new Date().toISOString(),
  }).eq('id', leadId);
  revalidatePath('/smc/leads/followups');
}

export default async function FollowUpsPage() {
  const { sb } = await assertMember();
  const now = new Date();
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

  // Fetch follow-ups: overdue + today + this week
  const { data } = await (sb as any)
    .from('client_onboarding_requests')
    .select('id,company_name,primary_admin_name,primary_admin_email,primary_phone,pipeline_stage,status,next_follow_up_at,last_contact_at,lead_score,internal_notes,assigned_to_name,assigned_to_user_id,source,source_detail,demo_scheduled_at,demo_completed_at,demo_outcome,demo_notes,activity_log')
    .not('next_follow_up_at', 'is', null)
    .lte('next_follow_up_at', weekEnd.toISOString())
    .not('pipeline_stage', 'in', '("converted","lost")')
    .order('next_follow_up_at', { ascending: true });

  const leads = ((data ?? []) as LeadRow[]);
  const overdue = leads.filter(l => l.next_follow_up_at && new Date(l.next_follow_up_at) < now);
  const dueToday = leads.filter(l => {
    if (!l.next_follow_up_at) return false;
    const d = new Date(l.next_follow_up_at);
    return d >= now && d <= todayEnd;
  });
  const thisWeek = leads.filter(l => {
    if (!l.next_follow_up_at) return false;
    const d = new Date(l.next_follow_up_at);
    return d > todayEnd && d <= weekEnd;
  });

  return (
    <FollowUpBoard
      overdue={overdue}
      dueToday={dueToday}
      thisWeek={thisWeek}
      logActivity={logActivityAction}
      reschedule={rescheduleAction}
    />
  );
}
