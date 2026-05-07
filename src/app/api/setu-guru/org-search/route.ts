import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getProductsData } from '@/lib/queries/products';
import { hasSupabaseEnv } from '@/lib/env';

function asText(value: unknown) {
  return String(value ?? '').trim();
}

function questionMode(question: string) {
  const q = question.toLowerCase();
  if (q.includes('buyer')) return 'buyers';
  if (q.includes('supplier')) return 'suppliers';
  if (q.includes('category')) return 'categories';
  if (q.includes('hsn') || q.includes('hs code') || q.includes('hs-code')) return 'hsn';
  if (q.includes('lead') || q.includes('contact') || q.includes('company')) return 'leads';
  return 'catalog';
}

function isPureCountQuestion(question: string) {
  const q = question.toLowerCase();
  return /how many|count|total/.test(q) && !/named|called|find|search|filter|missing/.test(q);
}

function extractSearchTerm(question: string, mode: string) {
  if (isPureCountQuestion(question)) return '';
  const filler = ['how many', 'count', 'total', 'show me', 'find', 'search', 'filter', 'buyer', 'buyers', 'supplier', 'suppliers', 'lead', 'leads', 'product', 'products', 'catalog', 'category', 'categories', 'named', 'called', 'by name', 'in my', 'my', 'are in', 'there are', 'missing', 'hsn', 'hs code', 'hs-code', mode];
  let cleaned = question.toLowerCase();
  for (const word of filler) cleaned = cleaned.replaceAll(word, ' ');
  cleaned = cleaned.replace(/[^a-z0-9\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length >= 2 ? cleaned : '';
}

function includesTerm(row: Record<string, unknown>, term: string) {
  if (!term) return true;
  const haystack = Object.values(row).map((value) => String(value ?? '').toLowerCase()).join(' ');
  return haystack.includes(term.toLowerCase());
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
    const organizationName = workspace.organization.name ?? 'this organization';
    const mode = asText(body.mode) || questionMode(question);
    const term = asText(body.term) || extractSearchTerm(question, mode);

    if (mode === 'catalog' || mode === 'products' || mode === 'hsn' || mode === 'categories') {
      const workspaceData = await getProductsData(organizationId);
      const products = workspaceData?.products ?? [];
      const categories = workspaceData?.categories ?? [];
      const categoryNameById = new Map(categories.map((category: any) => [category.id, category.name]));
      const visibleProducts = products.filter((product: any) => product.is_active !== false);
      const missingHsnProducts = visibleProducts.filter((product: any) => !asText(product.hsn_code));
      const sourceProducts = mode === 'hsn' ? missingHsnProducts : visibleProducts;
      const matchedProducts = term ? sourceProducts.filter((product: any) => includesTerm({ name: product.name, sku: product.sku, sku_code: product.sku_code, hsn_code: product.hsn_code, category: categoryNameById.get(product.category_id) }, term)) : sourceProducts;
      const rows = matchedProducts.slice(0, 8).map((product: any) => ({ id: product.id, name: product.name, sku: product.sku ?? product.sku_code ?? null, hsnCode: product.hsn_code ?? null, category: categoryNameById.get(product.category_id) ?? null }));

      const answer = mode === 'hsn'
        ? `I found ${missingHsnProducts.length} catalog product(s) missing HSN/HS codes in ${organizationName}. I listed ${rows.length} row(s) for review.`
        : term
          ? `I found ${matchedProducts.length} matching catalog product(s) for "${term}" in ${organizationName}. There are ${visibleProducts.length} catalog product(s) total.`
          : `You have ${visibleProducts.length} catalog product(s) in ${organizationName}. I did not apply any search filter.`;

      return NextResponse.json({ answer, confidence: 'high', mode, term, rows, metrics: { catalogProducts: visibleProducts.length, categories: categories.length, missingHsnCount: missingHsnProducts.length }, nextAction: mode === 'hsn' ? 'Open Products filtered to missing HSN codes.' : 'Open Products to review the catalog.', actionHref: mode === 'hsn' ? '/products?guru=missing-hsn' : '/products' });
    }

    const supabase = await createClient();
    const db = supabase as any;

    if (mode === 'buyers' || mode === 'suppliers' || mode === 'leads') {
      let countQuery = db.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
      if (mode === 'buyers') countQuery = countQuery.eq('lead_type', 'buyer');
      if (mode === 'suppliers') countQuery = countQuery.eq('lead_type', 'supplier');
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      let query = db.from('leads').select('id, company_name, contact_name, email, phone, lead_type, country, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(8);
      if (mode === 'buyers') query = query.eq('lead_type', 'buyer');
      if (mode === 'suppliers') query = query.eq('lead_type', 'supplier');
      if (term) query = query.or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%,country.ilike.%${term}%`);

      const { data: leads, error } = await query;
      if (error) throw error;
      const rows = (leads ?? []).map((lead: any) => ({ id: lead.id, company: lead.company_name, contact: lead.contact_name, email: lead.email, phone: lead.phone, type: lead.lead_type, country: lead.country }));
      const label = mode === 'buyers' ? 'buyer' : mode === 'suppliers' ? 'supplier' : 'lead';
      return NextResponse.json({ answer: term ? `I found ${rows.length} matching ${label} record(s) for "${term}" in ${organizationName}. There are ${count ?? 0} ${label} record(s) total.` : `${organizationName} has ${count ?? 0} ${label} record(s). I listed the latest ${rows.length}.`, confidence: 'high', mode, term, rows, metrics: { count: count ?? 0 }, nextAction: mode === 'buyers' ? 'Open Leads in Buyers mode.' : mode === 'suppliers' ? 'Open Leads in Suppliers mode.' : 'Open Leads to filter or edit records.', actionHref: mode === 'buyers' ? '/leads?mode=buyers' : mode === 'suppliers' ? '/leads?mode=suppliers' : '/leads' });
    }

    return NextResponse.json({ answer: 'I can search live products, HSN gaps, buyers, suppliers, and leads. Try “how many products are in my catalog?” or “find buyer by name”.', confidence: 'medium', rows: [] });
  } catch (error) {
    return NextResponse.json({ answer: error instanceof Error ? error.message : 'Setu Guru organization search failed.', confidence: 'low', rows: [] }, { status: 500 });
  }
}
