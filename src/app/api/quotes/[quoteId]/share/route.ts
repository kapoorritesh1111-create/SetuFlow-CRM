import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';

const PRODUCTION_SHARE_ORIGIN = 'https://www.setuflowcrm.com';

type ShareSummary = {
  quoteId: string;
  quoteNumber: string;
  buyerName: string;
  products: string;
  total: string;
  validity: string;
  currency: string;
};

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Shared quote validity applies';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function readQuoteSummary(quoteId: string, fromLink: ShareSummary) {
  if (!hasSupabaseEnv) return fromLink;
  try {
    const db = (await createClient()) as any;
    const { data: quote } = await db
      .from('quotes')
      .select('id, quote_number, lead_id, currency, display_currency, valid_until, current_version_id, accepted_version_id')
      .eq('id', quoteId)
      .maybeSingle();
    if (!quote?.id) return fromLink;

    const versionId = quote.accepted_version_id ?? quote.current_version_id;
    const [{ data: lead }, { data: version }, { data: lines }] = await Promise.all([
      quote.lead_id ? db.from('leads').select('company_name, contact_name').eq('id', quote.lead_id).maybeSingle() : Promise.resolve({ data: null }),
      versionId ? db.from('quote_versions').select('display_currency, valid_until, total_line_count').eq('id', versionId).maybeSingle() : Promise.resolve({ data: null }),
      versionId ? db.from('quote_version_line_items').select('product_name, final_case_price, final_kg_price, final_unit_price').eq('quote_version_id', versionId).order('sort_order', { ascending: true }).limit(8) : Promise.resolve({ data: [] }),
    ]);

    const currency = String(version?.display_currency ?? quote.display_currency ?? quote.currency ?? fromLink.currency ?? 'USD').toUpperCase();
    const lineItems = Array.isArray(lines) ? lines : [];
    const totalAmount = lineItems.reduce((sum: number, line: any) => sum + Number(line.final_case_price ?? line.final_kg_price ?? line.final_unit_price ?? 0), 0);
    const products = lineItems.map((line: any) => line.product_name).filter(Boolean).slice(0, 4).join(', ');
    return {
      quoteId,
      quoteNumber: quote.quote_number ?? fromLink.quoteNumber,
      buyerName: lead?.contact_name ?? lead?.company_name ?? fromLink.buyerName,
      products: products || fromLink.products || `${version?.total_line_count ?? 0} line items`,
      total: totalAmount > 0 ? money(totalAmount, currency) : fromLink.total,
      validity: formatDate(version?.valid_until ?? quote.valid_until) || fromLink.validity,
      currency,
    } satisfies ShareSummary;
  } catch {
    return fromLink;
  }
}

