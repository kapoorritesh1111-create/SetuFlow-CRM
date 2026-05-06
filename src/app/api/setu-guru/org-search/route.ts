import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';

function asText(value: unknown) {
  return String(value ?? '').trim();
}

function questionMode(question: string) {
  const q = question.toLowerCase();
  if (q.includes('buyer')) return 'buyers';
  if (q.includes('supplier')) return 'suppliers';
  if (q.includes('category')) return 'categories';
  if (q.includes('hsn') || q.includes('hs code') || q.includes('hs code')) return 'hsn';
  if (q.includes('lead') || q.includes('contact') || q.includes('company')) return 'leads';
  return 'catalog';
}

function extractSearchTerm(question: string) {
  const cleaned = question
    .replace(/how many|count|show me|find|search|filter|buyer|buyers|supplier|suppliers|lead|leads|product|products|catalog|category|categories|named|called|by name|in my|are in|there are|\?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 2 ? cleaned : '';
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ answer: 'Setu Guru cannot read live organization data because Supabase environment variables are missing.', confidence: 'low', rows: [] }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const question = asText(body.question);
    if (!question) {
      return NextResponse.json({ answer: 'Ask a catalog, product, buyer, supplier, or lead question.', confidence: 'low', rows: [] }, { status: 400 });
    }

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) {
      return NextResponse.json({ answer: 'Please sign in to Setu Flow before asking Setu Guru to search organization data.', confidence: 'low', rows: [] }, { status: 401 });
    }

    const organizationId = workspace.organization.id;
    const supabase = await createClient();
    const db = supabase as any;
    const mode = asText(body.mode) || questionMode(question);
    const term = asText(body.term) || extractSearchTerm(question);

    if (mode === 'catalog' || mode === 'products' || mode === 'hsn') {
      const { count: totalProducts, error: countError } = await db
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      if (countError) throw countError;

      const { count: missingHsnCount } = await db
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .or('hsn_code.is.null,hsn_code.eq.');

      let query = db
        .from('products')
        .select('id, name, sku, sku_code, hsn_code, category_id, is_active, product_categories(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(8);

      if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,sku_code.ilike.%${term}%,hsn_code.ilike.%${term}%`);
      if (mode === 'hsn') query = query.or('hsn_code.is.null,hsn_code.eq.');

      const { data: products, error } = await query;
      if (error) throw error;

      const rows = (products ?? []).map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku ?? product.sku_code ?? null,
        hsnCode: product.hsn_code ?? null,
        category: product.product_categories?.name ?? null,
      }));

      const answer = mode === 'hsn'
        ? `I found ${missingHsnCount ?? 0} active product(s) missing HSN/HS codes in ${workspace.organization.name}. I listed the first ${rows.length} for review.`
        : `You have ${totalProducts ?? 0} active product(s) in ${workspace.organization.name}. ${term ? `I found ${rows.length} matching product(s) for "${term}".` : `I listed the first ${rows.length} alphabetically.`}`;

      return NextResponse.json({ answer, confidence: 'high', mode, term, rows, metrics: { totalProducts: totalProducts ?? 0, missingHsnCount: missingHsnCount ?? 0 }, nextAction: mode === 'hsn' ? 'Review missing-code rows before enrichment or write-back.' : 'Open Products to apply page filters or edit rows.' });
    }

    if (mode === 'buyers' || mode === 'suppliers' || mode === 'leads') {
      let countQuery = db.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
      if (mode === 'buyers') countQuery = countQuery.eq('lead_type', 'buyer');
      if (mode === 'suppliers') countQuery = countQuery.eq('lead_type', 'supplier');
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      let query = db
        .from('leads')
        .select('id, company_name, contact_name, email, phone, lead_type, country, updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(8);
      if (mode === 'buyers') query = query.eq('lead_type', 'buyer');
      if (mode === 'suppliers') query = query.eq('lead_type', 'supplier');
      if (term) query = query.or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%,country.ilike.%${term}%`);

      const { data: leads, error } = await query;
      if (error) throw error;

      const rows = (leads ?? []).map((lead: any) => ({
        id: lead.id,
        company: lead.company_name,
        contact: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        type: lead.lead_type,
        country: lead.country,
      }));

      return NextResponse.json({
        answer: `${workspace.organization.name} has ${count ?? 0} ${mode === 'buyers' ? 'buyer' : mode === 'suppliers' ? 'supplier' : 'lead'} record(s). ${term ? `I found ${rows.length} matching record(s) for "${term}".` : `I listed the latest ${rows.length}.`}`,
        confidence: 'high',
        mode,
        term,
        rows,
        metrics: { count: count ?? 0 },
        nextAction: mode === 'buyers' ? 'Open Leads in Buyers mode to work this list.' : mode === 'suppliers' ? 'Open Leads in Suppliers mode to work this list.' : 'Open Leads to filter or edit records.',
      });
    }

    return NextResponse.json({ answer: 'I can search live products, HSN gaps, buyers, suppliers, and leads. Try asking “how many products are in my catalog?” or “find buyer by name”.', confidence: 'medium', rows: [] });
  } catch (error) {
    return NextResponse.json({ answer: error instanceof Error ? error.message : 'Setu Guru organization search failed.', confidence: 'low', rows: [] }, { status: 500 });
  }
}
