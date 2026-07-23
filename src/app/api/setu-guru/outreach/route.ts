import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateOutreachDraft } from '@/lib/setu-guru/outreach-generator';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const DraftRequestSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(['whatsapp', 'email', 'linkedin']),
  goal: z.enum(['send_catalog', 'book_meeting', 'follow_up_quote', 'request_supplier_pricing']),
  tone: z.enum(['short', 'warm', 'professional', 'trade_show_follow_up']),
});

export async function POST(request: NextRequest) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = DraftRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid outreach draft request.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const draft = await generateOutreachDraft(organizationId, {
      leadId: parsed.data.leadId,
      channel: parsed.data.channel,
      goal: parsed.data.goal,
      tone: parsed.data.tone,
      senderName: workspace.profile?.full_name ?? null,
    });

    if (!draft) {
      return NextResponse.json({ error: 'Record not found in the active organization.' }, { status: 404 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('[setu-guru-outreach] generate failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not draft this message.' }, { status: 500 });
  }
}
