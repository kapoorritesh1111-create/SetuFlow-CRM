import { PublicRsvp } from '@/features/calendar/components/public-rsvp';

export const dynamic = 'force-dynamic';

export default function CalendarRsvpPage({ params, searchParams }: { params: { token: string }; searchParams?: { response?: string } }) {
  return <PublicRsvp token={params.token} suggestedResponse={searchParams?.response} />;
}
