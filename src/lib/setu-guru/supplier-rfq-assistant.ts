import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';

export type SupplierRfqBrief = {
  leadId: string;
  supplierLabel: string;
  product: string | null;
  moqNote: string | null;
  requiredCertifications: string[];
  responseDeadline: string;
  briefText: string;
  missingItems: string[];
};

const RESPONSE_WINDOW_DAYS = 7;

/**
 * Composes a plain-language RFQ brief from stored supplier and ICP fields only.
 * This never creates or submits an RFQ record — the user takes the brief into
 * the existing supplier RFQ / cost-request flow themselves.
 */
export async function generateSupplierRfqBrief(orgId: string, leadId: string): Promise<SupplierRfqBrief | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const [{ data: lead, error }, icp] = await Promise.all([
    client
      .from('leads')
      .select('id,company_name,contact_name,country,products_or_needs,lead_type')
      .eq('organization_id', orgId)
      .eq('id', leadId)
      .eq('lead_type', 'supplier')
      .maybeSingle(),
    getIcpProfile(orgId),
  ]);

  if (error) throw error;
  if (!lead) return null;

  const supplierLabel = lead.company_name || lead.contact_name || 'This supplier';
  const product = lead.products_or_needs || (icp?.products?.length ? icp.products[0] : null);
  const moqNote = typeof icp?.moq_rules?.note === 'string' ? (icp.moq_rules.note as string) : null;
  const requiredCertifications = icp?.required_documents ?? [];

  const missingItems: string[] = [];
  if (!product) missingItems.push('No product or sourcing need recorded for this supplier');
  if (!moqNote) missingItems.push('No MOQ or pricing rule recorded in your ICP profile');
  if (!requiredCertifications.length) missingItems.push('No required certifications configured in your ICP profile');

  const deadline = new Date(Date.now() + RESPONSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const responseDeadline = deadline.toISOString().slice(0, 10);

  const lines = [
    `RFQ brief for ${supplierLabel}${lead.country ? ` (${lead.country})` : ''}`,
    '',
    `Product / sourcing need: ${product || 'Not recorded yet — confirm with the supplier before sending.'}`,
    moqNote ? `MOQ / pricing note: ${moqNote}` : 'MOQ / pricing note: Not configured in your ICP profile.',
    requiredCertifications.length
      ? `Required certifications: ${requiredCertifications.join(', ')}`
      : 'Required certifications: None configured — confirm compliance requirements before sending.',
    `Requested response by: ${responseDeadline}`,
  ];

  return {
    leadId: lead.id,
    supplierLabel,
    product,
    moqNote,
    requiredCertifications,
    responseDeadline,
    briefText: lines.join('\n'),
    missingItems,
  };
}
