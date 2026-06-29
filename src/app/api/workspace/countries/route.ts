import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.membership || !workspace.organization) {
    return NextResponse.json({ countries: [] }, { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('countries')
    .select('id, name, iso2_code')
    .eq('organization_id', workspace.organization.id)
    .order('name');

  if (error) {
    return NextResponse.json({ countries: [] }, { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } });
  }

  return NextResponse.json(
    { countries: data ?? [] },
    { status: 200, headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' } },
  );
}
