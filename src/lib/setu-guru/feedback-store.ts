import { createClient } from '@/lib/supabase/server';

// setu_guru_feedback is a new table — not yet in generated types. Use loose typing.
type AnyRow = Record<string, unknown>;
type AnyQuery = PromiseLike<{ data: AnyRow | AnyRow[] | null; count?: number | null; error?: unknown }> & {
  select: (cols: string, opts?: { count?: 'exact'; head?: boolean }) => AnyQuery;
  insert: (row: AnyRow) => AnyQuery;
  eq: (col: string, val: unknown) => AnyQuery;
  order: (col: string, opts?: { ascending?: boolean }) => AnyQuery;
  limit: (n: number) => AnyQuery;
  single: () => Promise<{ data: AnyRow | null; error?: unknown }>;
};
type AnyDB = { from: (table: string) => AnyQuery };

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
  try {
    const db = (await createClient()) as unknown as AnyDB;
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

    if (error) return { ok: false };
    const row = data as AnyRow | null;
    return { id: typeof row?.id === 'string' ? row.id : undefined, ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getFeedbackSummary(organizationId: string): Promise<{ helpful: number; missing: number; recent: SetuGuruFeedbackRow[] }> {
  try {
    const db = (await createClient()) as unknown as AnyDB;
    const { data } = await db
      .from('setu_guru_feedback')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50);

    const rows = (Array.isArray(data) ? data : []) as SetuGuruFeedbackRow[];
    return {
      helpful: rows.filter((r) => r.label === 'helpful').length,
      missing: rows.filter((r) => r.label === 'missing').length,
      recent: rows.slice(0, 10),
    };
  } catch {
    return { helpful: 0, missing: 0, recent: [] };
  }
}
