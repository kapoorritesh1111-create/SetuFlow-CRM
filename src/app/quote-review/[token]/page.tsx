import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function money(value: unknown, currency: string) {
  const amount = Number(value ?? 0);
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency || ''} ${amount.toFixed(2)}`.trim(); }
}

function label(value: unknown) {
  return String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function PublicQuoteReviewPage({ params }: { params: { token: string } }) {
  const token = String(params.token || '').trim();
  if (!token || token.length < 32) notFound();
  const admin = createAdminSupabaseClient() as any;
  if (!admin) notFound();

  const { data: quotes, error: quoteError } = await admin
    .from('quotes')
    .select('id,organization_id,lead_id,quote_number,status,currency,display_currency,valid_until,notes_customer,industry_metadata')
    .contains('industry_metadata', { customer_review_token: token })
    .limit(1);
  if (quoteError || !quotes?.[0]) notFound();
  const quote = quotes[0];

  const [{ data: lead }, { data: lines }] = await Promise.all([
    admin.from('leads').select('company_name,contact_name').eq('id', quote.lead_id).eq('organization_id', quote.organization_id).maybeSingle(),
    admin.from('quote_line_items').select('id,line_type,product_id,quantity,unit_price,currency,notes,input_snapshot_json,packaging_family_id,packaging_product_variation_id,packaging_kld_file_id').eq('quote_id', quote.id).order('created_at'),
  ]);

  const productIds = (lines ?? []).map((l: any) => l.product_id).filter(Boolean);
  const familyIds = (lines ?? []).map((l: any) => l.packaging_family_id).filter(Boolean);
  const variationIds = (lines ?? []).map((l: any) => l.packaging_product_variation_id).filter(Boolean);
  const kldIds = (lines ?? []).map((l: any) => l.packaging_kld_file_id).filter(Boolean);

  const [{ data: products }, { data: families }, { data: variations }, { data: klds }] = await Promise.all([
    productIds.length ? admin.from('products').select('id,name,description,image_url,brand_name,pack_size').in('id', productIds) : Promise.resolve({ data: [] }),
    familyIds.length ? admin.from('packaging_service_families').select('id,name,description').in('id', familyIds) : Promise.resolve({ data: [] }),
    variationIds.length ? admin.from('packaging_product_variations').select('id,name,capacity_label,dimension_label,width_mm,height_mm,bottom_gusset_each_mm').in('id', variationIds) : Promise.resolve({ data: [] }),
    kldIds.length ? admin.from('packaging_kld_files').select('id,file_name,public_token,spec_key').in('id', kldIds) : Promise.resolve({ data: [] }),
  ]);

  const byProduct = new Map<string, any>((products ?? []).map((r: any) => [String(r.id), r]));
  const byFamily = new Map<string, any>((families ?? []).map((r: any) => [String(r.id), r]));
  const byVariation = new Map<string, any>((variations ?? []).map((r: any) => [String(r.id), r]));
  const byKld = new Map<string, any>((klds ?? []).map((r: any) => [String(r.id), r]));
  const currency = quote.display_currency || quote.currency || 'INR';
  const total = (lines ?? []).reduce((sum: number, line: any) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Stark Packmate</p>
              <h1 className="mt-2 text-3xl font-black">Your Packaging Quote Package</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-300">Everything you need to review before design proceeds: commercial quote, sample KLD and requested product reference.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-300">Quote</div>
              <div className="text-lg font-black">{quote.quote_number || 'Current quote'}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Customer</div><div className="mt-1 font-black">{lead?.company_name || 'Customer'}</div><div className="text-sm text-slate-500">{lead?.contact_name || ''}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Quote total</div><div className="mt-1 text-xl font-black text-emerald-700">{money(total, currency)}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Valid until</div><div className="mt-1 font-black">{quote.valid_until ? new Date(`${quote.valid_until}T00:00:00`).toLocaleDateString() : 'As stated in quote'}</div><div className="text-sm text-slate-500">Status: {label(quote.status)}</div></div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">01 · Commercial Quote</p><h2 className="mt-1 text-xl font-black">Requested packaging</h2></div>
          <div className="space-y-4">
            {(lines ?? []).map((line: any, index: number) => {
              const snapshot = line.input_snapshot_json ?? {};
              const input = snapshot.input ?? {};
              const product = line.product_id ? byProduct.get(String(line.product_id)) : null;
              const family = line.packaging_family_id ? byFamily.get(String(line.packaging_family_id)) : null;
              const variation = line.packaging_product_variation_id ? byVariation.get(String(line.packaging_product_variation_id)) : null;
              const kld = line.packaging_kld_file_id ? byKld.get(String(line.packaging_kld_file_id)) : null;
              const name = product?.name || variation?.name || family?.name || line.notes || `Packaging item ${index + 1}`;
              const lineTotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
              return (
                <article key={line.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black">{name}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{snapshot.spec_summary || line.notes || family?.description || product?.description || 'Packaging specification as quoted.'}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                        {variation?.capacity_label ? <span className="rounded-full bg-slate-100 px-3 py-1">{variation.capacity_label}</span> : null}
                        {variation?.dimension_label ? <span className="rounded-full bg-slate-100 px-3 py-1">{variation.dimension_label}</span> : null}
                        {input.finish ? <span className="rounded-full bg-slate-100 px-3 py-1">Finish: {label(input.finish)}</span> : null}
                        {input.zipper ? <span className="rounded-full bg-slate-100 px-3 py-1">Zipper</span> : null}
                        {input.print_colors ? <span className="rounded-full bg-slate-100 px-3 py-1">{input.print_colors}-color print</span> : null}
                      </div>
                    </div>
                    <div className="text-right"><div className="text-sm font-bold text-slate-500">{Number(line.quantity || 0).toLocaleString()} pcs × {money(line.unit_price, line.currency || currency)}</div><div className="mt-1 text-lg font-black">{money(lineTotal, line.currency || currency)}</div></div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-cyan-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-cyan-700">02 · Sample KLD / Dieline</p>
                      <p className="mt-1 text-sm font-black">{kld?.file_name || 'KLD selected for this product'}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Use this as the sample structural layout for artwork placement and design review.</p>
                      {kld?.public_token ? <a className="mt-3 inline-flex rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white" href={`/api/public/packaging-kld/${kld.public_token}`}>View sample KLD</a> : <span className="mt-3 inline-flex rounded-xl bg-slate-200 px-3 py-2 text-xs font-black text-slate-500">KLD preview coming from Design</span>}
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">03 · Product Brochure / Reference</p>
                      <p className="mt-1 text-sm font-black">{product?.name || variation?.name || family?.name || 'Requested packaging product'}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">{product?.description || family?.description || `Reference for ${variation?.capacity_label || 'the requested size'} packaging configuration, dimensions, finish and printing requirements.`}</p>
                      {product?.image_url ? <img src={product.image_url} alt="Product reference" className="mt-3 h-28 w-full rounded-xl object-cover" /> : <div className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-white/70 p-3 text-xs font-semibold text-slate-500">Product reference is generated from your requested packaging specification. Final artwork is reviewed separately before printing.</div>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {quote.notes_customer ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">{quote.notes_customer}</div> : null}
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">What happens next</p>
          <h2 className="mt-1 text-xl font-black">Design approval comes next</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">Once Stark Packmate prepares the final design on the selected KLD, you will receive a separate secure design-review link. From there you can approve the proof or request changes with comments. Printing stays blocked until the final proof is approved.</p>
        </section>
      </div>
    </main>
  );
}
