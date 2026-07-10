import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIcpProfile, saveIcpProfile } from '@/lib/setu-guru/icp';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const IcpProfileSchema = z.object({
  name: z.string().max(120).optional(),
  products: z.array(z.string().max(160)).max(50).optional(),
  target_countries: z.array(z.string().max(120)).max(50).optional(),
  buyer_types: z.array(z.string().max(80)).max(20).optional(),
  supplier_types: z.array(z.string().max(80)).max(20).optional(),
  moq_rules: z.record(z.unknown()).optional(),
  certifications: z.record(z.unknown()).optional(),
  preferred_currency: z.string().max(10).nullish(),
  outreach_style: z.string().max(200).nullish(),
  available_documents: z.array(z.string().max(120)).max(50).optional(),
  required_documents: z.array(z.string().max(120)).max(50).optional(),
  outreach_channel: z.enum(['whatsapp', 'email', 'linkedin']).nullish(),
  outreach_tone: z.enum(['short', 'warm', 'professional', 'trade_show_follow_up']).nullish(),
});

export async function GET() {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  try {
    const profile = await getIcpProfile(organizationId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[setu-guru-icp] read failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not load the ICP profile.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = IcpProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid ICP profile payload.', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const profile = await saveIcpProfile(organizationId, parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[setu-guru-icp] save failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not save the ICP profile.' }, { status: 500 });
  }
}