function renderSharePage(summary: ShareSummary) {
  const quoteId = escapeHtml(summary.quoteId);
  const quoteNumber = escapeHtml(summary.quoteNumber || quoteId.slice(0, 8));
  const buyerName = escapeHtml(summary.buyerName || 'there');
  const products = escapeHtml(summary.products || 'Quote products');
  const total = escapeHtml(summary.total || 'Confirmed in quote');
  const validity = escapeHtml(summary.validity || 'Confirmed in quote');
  const pdfHref = `${PRODUCTION_SHARE_ORIGIN}/api/quotes/${quoteId}/pdf`;
  const reviseHref = `mailto:help@setugroups.com?subject=${encodeURIComponent(`Quote ${summary.quoteNumber || summary.quoteId} question`)}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Quote ${quoteNumber} | SETU Groups LLC</title>
  <style>
    :root { color-scheme: light; --navy: #0b2e4a; --blue: #1d4ed8; --slate: #475569; --line: #d8e1ec; --soft: #f8fafc; --green: #047857; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(180deg, #eef6ff 0%, #ffffff 46%); color: #0f172a; }
    .shell { max-width: 920px; margin: 0 auto; padding: 38px 18px 54px; }
    .card { background: rgba(255,255,255,.96); border: 1px solid var(--line); border-radius: 28px; box-shadow: 0 24px 70px rgba(15,23,42,.12); overflow: hidden; }
    .top { display: flex; gap: 18px; align-items: center; justify-content: space-between; padding: 22px 26px; border-bottom: 1px solid var(--line); }
    .brand { display: flex; gap: 14px; align-items: center; }
    .logo { width: 54px; height: 54px; border-radius: 16px; background: var(--navy); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
    .eyebrow { color: var(--blue); font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 4px 0 2px; font-size: clamp(25px, 4vw, 38px); color: var(--navy); line-height: 1.08; }
    .sub { color: var(--slate); margin: 0; }
    .pill { padding: 10px 14px; border: 1px solid var(--line); border-radius: 999px; font-weight: 800; color: var(--navy); background: var(--soft); white-space: nowrap; }
    .body { padding: 28px 26px 30px; }
    .hello { font-size: 18px; color: var(--slate); margin: 0 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin: 22px 0 26px; }
    .metric { border: 1px solid var(--line); border-radius: 20px; padding: 16px; background: var(--soft); min-height: 100px; }
    .metric span { display:block; color: var(--slate); font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .metric strong { display:block; margin-top: 10px; font-size: 17px; line-height: 1.35; color: #0f172a; }
    .metric.total strong { color: var(--green); font-size: 21px; }
    .cta { display:flex; gap: 12px; flex-wrap: wrap; align-items: center; padding-top: 8px; }
    .button { display:inline-flex; align-items:center; justify-content:center; min-height: 46px; border-radius: 15px; padding: 0 18px; text-decoration: none; font-weight: 800; }
    .primary { background: var(--navy); color: #fff; }
    .secondary { border: 1px solid var(--line); color: var(--navy); background: #fff; }
    .note { margin-top: 20px; color: var(--slate); font-size: 14px; line-height: 1.7; border-top: 1px solid var(--line); padding-top: 18px; }
    .footer { padding: 18px 26px; background: var(--soft); color: var(--slate); display:flex; justify-content:space-between; gap: 12px; flex-wrap: wrap; font-size: 13px; }
    @media (max-width: 760px) { .top { align-items:flex-start; flex-direction: column; } .grid { grid-template-columns: 1fr; } .pill { white-space: normal; } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card" aria-label="SETU Flow quote share">
      <header class="top">
        <div class="brand"><div class="logo">SETU</div><div><div class="eyebrow">SETU Groups LLC</div><h1>Quote ${quoteNumber}</h1><p class="sub">Buyer-ready quote summary from SETU Flow</p></div></div>
        <div class="pill">Secure quote share</div>
      </header>
      <div class="body">
        <p class="hello">Hello ${buyerName}, please review the quote summary below. Reply to the sender if you would like changes or have questions.</p>
        <div class="grid">
          <div class="metric"><span>Products</span><strong>${products}</strong></div>
          <div class="metric total"><span>Total</span><strong>${total}</strong></div>
          <div class="metric"><span>Validity</span><strong>${validity}</strong></div>
          <div class="metric"><span>Quote ID</span><strong>${quoteNumber}</strong></div>
        </div>
        <div class="cta">
          <a class="button primary" href="${pdfHref}">Open quote PDF</a>
          <a class="button secondary" href="${reviseHref}">Request a revision</a>
        </div>
        <p class="note">This page is a professional quote share summary. Pricing, taxes, duties, Incoterms, validity, and product details remain subject to the latest approved quote PDF and agreed terms.</p>
      </div>
      <footer class="footer"><span>www.setuflowcrm.com</span><span>SETU Flow quote workflow</span></footer>
    </section>
  </main>
</body>
</html>`;
}

export async function GET(request: Request, { params }: { params: { quoteId: string } }) {
  const requestUrl = new URL(request.url);
  const fromLink: ShareSummary = {
    quoteId: params.quoteId,
    quoteNumber: requestUrl.searchParams.get('quote') || params.quoteId.slice(0, 8),
    buyerName: requestUrl.searchParams.get('buyer') || 'there',
    products: requestUrl.searchParams.get('products') || 'Quote products',
    total: requestUrl.searchParams.get('total') || 'Confirmed in quote',
    validity: requestUrl.searchParams.get('validity') || 'Shared quote validity applies',
    currency: requestUrl.searchParams.get('currency') || 'USD',
  };
  const summary = await readQuoteSummary(params.quoteId, fromLink);
  return new Response(renderSharePage(summary), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
