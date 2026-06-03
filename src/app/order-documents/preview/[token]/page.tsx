import { notFound, redirect } from 'next/navigation';
import { hasSupabaseEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function OrderDocumentPreviewPage({ params }: { params: Promise<{ token: string }> | { token: string } }) {
  if (!hasSupabaseEnv) notFound();
  const resolvedParams = await params;
  const token = String(resolvedParams.token ?? '').trim();
  if (!token) notFound();
  redirect(`/order-documents/preview/${encodeURIComponent(token)}/pdf`);
}
