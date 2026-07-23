import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listTopFitOpportunities } from '@/lib/setu-guru/opportunity-finder';
import { scheduleLeadFollowUp } from '@/lib/setu-guru/crm-matches-actions';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  action: z.enum(['assign', 'tag', 'follow_up', 'archive', 'rescore']),
  leadIds: z.array(z.string().uuid()).min(1).max(200),
  ownerUserId: z.string().uuid().optional(),
  tag: z.string().trim().min(1).max(80).optional(),
  dueAt: z.string().min(8).optional(),
  profileId: z.string().uuid().optional(),
});

function canAssign(roles: string[]) {
  return roles.some((role) => ['owner', 'admin', 'manager'].includes(String(role).toLowerCase()));
}

export async function POST(request: NextRequest) {
  const workspace = await requireWorkspace();
  const orgId = workspace.organization?.id;
  const userId = workspace.user?.id;
  if (!orgId || !userId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid bulk action payload.', details: parsed.error.flatten() }, { status: 422 });
  const { action, leadIds } = parsed.data;
  const supabase = await createClient();
  const client = supabase as any;

  try {
    const { data: leads, error: leadsError } = await client
      .from('leads')
      .select('id,company_name,contact_name,industry_metadata')
      .eq('organization_id', orgId)
      .in('id', leadIds);
    if (leadsError) throw leadsError;
    if ((leads ?? []).length !== leadIds.length) return NextResponse.json({ error: 'One or more selected records are not accessible.' }, { status: 403 });

    if (action === 'assign') {
      if (!parsed.data.ownerUserId || !canAssign(workspace.currentRoles ?? [])) return NextResponse.json({ error: 'Manager permission and a valid owner are required.' }, { status: 403 });
      const { data: member } = await client.from('organization_members').select('user_id').eq('organization_id', orgId).eq('user_id', parsed.data.ownerUserId).eq('is_active', true).maybeSingle();
      if (!member?.user_id) return NextResponse.json({ error: 'The selected owner is not an active organization member.' }, { status: 422 });
      const { error } = await client.from('leads').update({ owner_user_id: parsed.data.ownerUserId, updated_by: userId }).eq('organization_id', orgId).in('id', leadIds);
      if (error) throw error;
    }

    if (action === 'tag' || action === 'archive') {
      for (const lead of leads ?? []) {
        const metadata: Record<string, unknown> = lead.industry_metadata && typeof lead.industry_metadata === 'object' ? { ...lead.industry_metadata } : {};
        if (action === 'tag') {
          if (!parsed.data.tag) return NextResponse.json({ error: 'A tag is required.' }, { status: 422 });
          const tags = Array.isArray(metadata.crm_match_tags) ? metadata.crm_match_tags.map(String) : [];
          metadata.crm_match_tags = Array.from(new Set([...tags, parsed.data.tag]));
        } else {
          metadata.crm_match_archived_at = new Date().toISOString();
          metadata.crm_match_archived_by = userId;
        }
        const { error } = await client.from('leads').update({ industry_metadata: metadata, updated_by: userId }).eq('organization_id', orgId).eq('id', lead.id);
        if (error) throw error;
      }
    }

    if (action === 'follow_up') {
      if (!parsed.data.dueAt) return NextResponse.json({ error: 'A follow-up date is required.' }, { status: 422 });
      const dueAt = new Date(parsed.data.dueAt);
      if (Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: 'The follow-up date is invalid.' }, { status: 422 });
      for (const lead of leads ?? []) await scheduleLeadFollowUp(orgId, lead.id, dueAt.toISOString(), 'Scheduled from CRM Matches bulk action.');
    }

    if (action === 'rescore') {
      const result = await listTopFitOpportunities(orgId, 1000, parsed.data.profileId ?? null);
      const scores = result.opportunities.filter((item) => leadIds.includes(item.leadId)).map((item) => ({ leadId: item.leadId, score: item.fitScore.score }));
      return NextResponse.json({ updated: scores.length, scores });
    }

    await client.from('lead_activities').insert((leads ?? []).map((lead: any) => ({
      organization_id: orgId,
      lead_id: lead.id,
      actor_user_id: userId,
      kind: `crm_match_bulk_${action}`,
      message: `CRM Matches bulk action “${action}” applied with explicit operator approval.`,
      occurred_at: new Date().toISOString(),
    })));

    return NextResponse.json({ updated: leadIds.length, action });
  } catch (error) {
    console.error('[crm-matches-bulk] action failed', { orgId, action, count: leadIds.length, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'The bulk action could not be completed.' }, { status: 500 });
  }
}
