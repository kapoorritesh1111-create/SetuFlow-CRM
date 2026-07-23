import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

// S48-GROWTH-010: draft-only outreach for CRM Matches, reusing the same communications draft
// pattern as External Discovery. Always writes status='draft' — nothing is sent automatically.
const OutreachSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(['email', 'whatsapp', 'linkedin', 'call']),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(4000),
});

const CHANNEL_MAP: Record<string, string> = { email: 'email', whatsapp: 'whatsapp', linkedin: 'linkedin', call: 'phone' };

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = OutreachSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid outreach draft payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  try {
    const { data: lead, error: leadError } = await client
      .from('leads')
      .select('id,company_name')
      .eq('organization_id', orgId)
      .eq('id', parsed.data.leadId)
      .single();
    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead was not found in this organization.' }, { status: 404 });
    }

    const { data: draft, error } = await client
      .from('communications')
      .insert({
        organization_id: orgId,
        lead_id: lead.id,
        related_entity: 'lead',
        related_id: lead.id,
        communication_type: 'follow_up',
        direction: 'outbound',
        channel: CHANNEL_MAP[parsed.data.channel],
        subject: parsed.data.subject ?? null,
        body: parsed.data.body,
        draft_source: 'ai',
        status: 'draft',
        created_by: user.id,
      })
      .select('id,channel,status,subject,body,created_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error('[crm-matches-outreach] draft failed', {
      orgId,
      leadId: parsed.data.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Outreach draft could not be saved.' }, { status: 500 });
  }
}
