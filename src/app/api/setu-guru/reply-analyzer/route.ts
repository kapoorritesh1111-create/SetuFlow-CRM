import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { analyzeReply, getLeadContextForReply } from '@/lib/setu-guru/reply-analyzer';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const ReplyAnalyzerSchema = z.object({
  leadId: z.string().uuid(),
  replyText: z.string().min(2).max(6000),
});

export async function POST(request: NextRequest) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = ReplyAnalyzerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reply analyzer request.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const context = await getLeadContextForReply(organizationId, parsed.data.leadId);
    if (!context) {
      return NextResponse.json({ error: 'Lead not found in the active organization.' }, { status: 404 });
    }

    const analysis = await analyzeReply({
      replyText: parsed.data.replyText,
      leadLabel: context.label,
      leadCountry: context.country,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[setu-guru-reply-analyzer] failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not analyze this reply.' }, { status: 500 });
  }
}
