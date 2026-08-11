import { NextResponse } from 'next/server';
import { fetchInteraktContacts } from '@/features/integrations/interakt/client';

export const dynamic = 'force-dynamic';

const EXPECTED_BRANCH = 'agent/interakt-stark-intake-spike';

export async function GET() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const isExpectedBranch = process.env.VERCEL_GIT_COMMIT_REF === EXPECTED_BRANCH;

  if (!isPreview || !isExpectedBranch) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  try {
    const result = await fetchInteraktContacts({ offset: 0, limit: 5 });
    const first = result.contacts[0] ?? null;

    return NextResponse.json({
      ok: true,
      provider: 'interakt',
      fetchedCount: result.contacts.length,
      hasNextPage: result.hasNextPage,
      apiKeyConfigured: true,
      responseShape: {
        hasExternalContactId: Boolean(first?.externalContactId),
        hasPhoneNumber: Boolean(first?.fullPhoneNumber ?? first?.phoneNumber),
        hasName: Boolean(first?.contactName),
        hasEmail: Boolean(first?.email),
        hasTraits: Boolean(first && Object.keys(first.traits).length > 0),
        hasSourceCreatedAt: Boolean(first?.sourceCreatedAt),
        hasSourceModifiedAt: Boolean(first?.sourceModifiedAt),
        hasSourceCreatedVia: Boolean(first?.sourceCreatedVia),
        hasWhatsAppOptIn: typeof first?.whatsappOptedIn === 'boolean',
      },
      databaseWrite: false,
      leadsWrite: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Interakt API error.';
    return NextResponse.json({
      ok: false,
      provider: 'interakt',
      apiKeyConfigured: !message.includes('INTERAKT_STARK_PACKMATE_API_KEY is not configured'),
      error: message,
      databaseWrite: false,
      leadsWrite: false,
    }, { status: 502 });
  }
}
