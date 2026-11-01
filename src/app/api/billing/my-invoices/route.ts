import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
const failure = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

// Billing is only visible to the current organization's active members.
// Keep this endpoint read-only; payment initiation must have owner/admin authorization.
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organization_id');
  if (!organizationId || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(organizationId)) return failure('Invalid organization', 400);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return failure('Unauthorized', 401);
  const { data: member, error: memberError } = await (supabase as any).from('organization_members')
    .select('id').eq('organization_id', organizationId).eq('user_id', user.id)
    .eq('is_active', true).maybeSingle();
  if (memberError || !member) return failure('Forbidden', 403);
  const db = createServiceRoleClient();
  if (!db) return failure('Billing unavailable', 503);
  const { data: invoices, error } = await db.from('smc_subscription_invoices')
    .select('id,invoice_number,plan_name,currency,period_start,period_end,due_date,total,status,created_at')
    .eq('organization_id', organizationId).neq('status', 'draft').order('created_at', { ascending: false }).limit(100);
  if (error) return failure('Could not read invoices', 500);
  const ids = (invoices ?? []).map(i => i.id);
  const { data: payments, error: payError } = ids.length
    ? await db.from('smc_invoice_payments').select('id,invoice_id,amount_minor,currency,status,created_at')
      .eq('organization_id', organizationId).in('invoice_id', ids).eq('status', 'succeeded')
    : { data: [], error: null };
  if (payError) return failure('Payment history unavailable', 503);
  const result = (invoices ?? []).map(invoice => {
    const currency = String(invoice.currency).toUpperCase();
    const factor = ['JPY', 'KRW'].includes(currency) ? 1 : 100;
    const totalMinor = Math.round(Number(invoice.total) * factor);
    const paidMinor = (payments ?? []).filter(p => p.invoice_id === invoice.id && p.currency === currency)
      .reduce((sum, p) => sum + Number(p.amount_minor), 0);
    return { ...invoice, total_minor: totalMinor, paid_minor: paidMinor, balance_minor: Math.max(0, totalMinor - paidMinor) };
  });
  return NextResponse.json({ invoices: result }, { headers: { 'Cache-Control': 'private, no-store' } });
}
