import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { archiveIcpProfile, getIcpProfile, listIcpProfiles, saveIcpProfile } from '@/lib/setu-guru/icp';
import { isPackagingOrganization } from '@/lib/verticals/capability';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const OwnerTypeSchema = z.enum(['organization', 'personal', 'campaign']);
const StringList = z.array(z.string().trim().min(1).max(160)).max(80);

const PackagingVerticalProfileSchema = z.object({
  vertical: z.literal('packaging').optional(),
  packaging_families: StringList.optional(),
  end_use_sectors: StringList.optional(),
  materials: StringList.optional(),
  print_methods: StringList.optional(),
  quantity_bands: StringList.optional(),
  artwork_states: StringList.optional(),
  sustainability_needs: StringList.optional(),
  regulated_uses: StringList.optional(),
  services: StringList.optional(),
  lead_time_priorities: StringList.optional(),
}).passthrough();

const IcpProfileSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().max(120).optional(),
  owner_type: OwnerTypeSchema.optional(),
  campaign_key: z.string().max(120).nullish(),
  products: StringList.optional(),
  target_countries: StringList.optional(),
  buyer_types: StringList.optional(),
  supplier_types: StringList.optional(),
  moq_rules: z.record(z.unknown()).optional(),
  certifications: z.record(z.unknown()).optional(),
  preferred_currency: z.string().max(10).nullish(),
  outreach_style: z.string().max(200).nullish(),
  available_documents: StringList.optional(),
  required_documents: StringList.optional(),
  outreach_channel: z.enum(['whatsapp', 'email', 'linkedin']).nullish(),
  outreach_tone: z.enum(['short', 'warm', 'professional', 'trade_show_follow_up']).nullish(),
  vertical_profile: PackagingVerticalProfileSchema.optional(),
});

async function workspaceContext() {
  const workspace = await requireWorkspace();
  const orgId = workspace.organization?.id ?? null;
  return { orgId, packagingEnabled: orgId ? await isPackagingOrganization(orgId) : false };
}

export async function GET(request: NextRequest) {
  const { orgId, packagingEnabled } = await workspaceContext();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  try {
    const profileId = request.nextUrl.searchParams.get('profile_id');
    const [profiles, profile] = await Promise.all([listIcpProfiles(orgId), getIcpProfile(orgId, profileId)]);
    return NextResponse.json({ profile, profiles, verticalKey: packagingEnabled ? 'packaging' : null, packagingEnabled });
  } catch (error) {
    console.error('[setu-guru-icp] read failed', { orgId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Setu Guru could not load ICP profiles.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { orgId, packagingEnabled } = await workspaceContext();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  const parsed = IcpProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid ICP profile payload.', details: parsed.error.flatten() }, { status: 422 });
  try {
    const verticalProfile = parsed.data.vertical_profile ?? {};
    const profile = await saveIcpProfile(orgId, {
      ...parsed.data,
      vertical_profile: packagingEnabled ? { ...verticalProfile, vertical: 'packaging' } : verticalProfile,
    });
    const profiles = await listIcpProfiles(orgId);
    return NextResponse.json({ profile, profiles, verticalKey: packagingEnabled ? 'packaging' : null, packagingEnabled });
  } catch (error) {
    console.error('[setu-guru-icp] save failed', { orgId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Setu Guru could not save the ICP profile.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { orgId } = await workspaceContext();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  const profileId = request.nextUrl.searchParams.get('profile_id');
  if (!profileId || !z.string().uuid().safeParse(profileId).success) return NextResponse.json({ error: 'A valid profile_id is required.' }, { status: 422 });
  try {
    await archiveIcpProfile(orgId, profileId);
    return NextResponse.json({ profiles: await listIcpProfiles(orgId) });
  } catch (error) {
    console.error('[setu-guru-icp] archive failed', { orgId, profileId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Setu Guru could not archive the ICP profile.' }, { status: 500 });
  }
}
