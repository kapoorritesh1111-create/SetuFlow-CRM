import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function label(value: unknown) {
  return String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function QuoteBrochurePage({ params }: { params: { token: string; lineId: string } }) {
  const admin = createAdminSupabaseClient() as any;
  if (!admin) notFound();
  const token = String(params.token || '').trim();
  const lineId = String(params.lineId || '').trim();

  const { data: quotes } = await admin
    .from('quotes')
    .select('id,organization_id,lead_id,quote_number')
    .contains('industry_metadata', { customer_review_token: token })
    .limit(1);
  const quote = quotes?.[0];
  if (!quote?.id) notFound();

  const { data: line } = await admin
    .from('quote_line_items')
    .select('id,product_id,notes,input_snapshot_json,packaging_family_id,packaging_product_variation_id')
    .eq('id', lineId)
    .eq('quote_id', quote.id)
    .maybeSingle();
  if (!line?.id) notFound();

  const [{ data: product }, { data: family }, { data: variation }] = await Promise.all([
    line.product_id ? admin.from('products').select('name,description,image_url,brand_name,pack_size,industry_metadata').eq('id', line.product_id).maybeSingle() : Promise.resolve({ data: null }),
    line.packaging_family_id ? admin.from('packaging_service_families').select('name,description').eq('id', line.packaging_family_id).maybeSingle() : Promise.resolve({ data: null }),
    line.packaging_product_variation_id ? admin.from('packaging_product_variations').select('name,capacity_label,dimension_label,width_mm,height_mm,bottom_gusset_each_mm').eq('id', line.packaging_product_variation_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const snapshot = line.input_snapshot_json ?? {};
  const input = snapshot.input ?? {};
  const name = product?.name || variation?.name || family?.name || line.notes || 'Requested packaging';
  const description = product?.description || family?.description || snapshot.spec_summary || 'Packaging configured for the requested application.';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Stark Packmate · Product Brochure</p>
          <h1 className="mt-2 text-3xl font-black">{name}</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-300">Customer-safe product reference prepared for quote {quote.quote_number || ''}.</p>
        </header>

        <section className="grid gap-5 md:grid-cols-[0.42fr_0.58fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {product?.image_url ? <img src={product.image_url} alt={name} className="h-72 w-full rounded-2xl object-cover" /> : <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 text-center text-sm font-bold text-slate-500">Packaging reference image not available for this configuration.</div>}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold leading-6 text-slate-600">{description}</p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {variation?.capacity_label ? <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs font-black uppercase text-slate-400">Capacity</dt><dd className="mt-1 font-black">{variation.capacity_label}</dd></div> : null}
              {variation?.dimension_label ? <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs font-black uppercase text-slate-400">Dimensions</dt><dd className="mt-1 font-black">{variation.dimension_label}</dd></div> : null}
              {input.finish ? <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs font-black uppercase text-slate-400">Finish</dt><dd className="mt-1 font-black">{label(input.finish)}</dd></div> : null}
              {input.print_colors ? <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs font-black uppercase text-slate-400">Printing</dt><dd className="mt-1 font-black">{input.print_colors}-color print</dd></div> : null}
              {input.zipper ? <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs font-black uppercase text-slate-400">Feature</dt><dd className="mt-1 font-black">Zipper</dd></div> : null}
              {product?.pack_size ? <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs font-black uppercase text-slate-400">Pack size</dt><dd className="mt-1 font-black">{product.pack_size}</dd></div> : null}
            </dl>
          </div>
        </section>

        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold text-slate-600">This brochure/reference summarizes the product requested in your quote. Final print artwork, colors and placement are approved separately through the design proof workflow.</div>
      </div>
    </main>
  );
}
