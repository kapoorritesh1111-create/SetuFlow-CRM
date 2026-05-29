import { createClient } from '@/lib/supabase/server';

export type SetuGuruFeedbackLabel = 'helpful' | 'missing';

export type SetuGuruFeedbackPayload = {
  organizationId: string;
  userId: string;
  label: SetuGuruFeedbackLabel;
  lastMessage?: string;
  pathname?: string;
  routeTitle?: string;
  helpFile?: string;
  submittedAt?: string;
};

export type SetuGuruFeedbackRow = {
  id: string;
  organization_id: string;
  user_id: string;
  label: SetuGuruFeedbackLabel;
  last_message: string;
  pathname: string;
  route_title: string;
  help_file: string;
  submitted_at: string;
  created_at: string;
};

export async function writeFeedback(input: SetuGuruFeedbackPayload): Promise<{ id?: string; ok: boolean }> {
  const db = await createClient();
  const { data, error } = await db
    .from('setu_guru_feedback')
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      label: input.label,
      last_message: (input.lastMessage ?? '').slice(0, 8000),
      pathname: (input.pathname ?? '').slice(0, 300),
      route_title: (input.routeTitle ?? '').slice(0, 160),
      help_file: (input.helpFile ?? '').slice(0, 300),
      submitted_at: input.submittedAt ?? new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    // Fallback: table may not exist yet in this deployment — do not throw
    return { ok: false };
  }
  return { id: data?.id, ok: true };
}

export async function getFeedbackSummary(organizationId: string): Promise<{ helpful: number; missing: number; recent: SetuGuruFeedbackRow[] }> {
  const db = await createClient();
  const { data } = await db
    .from('setu_guru_feedback')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as SetuGuruFeedbackRow[];
  return {
    helpful: rows.filter((r) => r.label === 'helpful').length,
    missing: rows.filter((r) => r.label === 'missing').length,
    recent: rows.slice(0, 10),
  };
}
