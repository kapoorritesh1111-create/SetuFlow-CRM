import { ProfessionalDigitalCard } from '@/components/contact-exchange/professional-digital-card';
import { PublicCardCaptureForm } from '@/components/contact-exchange/public-card-capture-form';
import { getPublicCardByShareSlug } from '@/lib/contact-exchange/my-card-settings';
import { parsePublicCardSearchParams } from '@/lib/contact-exchange/public-card';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PublicCardPage({ searchParams }: { searchParams: SearchParams }) {
  const share = Array.isArray(searchParams.share) ? searchParams.share[0] : searchParams.share;
  const sharedCard = share ? await getPublicCardByShareSlug(share) : null;
  const identity = sharedCard?.identity ?? parsePublicCardSearchParams(searchParams);
  const saveContactHref = share ? `/api/public/card-vcf?share=${encodeURIComponent(share)}` : `/api/public/card-vcf?${new URLSearchParams(Object.entries(searchParams).flatMap(([k,v]) => v ? [[k, Array.isArray(v) ? v[0] : v]] : [])).toString()}`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f4f5f7_45%,#ffffff_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[0.82fr_1.18fr]">
        <ProfessionalDigitalCard
          identity={identity}
          mode="public"
          saveContactHref={saveContactHref}
          primaryActionHref="#request-quote"
          primaryActionLabel="Request quote"
          secondaryActionHref="#book-appointment"
          secondaryActionLabel="Book appointment"
        />
        <PublicCardCaptureForm identity={identity} />
      </div>
    </div>
  );
}
