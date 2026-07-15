import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { archiveIcpProfile, getIcpProfile, listIcpProfiles, saveIcpProfile } from '@/lib/setu-guru/icp';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const IcpProfileSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().max(120).optional(),
  owner_type: z.enum(['organization', 'personal', 'campaign']).optional(),
  campaign_key: z.string().max(120).nullish(),
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

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function GET(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  try {
    const profileId = request.nextUrl.searchParams.get('profile_id');
    const [profiles, profile] = await Promise.all([
      listIcpProfiles(orgId),
      getIcpProfile(orgId, profileId),
    ]);
    return NextResponse.json({ profile, profiles });
  } catch (error) {
    console.error('[setu-guru-icp] read failed', { orgId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Setu Guru could not load ICP profiles.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  const parsed = IcpProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid ICP profile payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const profile = await saveIcpProfile(orgId, parsed.data);
    const profiles = await listIcpProfiles(orgId);
    return NextResponse.json({ profile, profiles });
  } catch (error) {
    console.error('[setu-guru-icp] save failed', { orgId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Setu Guru could not save the ICP profile.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  const profileId = request.nextUrl.searchParams.get('profile_id');
  if (!profileId || !z.string().uuid().safeParse(profileId).success) {
    return NextResponse.json({ error: 'A valid profile_id is required.' }, { status: 422 });
  }

  try {
    await archiveIcpProfile(orgId, profileId);
    const profiles = await listIcpProfiles(orgId);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('[setu-guru-icp] archive failed', { orgId, profileId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Setu Guru could not archive the ICP profile.' }, { status: 500 });
  }
}
