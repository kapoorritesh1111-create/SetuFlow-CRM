import { createClient } from '@/lib/supabase/server';

export type SupplierComparisonRow = {
  leadId: string;
  label: string;
  country: string | null;
  documentCompleteness: number; // 0-100, based on documents on file vs required
  openRfqCount: number;
  respondedRfqCount: number;
  responseQuality: 'responsive' | 'slow' | 'no_data';
  compositeScore: number;
};

/**
 * Compares suppliers on criteria Setu Flow actually stores: document
 * completeness, RFQ responsiveness, and location. Price and lead time are not
 * currently captured as structured fields on suppliers/RFQs, so they are
 * intentionally left out rather than estimated or invented.
 */
export async function compareSuppliers(orgId: string, limit = 10): Promise<SupplierComparisonRow[]> {
  const supabase = await createClient();
  const client = supabase as any;

  const { data: suppliers, error } = await client
    .from('leads')
    .select('id,company_name,contact_name,country')
    .eq('organization_id', orgId)
    .eq('lead_type', 'supplier')
    .limit(200);

  if (error) throw error;
  if (!suppliers?.length) return [];

  const supplierIds = suppliers.map((supplier: any) => supplier.id);

  const [{ data: documents }, { data: rfqs }] = await Promise.all([
    client.from('documents').select('id,related_id').eq('organization_id', orgId).eq('related_entity', 'lead').in('related_id', supplierIds).limit(2000),
    client.from('rfqs').select('id,lead_id,status,updated_at').eq('organization_id', orgId).in('lead_id', supplierIds).limit(2000),
  ]);

  const docCountByLead = new Map<string, number>();
  for (const document of documents ?? []) {
    docCountByLead.set(document.related_id, (docCountByLead.get(document.related_id) ?? 0) + 1);
  }

  const rfqsByLead = new Map<string, any[]>();
  for (const rfq of rfqs ?? []) {
    rfqsByLead.set(rfq.lead_id, [...(rfqsByLead.get(rfq.lead_id) ?? []), rfq]);
  }

  const rows: SupplierComparisonRow[] = suppliers.map((supplier: any) => {
    const docCount = docCountByLead.get(supplier.id) ?? 0;
    const documentCompleteness = Math.min(100, docCount * 25);
    const supplierRfqs = rfqsByLead.get(supplier.id) ?? [];
    const respondedRfqCount = supplierRfqs.filter((rfq: any) => ['completed', 'closed', 'approved'].includes(String(rfq.status ?? '').toLowerCase())).length;
    const openRfqCount = supplierRfqs.length - respondedRfqCount;

    let responseQuality: SupplierComparisonRow['responseQuality'] = 'no_data';
    if (supplierRfqs.length > 0) {
      responseQuality = respondedRfqCount / supplierRfqs.length >= 0.5 ? 'responsive' : 'slow';
    }

    const compositeScore = Math.round(
      documentCompleteness * 0.5 + (responseQuality === 'responsive' ? 40 : responseQuality === 'slow' ? 15 : 0) + (supplierRfqs.length ? 10 : 0),
    );

    return {
      leadId: supplier.id,
      label: supplier.company_name || supplier.contact_name || 'Untitled supplier',
      country: supplier.country,
      documentCompleteness,
      openRfqCount,
      respondedRfqCount,
      responseQuality,
      compositeScore: Math.min(100, compositeScore),
    };
  });

  return rows.sort((a, b) => b.compositeScore - a.compositeScore).slice(0, limit);
}
