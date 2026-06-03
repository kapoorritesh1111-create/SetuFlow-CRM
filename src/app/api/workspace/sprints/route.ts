import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SETU_FLOW_ORG_ID } from '@/lib/queries/workspace';

export async function GET() {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data, error } = await (supabase as any)
    .from('sprint_meta')
    .select('*')
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .order('sprint_number', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.sprint_name?.trim()) {
    return NextResponse.json({ error: 'Sprint name is required' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  const payload = {
    organization_id: SETU_FLOW_ORG_ID,
    sprint_number: body.sprint_number,
    sprint_name: body.sprint_name.trim(),
    goal: body.goal?.trim() || null,
    started_at: body.started_at || null,
    closed_at: body.closed_at || null,
    capacity_points: null,
    retro_notes: null,
  };

  const { data, error } = await (supabase as any)
    .from('sprint_meta')
    .insert([payload])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/workspace', 'layout');
  return NextResponse.json(data, { status: 201 });
}
