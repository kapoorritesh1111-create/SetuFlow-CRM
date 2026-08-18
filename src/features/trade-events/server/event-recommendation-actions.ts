'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export async function saveTradeEventRecommendationFeedback(formData: FormData) {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return;
  const catalogEventId = String(formData.get('catalog_event_id') ?? '').trim();
  const feedback = String(formData.get('feedback') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim() || null;
  if (!catalogEventId || !['saved', 'not_relevant'].includes(feedback)) return;
  const db: any = await createClient();
  await db.from('trade_event_recommendation_feedback').upsert({ organization_id: workspace.organization.id, catalog_event_id: catalogEventId, feedback, reason, created_by: workspace.user.id, updated_at: new Date().toISOString() }, { onConflict: 'organization_id,catalog_event_id' });
  revalidatePath('/trade-events');
}
