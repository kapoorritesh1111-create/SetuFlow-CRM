import { createClient } from '@/lib/supabase/server';

/** Latest sprint number from sprint_meta. Returns null when none exist — no hardcoded fallback. */
export async function getCurrentSprint(): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('sprint_meta')
    .select('sprint_number')
    .order('sprint_number', { ascending: false })
    .limit(1);
  return (data?.[0]?.sprint_number as number | undefined) ?? null;
}
