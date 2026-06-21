import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { callGuruJson, parseGuruJson } from '@/lib/catalog-share/guru';
import { buildCatalogGuruContext } from '@/lib/catalog-share/guru-context';

export const dynamic = 'force-dynamic';

type Draft = { subject: string; email: string; whatsapp: string };

// POST /api/catalog-shares/guru/draft-message -> personalized share message draft
export async function POST(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const sb = (await createClient()) as any;
  const context = await buildCatalogGuruContext(sb, {
    orgId: ws.organization.id,
    leadId: b.lead_id ?? null,
    productIds: Array.isArray(b.product_ids) ? b.product_ids.map(String).filter(Boolean) : [],
    priceListId: b.price_list_id ?? null,
    candidateLimit: 80,
  });

  const buyerName = b.buyer_name || '';
  const company = b.buyer_company || String(context.lead?.company_name ?? 'your team');
  const contextProductNames = context.selected_products.map((product) => String(product.name ?? '')).filter(Boolean);
  const products: string[] = contextProductNames.length ? contextProductNames : (Array.isArray(b.product_names) ? b.product_names : []);
  const productLine = products.slice(0, 3).join(', ') + (products.length > 3 ? ` and ${products.length - 3} more` : '');
  const currency = b.currency || String(context.price_list?.currency ?? 'USD');
  const incoterm = b.incoterm || String(context.price_list?.incoterm ?? '');
  const expiry = `${b.valid_days || 7} days`;
  const event = b.trade_show_name || String(context.lead?.trade_show_name ?? '');

  const sys = 'You are Setu Guru, an export sales assistant. Draft a personalized catalog share message from rich catalog context. Keep the email professional, 4-6 sentences. WhatsApp: 2-3 sentences with one or two emojis. Mention relevant product strengths, price-list context if present, and link validity. Both must include the literal placeholder [LINK] where the secure link goes. Return ONLY JSON: {"subject":"...","email":"...","whatsapp":"..."}.';
  const payload = {
    buyerName,
    company,
    products,
    currency,
    incoterm,
    linkValidity: expiry,
    event,
    priceList: context.price_list,
    selectedProducts: context.selected_products.map((product) => ({ name: product.name, origin: product.country_of_origin, certifications: product.certifications, readiness: product.readiness_status, missing: product.readiness_missing })),
    gaps: context.gaps,
  };
  const guru = await callGuruJson(sys, payload);

  if (guru.ok) {
    const parsed = parseGuruJson<Draft>(guru.text);
    if (parsed?.email && parsed?.whatsapp) {
      return NextResponse.json({ draft: { subject: parsed.subject || 'Your curated product catalog', email: parsed.email, whatsapp: parsed.whatsapp }, fallback: false });
    }
  }

  // Deterministic fallback template
  const greeting = buyerName ? ` ${buyerName}` : '';
  const draft: Draft = {
    subject: 'Your curated product catalog',
    email: `Hi${greeting},\n\nThank you for your interest${event ? ` following ${event}` : ''}. I've put together a curated catalog for ${company} featuring ${productLine}. Pricing is shown in ${currency}${incoterm ? ` (${incoterm})` : ''}.\n\nYou can view everything via the secure link below, valid for ${expiry}.\n\n[LINK]\n\nHappy to answer questions or prepare a formal quote.\n\nBest regards`,
    whatsapp: `Hi${greeting}! 👋 Sharing our curated catalog for ${company} (${products.length} products, prices in ${currency}). Secure link, valid ${expiry}: [LINK]`,
  };
  return NextResponse.json({ draft, fallback: true });
}
