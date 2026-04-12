import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LoginRouteRedirect({ searchParams }: { searchParams?: { next?: string } }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '';
  redirect(next ? `/client-login?next=${encodeURIComponent(next)}` : '/client-login');
}
