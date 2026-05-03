import { MobileBusinessCardScanner } from '@/features/mobile/components/mobile-business-card-scanner';

export default function MobileCapturePage({
  searchParams,
}: {
  searchParams?: { sourceType?: string | string[]; eventId?: string | string[] };
}) {
  const readParam = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? '' : value ?? '';
  const sourceType = readParam(searchParams?.sourceType).trim();
  const eventId = readParam(searchParams?.eventId).trim();
  return <MobileBusinessCardScanner initialLeadType={sourceType === 'supplier' ? 'supplier' : 'buyer'} eventId={eventId || null} />;
}
