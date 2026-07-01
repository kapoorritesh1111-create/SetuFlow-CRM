import { redirect } from 'next/navigation';

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AnalyticsRedirect({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const next = first(value);
    if (next) params.set(key, next);
  }
  const query = params.toString();
  redirect(`/dashboard/analytics${query ? `?${query}` : ''}`);
}
