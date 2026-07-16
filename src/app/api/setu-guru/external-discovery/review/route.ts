import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const ReviewSchema = z.object({
  opportunityId: z.string().uuid(),
  action: z.enum(['start_review', 'dismiss', 'approve', 'prepare_outreach']),
  note: z.string().trim().max(1000).optional(),
});

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = ReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review action.', details: parsed.error.flatten() }, { status: 422 });
  }

  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const { data: opportunity, error: readError } = await client
      .from('external_opportunities')
      .select('id,company_name,review_status,source_label,source_url,verification_state,duplicate_state,matched_lead_id')
      .eq('org_id', orgId)
      .eq('id', parsed.data.opportunityId)
      .single();

    if (readError || !opportunity) {
      return NextResponse.json({ error: 'External opportunity was not found.' }, { status: 404 });
    }

    const nextStatus = {
      start_review: 'reviewing',
      dismiss: 'dismissed',
      approve: 'approved',
      prepare_outreach: 'reviewing',
    }[parsed.data.action];

    const { data: updated, error: updateError } = await client
      .from('external_opportunities')
      .update({ review_status: nextStatus, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', parsed.data.opportunityId)
      .select('id,review_status,updated_at')
      .single();

    if (updateError) throw updateError;

    const details = {
      previous_status: opportunity.review_status,
      next_status: nextStatus,
      note: parsed.data.note ?? null,
      source_label: opportunity.source_label,
      source_url: opportunity.source_url,
      verification_state: opportunity.verification_state,
      duplicate_state: opportunity.duplicate_state,
      matched_lead_id: opportunity.matched_lead_id,
      human_approval_required: parsed.data.action === 'approve' || parsed.data.action === 'prepare_outreach',
    };

    const { error: historyError } = await client.from('external_opportunity_history').insert({
      org_id: orgId,
      opportunity_id: parsed.data.opportunityId,
      action: parsed.data.action,
      details,
      actor_user_id: user?.id ?? null,
    });

    if (historyError) throw historyError;

    return NextResponse.json({ opportunity: updated, action: parsed.data.action });
  } catch (error) {
    console.error('[external-discovery-review] action failed', {
      orgId,
      opportunityId: parsed.data.opportunityId,
      action: parsed.data.action,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'External opportunity review could not be updated.' }, { status: 500 });
  }
}
