import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SETU_FLOW_ORG_ID } from '@/lib/queries/workspace';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();

  // Auto-manage resolved_at
  if (body.status !== undefined) {
    const nowResolved = body.status === 'Resolved' || body.status === "Won't Fix";
    const admin = createAdminSupabaseClient();
    const supabase = admin ?? await createClient();

    const { data: current } = await (supabase as any)
      .from('sprint_issues')
      .select('resolved_at')
      .eq('id', id)
      .maybeSingle();

    if (nowResolved && !current?.resolved_at) {
      body.resolved_at = new Date().toISOString();
    } else if (!nowResolved) {
      body.resolved_at = null;
    }
    body.updated_at = new Date().toISOString();
  }

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  const { data, error } = await (supabase as any)
    .from('sprint_issues')
    .update(body)
    .eq('id', id)
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/workspace', 'layout');
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  const { error } = await (supabase as any)
    .from('sprint_issues')
    .update({ status: "Won't Fix", updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', SETU_FLOW_ORG_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/workspace', 'layout');
  return NextResponse.json({ success: true });
}
