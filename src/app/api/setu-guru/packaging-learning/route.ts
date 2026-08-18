import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { isPackagingOrganization } from '@/lib/verticals/capability';

export const dynamic = 'force-dynamic';

const FeedbackSchema = z.object({
  recommendationId: z.string().uuid(),
  entityType: z.string().min(1).max(80),
  entityId: z.string().uuid().nullish(),
  recommendationType: z.string().startsWith('packaging_').max(120),
  feedback: z.enum(['helpful', 'not_helpful', 'false_positive', 'completed_elsewhere']),
  reason: z.string().max(1000).nullish(),
});

async function context() {
  const workspace = await requireWorkspace(); const orgId = workspace.organization?.id ?? null;
  const supabase = await createClient(); const client = supabase as any;
  if (!orgId || !(await isPackagingOrganization(orgId, client))) return { orgId: null, client, userId: workspace.profile?.id ?? null };
  return { orgId, client, userId: workspace.profile?.id ?? null };
}

export async function GET() {
  const { orgId, client } = await context();
  if (!orgId) return NextResponse.json({ error: 'Packaging workspace required.' }, { status: 403 });
  const [{ data: metrics, error: metricsError }, { data: recent, error: recentError }] = await Promise.all([
    client.from('packaging_intelligence_learning_metrics_v').select('*').eq('organization_id', orgId).order('total_recommendations', { ascending: false }),
    client.from('packaging_intelligence_feedback').select('id,recommendation_type,feedback,reason,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20),
  ]);
  if (metricsError) throw metricsError; if (recentError) throw recentError;
  const totals = (metrics ?? []).reduce((sum: any, row: any) => ({
    generated: sum.generated + Number(row.total_recommendations ?? 0), open: sum.open + Number(row.open_count ?? 0), completed: sum.completed + Number(row.completed_count ?? 0),
    helpful: sum.helpful + Number(row.helpful_count ?? 0), falsePositive: sum.falsePositive + Number(row.false_positive_count ?? 0),
  }), { generated: 0, open: 0, completed: 0, helpful: 0, falsePositive: 0 });
  return NextResponse.json({ metrics: metrics ?? [], recentFeedback: recent ?? [], totals });
}

export async function POST(request: NextRequest) {
  const parsed = FeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Packaging feedback.', details: parsed.error.flatten() }, { status: 422 });
  const { orgId, client, userId } = await context();
  if (!orgId) return NextResponse.json({ error: 'Packaging workspace required.' }, { status: 403 });
  const { data: recommendation } = await client.from('ai_recommendations').select('id,entity_type,entity_id,recommendation_type').eq('org_id', orgId).eq('id', parsed.data.recommendationId).maybeSingle();
  if (!recommendation || recommendation.recommendation_type !== parsed.data.recommendationType) return NextResponse.json({ error: 'Packaging recommendation not found.' }, { status: 404 });
  const { data, error } = await client.from('packaging_intelligence_feedback').insert({
    organization_id: orgId, recommendation_id: recommendation.id, entity_type: parsed.data.entityType,
    entity_id: parsed.data.entityId ?? recommendation.entity_id ?? null, recommendation_type: parsed.data.recommendationType,
    feedback: parsed.data.feedback, reason: parsed.data.reason ?? null, metadata: { source: 'growth_center' }, created_by: userId,
  }).select('id,feedback,created_at').single();
  if (error) throw error;
  await client.from('packaging_intelligence_events').insert({ organization_id: orgId, recommendation_id: recommendation.id, recommendation_type: recommendation.recommendation_type, entity_type: recommendation.entity_type, entity_id: recommendation.entity_id, event_type: 'feedback', metadata: { feedback: parsed.data.feedback }, actor_user_id: userId });
  return NextResponse.json({ feedback: data });
}
