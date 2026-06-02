import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SETU_FLOW_ORG_ID } from '@/lib/queries/workspace';

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
  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const issueId = searchParams.get('issue_id');
  if (!issueId) return NextResponse.json({ error: 'issue_id required' }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  const { data, error } = await (supabase as any)
    .from('issue_comments')
    .select('*')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
