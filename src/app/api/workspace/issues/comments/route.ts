import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SETU_FLOW_ORG_ID } from '@/lib/queries/workspace';
import { notifySmc, resolveMentionUserIds } from '@/lib/notifications/smc-notify';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.issue_id || !body.body?.trim()) {
    return NextResponse.json({ error: 'issue_id and body required' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  const { data, error } = await (supabase as any)
    .from('issue_comments')
    .insert({
      issue_id: body.issue_id,
      organization_id: SETU_FLOW_ORG_ID,
      author_name: body.author_name ?? 'Ritesh Kapoor',
      author_type: body.author_type ?? 'human',
      author_model: body.author_model ?? null,
      body: body.body,
      body_type: body.body_type ?? 'plain',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify @mentioned teammates (in-app + push). Best-effort.
  try {
    const mentioned = await resolveMentionUserIds(String(body.body ?? ''));
    if (mentioned.length) {
      await notifySmc({
        userIds: mentioned,
        title: `${body.author_name ?? 'Someone'} mentioned you`,
        body: String(body.body).slice(0, 140),
        actionUrl: '/smc/issues',
        type: 'smc_mention',
        priority: 'high',
        entityRef: body.issue_id,
      });
    }
  } catch { /* mention notify is best-effort */ }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const issueId = searchParams.get('issue_id');
  const counts = searchParams.get('counts') === '1';

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  if (counts) {
    const { data, error } = await (supabase as any)
      .from('issue_comments')
      .select('issue_id')
      .eq('organization_id', SETU_FLOW_ORG_ID);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const grouped = (data ?? []).reduce((acc: Record<string, number>, row: { issue_id: string }) => {
      if (row.issue_id) acc[row.issue_id] = (acc[row.issue_id] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json(grouped);
  }

  if (!issueId) return NextResponse.json({ error: 'issue_id required' }, { status: 400 });

  const { data, error } = await (supabase as any)
    .from('issue_comments')
    .select('*')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
