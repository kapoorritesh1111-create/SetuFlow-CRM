import { NextRequest, NextResponse } from 'next/server';
import { buildVCard, getVCardFilename } from '@/lib/contact-exchange/vcard';
import { getPublicCardByShareSlug } from '@/lib/contact-exchange/my-card-settings';
import { parsePublicCardSearchParams } from '@/lib/contact-exchange/public-card';

export async function GET(request: NextRequest) {
  const share = request.nextUrl.searchParams.get('share');
  const sharedCard = share ? await getPublicCardByShareSlug(share) : null;
  const identity = sharedCard?.identity ?? parsePublicCardSearchParams(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const vcard = buildVCard({
    fullName: identity.fullName,
    email: identity.email,
    organizationName: identity.organizationName,
    roleLabel: identity.roleLabel,
    previewPath: null,
    avatarUrl: identity.avatarUrl,
    primaryPhone: identity.primaryPhone,
    secondaryPhone: identity.secondaryPhone,
    website: identity.website,
    address: identity.address,
  });

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      'Content-Type': 'text/x-vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${getVCardFilename({ fullName: identity.fullName })}"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
