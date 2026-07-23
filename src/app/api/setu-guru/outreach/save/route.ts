import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveOutreachDraftAsActivity } from '@/lib/setu-guru/outreach-activity';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const SaveDraftSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(['whatsapp', 'email', 'linkedin']),
  goal: z.enum(['send_catalog', 'book_meeting', 'follow_up_quote', 'request_supplier_pricing']),
  tone: z.enum(['short', 'warm', 'professional', 'trade_show_follow_up']),
  subject: z.string().max(300).nullable(),
  body: z.string().min(1).max(8000),
  productsReferenced: z.array(z.string().max(160)).max(20),
  usedFacts: z.array(z.string().max(300)).max(20),
});

export async function POST(request: NextRequest) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = SaveDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid draft payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const saved = await saveOutreachDraftAsActivity(organizationId, {
      leadId: parsed.data.leadId,
      channel: parsed.data.channel,
      goal: parsed.data.goal,
      tone: parsed.data.tone,
      subject: parsed.data.subject,
      body: parsed.data.body,
      productsReferenced: parsed.data.productsReferenced,
      usedFacts: parsed.data.usedFacts,
    });

    return NextResponse.json({ saved });
  } catch (error) {
    console.error('[setu-guru-outreach] save failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not save this draft.' }, { status: 500 });
  }
}
