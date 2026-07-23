import { createClient } from '@/lib/supabase/server';

export type SetuGuruRecommendation = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  recommendation_type: string;
  title: string;
  summary: string | null;
  reason: string;
  recommended_action: string;
  action_href: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'completed' | 'dismissed' | 'expired';
  created_at: string;
  updated_at: string;
};

export type GrowthCenterRecommendations = {
  open: SetuGuruRecommendation[];
  history: SetuGuruRecommendation[];
};

const RECOMMENDATION_COLUMNS = [
  'id',
  'entity_type',
  'entity_id',
  'recommendation_type',
  'title',
  'summary',
  'reason',
  'recommended_action',
  'action_href',
  'priority',
  'status',
  'created_at',
  'updated_at',
].join(',');

export async function getGrowthCenterRecommendations(orgId: string): Promise<GrowthCenterRecommendations> {
  const supabase = await createClient();
  const client = supabase as any;

  const [openResult, historyResult] = await Promise.all([
    client
      .from('ai_recommendations')
      .select(RECOMMENDATION_COLUMNS)
      .eq('org_id', orgId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50),
    client
      .from('ai_recommendations')
      .select(RECOMMENDATION_COLUMNS)
      .eq('org_id', orgId)
      .in('status', ['completed', 'dismissed', 'expired'])
      .order('updated_at', { ascending: false })
      .limit(8),
  ]);

  if (openResult.error) throw openResult.error;
  if (historyResult.error) throw historyResult.error;

  return {
    open: (openResult.data ?? []) as SetuGuruRecommendation[],
    history: (historyResult.data ?? []) as SetuGuruRecommendation[],
  };
}
