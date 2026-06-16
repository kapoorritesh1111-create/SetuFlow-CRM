import type { Metadata } from 'next';
import { ProfessionalDigitalCard } from '@/components/contact-exchange/professional-digital-card';
import { PublicCardCaptureForm } from '@/components/contact-exchange/public-card-capture-form';
import { getPublicCardByShareSlug } from '@/lib/contact-exchange/my-card-settings';
import { buildPublicCardSearchParams, parsePublicCardSearchParams } from '@/lib/contact-exchange/public-card';

type SearchParams = Record<string, string | string[] | undefined>;

function getFirstParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function isShareSafeImage(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  const lower = trimmed.toLowerCase();
  return (lower.startsWith('http://') || lower.startsWith('https://') || trimmed.startsWith('/')) && trimmed.length < 1000;
}

function buildTradeShowContext(tradeShowName?: string | null, boothNumber?: string | null) {
  const show = String(tradeShowName ?? '').trim();
  const booth = String(boothNumber ?? '').trim();
  if (!show) return null;
  return `Met at ${show}${booth ? `, Booth ${booth}` : ''}`;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const share = getFirstParam(searchParams, 'share');
  const sharedCard = share ? await getPublicCardByShareSlug(share) : null;
  const identity = sharedCard?.identity ?? parsePublicCardSearchParams(searchParams);
  const title = `${identity.fullName} · ${identity.organizationName}`;
  const eventContext = buildTradeShowContext(identity.tradeShowName, identity.boothNumber);
  const description = `Save ${identity.fullName}'s digital vCard, request a quote, or book an appointment.${eventContext ? ` ${eventContext}.` : ''}`;
  const image = isShareSafeImage(identity.avatarUrl) ? identity.avatarUrl! : '/marketing/setuflow-vcard-og.svg';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function PublicCardPage({ searchParams }: { searchParams: SearchParams }) {
  const share = getFirstParam(searchParams, 'share');
  const sharedCard = share ? await getPublicCardByShareSlug(share) : null;
  const identity = sharedCard?.identity ?? parsePublicCardSearchParams(searchParams);
  const compactParams = buildPublicCardSearchParams(identity);
  const saveContactHref = share
    ? `/api/public/card-vcf?share=${encodeURIComponent(share)}`
    : `/api/public/card-vcf?${compactParams.toString()}`;
  const publicCardPath = share ? `/card?share=${encodeURIComponent(share)}` : `/card?${compactParams.toString()}`;
  const appleWalletHref = `/api/public/apple-wallet?url=${encodeURIComponent(publicCardPath)}&name=${encodeURIComponent(identity.fullName)}`;
  const googleWalletHref = `/api/public/google-wallet?url=${encodeURIComponent(publicCardPath)}&name=${encodeURIComponent(identity.fullName)}`;
  const source = getFirstParam(searchParams, 'src') || getFirstParam(searchParams, 'source') || '';
  const analyticsPath = `/api/public/card-analytics?event=view${share ? `&share=${encodeURIComponent(share)}` : ''}${source ? `&src=${encodeURIComponent(source)}` : ''}`;
  const eventContext = buildTradeShowContext(identity.tradeShowName, identity.boothNumber);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f4f5f7_45%,#ffffff_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-4">
          {eventContext ? (
            <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-sm font-semibold text-emerald-900 shadow-sm">
              {eventContext}. Save this card so you remember the booth conversation.
            </div>
          ) : null}
          <ProfessionalDigitalCard
            identity={identity}
            mode="public"
            saveContactHref={saveContactHref}
            primaryActionHref={identity.quoteUrl?.trim() || '#request-quote'}
            primaryActionLabel="Request quote"
            secondaryActionHref={identity.bookingUrl?.trim() || '#book-appointment'}
            secondaryActionLabel="Book appointment"
            appleWalletHref={appleWalletHref}
            googleWalletHref={googleWalletHref}
          />
        </div>
        <PublicCardCaptureForm identity={identity} />
      </div>
      {/* Lightweight view tracking. The endpoint is best-effort and never blocks the public card. */}
      <img src={analyticsPath} alt="" width={1} height={1} className="sr-only" />
    </div>
  );
}
