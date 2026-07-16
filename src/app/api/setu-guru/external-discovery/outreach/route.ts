import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveOutreachDraft } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const OutreachSchema = z.object({
  opportunityId: z.string().uuid(),
  channel: z.enum(['email', 'whatsapp', 'linkedin', 'call']),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(4000),
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

  const parsed = OutreachSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid outreach draft payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const draft = await saveOutreachDraft(orgId, parsed.data.opportunityId, {
      channel: parsed.data.channel,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
    });
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error('[external-discovery-outreach] draft failed', {
      orgId,
      opportunityId: parsed.data.opportunityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Outreach draft could not be saved.' },
      { status: 500 },
    );
  }
}
