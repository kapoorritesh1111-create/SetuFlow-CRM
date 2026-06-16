import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SETU_ORG_ID = '3327b9a7-aadb-44b0-9793-30c4045d3c92';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '1000');

    const { data, error } = await supabase
      .from('sprint_issues')
      .select('*')
      .eq('organization_id', SETU_ORG_ID)
      .order('sprint_number', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ issues: data ?? [] });
  } catch (err) {
    console.error('SMC issues error:', err);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}
