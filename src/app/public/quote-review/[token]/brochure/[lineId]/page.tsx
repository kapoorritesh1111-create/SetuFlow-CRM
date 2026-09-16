import { notFound, redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function QuoteBrochurePage({ params }: { params: { token: string; lineId: string } }) {
  const admin = createAdminSupabaseClient() as any;
  if (!admin) notFound();
  const token = String(params.token || '').trim();
  const lineId = String(params.lineId || '').trim();

  const { data: quotes } = await admin
    .from('quotes')
    .select('id,organization_id')
    .contains('industry_metadata', { customer_review_token: token })
    .limit(1);
  const quote = quotes?.[0];
  if (!quote?.id) notFound();

  const { data: line } = await admin
    .from('quote_line_items')
    .select('id,packaging_family_id')
    .eq('id', lineId)
    .eq('quote_id', quote.id)
    .maybeSingle();
  if (!line?.id || !line.packaging_family_id) notFound();

  const { data: mapping } = await admin
    .from('catalog_brochure_families')
    .select('brochure_id')
    .eq('packaging_family_id', line.packaging_family_id)
    .limit(1)
    .maybeSingle();
  if (!mapping?.brochure_id) notFound();

  const { data: brochure } = await admin
    .from('catalog_brochures')
    .select('id,organization_id,storage_bucket,storage_path,is_active')
    .eq('id', mapping.brochure_id)
    .eq('organization_id', quote.organization_id)
    .eq('is_active', true)
    .maybeSingle();
  if (!brochure?.storage_bucket || !brochure?.storage_path) notFound();

  const { data: signed, error } = await admin.storage
    .from(brochure.storage_bucket)
    .createSignedUrl(brochure.storage_path, 60 * 30);
  if (error || !signed?.signedUrl) notFound();

  redirect(signed.signedUrl);
}
