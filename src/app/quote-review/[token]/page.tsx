import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import QuoteDecisionForm from './quote-decision-form';
import { customerVolumeSuggestions } from '@/lib/packaging-pricing-v5/volume-suggestions';

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

  const [{ data: lead }, { data: lines }, { data: attachments }, { data: org }] = await Promise.all([
    admin.from('leads').select('company_name,contact_name').eq('id', quote.lead_id).eq('organization_id', quote.organization_id).maybeSingle(),
    admin.from('quote_line_items').select('id,line_type,product_id,quantity,unit_price,currency,notes,input_snapshot_json,pricing_breakdown_json,packaging_family_id,packaging_product_variation_id,packaging_kld_file_id').eq('quote_id', quote.id).order('created_at'),
    admin.from('lead_attachments').select('id,file_name,mime_type,attachment_type,created_at').eq('lead_id', quote.lead_id).eq('organization_id', quote.organization_id).order('created_at', { ascending: true }),
    admin.from('organizations').select('name,legal_name,logo_url').eq('id', quote.organization_id).maybeSingle(),
  ]);

  const lineIds = (lines ?? []).map((l:any)=>l.id).filter(Boolean);
  const { data: proofs } = lineIds.length ? await admin.from('packaging_proofs').select('id,quote_line_item_id,version,file_path,file_name,mime_type,status,uploaded_at').eq('organization_id', quote.organization_id).in('quote_line_item_id', lineIds).order('version',{ascending:false}) : { data: [] };
  const latestProofByLine = new Map<string,any>();
  for (const proof of (proofs ?? []) as any[]) if (!latestProofByLine.has(String(proof.quote_line_item_id))) latestProofByLine.set(String(proof.quote_line_item_id),proof);
  const proofUrlByLine = new Map<string,string>();
  for (const [lineId,proof] of latestProofByLine.entries()) {
    if (!proof?.file_path) continue;
    const { data } = await admin.storage.from('lead-attachments').createSignedUrl(proof.file_path,60*60);
    if (data?.signedUrl) proofUrlByLine.set(lineId,data.signedUrl);
  }

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
  const meta = quote.industry_metadata ?? {};
  const artworkAttachments = (attachments ?? []).filter((a: any) => ['artwork', 'customer_artwork', 'design_in_progress', 'design', 'proof'].includes(String(a.attachment_type || '').toLowerCase()));
  const imageArtwork = artworkAttachments.find((a:any)=>String(a.mime_type||'').startsWith('image/')) ?? null;
  const sellerName = org?.legal_name || org?.name || 'Stark Packmate';

  return (
    <main className="min-h-screen bg-[#f5f8fb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,.18),_transparent_30%),linear-gradient(135deg,#071b31_0%,#0b3150_55%,#0f4c5c_100%)] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">{org?.logo_url?<img src={org.logo_url} alt={sellerName} className="h-10 max-w-[170px] rounded bg-white/95 object-contain p-1.5"/>:<div className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black">{sellerName}</div>}</div>
              <h1 className="mt-4 text-3xl font-black">Quotation</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-300">Review your packaging specification, pricing options and artwork. Everything needed to approve this quotation is kept together here.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right"><div className="text-xs font-bold uppercase tracking-wide text-slate-300">Quote</div><div className="text-lg font-black">{quote.quote_number || 'Current quote'}</div></div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Customer</div><div className="mt-1 font-black">{lead?.company_name || 'Customer'}</div><div className="text-sm text-slate-500">{lead?.contact_name || ''}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Quote total</div><div className="mt-1 text-xl font-black text-emerald-700">{money(total, currency)}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Valid until</div><div className="mt-1 font-black">{quote.valid_until ? new Date(`${quote.valid_until}T00:00:00`).toLocaleDateString() : 'As stated in quote'}</div><div className="text-sm text-slate-500">Status: {label(quote.status)}</div></div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Packaging & Pricing</p><h2 className="mt-1 text-2xl font-black">Your quotation</h2></div>
          <div className="space-y-4">
            {(lines ?? []).map((line: any, index: number) => {
              const snapshot = line.input_snapshot_json ?? {};
              const input = snapshot.input ?? {};
              const product = line.product_id ? byProduct.get(String(line.product_id)) : null;
              const family = line.packaging_family_id ? byFamily.get(String(line.packaging_family_id)) : null;
              const variation = line.packaging_product_variation_id ? byVariation.get(String(line.packaging_product_variation_id)) : null;
              const kld = line.packaging_kld_file_id ? byKld.get(String(line.packaging_kld_file_id)) : null;
              const proof = latestProofByLine.get(String(line.id)) ?? null;
              const proofUrl = proofUrlByLine.get(String(line.id)) ?? null;
              const proofIsImage = Boolean(proofUrl && String(proof?.mime_type||'').startsWith('image/'));
              const leadArtworkUrl = imageArtwork ? `/api/public/quote-attachment/${token}/${imageArtwork.id}` : null;
              const artworkUrl = proofUrl || leadArtworkUrl;
              const artworkIsImage = proofIsImage || Boolean(!proofUrl && imageArtwork);
              const name = product?.name || variation?.name || family?.name || line.notes || `Packaging item ${index + 1}`;
              const lineTotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
              const alternatives = customerVolumeSuggestions(
                line.quantity,
                line.unit_price,
                Array.isArray(line.pricing_breakdown_json?.suggested_quantities) ? line.pricing_breakdown_json.suggested_quantities : [],
                3,
              );
              return (
                <article key={line.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                  <div className="grid gap-0 lg:grid-cols-[270px_minmax(0,1fr)]">
                    <div className="relative min-h-[300px] border-b border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-5 lg:border-b-0 lg:border-r">
                      {artworkUrl&&artworkIsImage?<img src={artworkUrl} alt="Packaging artwork" className="h-full min-h-[260px] w-full rounded-2xl border border-slate-200 bg-white object-contain shadow-sm"/>:<div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300 bg-white p-5 text-center"><img src={String(family?.name||'').toLowerCase().includes('center')?'/packaging/quote-stock/center-seal-pouch.svg':String(family?.name||'').toLowerCase().includes('3 side')?'/packaging/quote-stock/three-side-seal.svg':'/packaging/quote-stock/stand-up-pouch.svg'} alt="" className="h-40 w-auto"/><div className="mt-3 text-sm font-black text-slate-800">{artworkUrl?'Artwork / proof attached':kld?'KLD / Dieline selected':'Packaging reference'}</div><div className="mt-1 text-xs font-semibold text-slate-500">{artworkUrl?'Open the attached artwork or proof below.':kld?'Artwork has not been attached yet. Use the approved KLD for artwork placement.':'Artwork will be added during design.'}</div></div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {artworkUrl?<a target="_blank" rel="noopener noreferrer" href={artworkUrl} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">View artwork / proof ↗</a>:null}
                        {kld?.public_token?<a target="_blank" rel="noopener noreferrer" href={`/api/public/packaging-kld/${kld.public_token}`} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800">View KLD ↗</a>:null}
                      </div>
                    </div>
                    <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1"><h3 className="text-lg font-black">{name}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{snapshot.spec_summary || line.notes || family?.description || product?.description || 'Packaging specification as quoted.'}</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">{variation?.capacity_label ? <span className="rounded-full bg-slate-100 px-3 py-1">{variation.capacity_label}</span> : null}{variation?.dimension_label ? <span className="rounded-full bg-slate-100 px-3 py-1">{variation.dimension_label}</span> : null}{input.finish ? <span className="rounded-full bg-slate-100 px-3 py-1">Finish: {label(input.finish)}</span> : null}{input.zipper ? <span className="rounded-full bg-slate-100 px-3 py-1">Zipper</span> : null}{input.print_colors ? <span className="rounded-full bg-slate-100 px-3 py-1">{input.print_colors}-color print</span> : null}</div></div>
                    <div className="text-right"><div className="text-sm font-bold text-slate-500">{Number(line.quantity || 0).toLocaleString()} pcs × {money(line.unit_price, line.currency || currency)}</div><div className="mt-1 text-lg font-black">{money(lineTotal, line.currency || currency)}</div></div>
                  </div>

                  {alternatives.length ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Save more at higher quantities</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">Your quoted quantity stays unchanged. If you increase the order quantity, these suggested prices show how the approved per-piece price can reduce.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {alternatives.map((row: any) => {
                        const saving = Number(row.savings_pct ?? 0);
                        return <div key={row.quantity} className="rounded-xl border border-emerald-200 bg-white p-3">
                          <div className="text-xs font-black text-slate-900">{Number(row.quantity).toLocaleString()} pcs</div>
                          <div className="mt-1 text-sm font-black text-emerald-700">{money(row.unit_price, line.currency || currency)} / pc</div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">{money(row.product_total, line.currency || currency)} order</div>
                          {saving > 0 ? <div className="mt-1 text-[11px] font-black text-emerald-700">{saving.toFixed(1)}% lower / pc</div> : null}
                        </div>;
                      })}
                    </div>
                  </div> : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {kld?.public_token?<a target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800" href={`/api/public/packaging-kld/${kld.public_token}`}>View KLD / dieline ↗</a>:null}
                    <a target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800" href={`/public/quote-review/${token}/brochure/${line.id}`}>View product details ↗</a>
                  </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {quote.notes_customer ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">{quote.notes_customer}</div> : null}
        </section>

        <section className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Artwork & Files</p>
          <h2 className="mt-1 text-xl font-black">Artwork shared with this quotation</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">Open any artwork or proof associated with this quotation. If artwork has not been supplied yet, use the KLD shown with the product above.</p>
          {artworkAttachments.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{artworkAttachments.map((attachment: any) => <a key={attachment.id} target="_blank" rel="noopener noreferrer" href={`/api/public/quote-attachment/${token}/${attachment.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-300 hover:bg-violet-50"><div className="text-[10px] font-black uppercase tracking-wide text-violet-600">{label(attachment.attachment_type || 'Artwork')}</div><div className="mt-1 text-sm font-black text-slate-900">{attachment.file_name}</div><div className="mt-2 text-xs font-bold text-slate-500">Open attachment ↗</div></a>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No customer artwork or in-progress design file has been attached to this lead yet.</div>}
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Your Decision</p>
          <h2 className="mt-1 text-xl font-black">Approve & sign, or request a revision</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">Approve the commercial quote by typing the authorized signer name, or send Sales the exact revision you need. Your response is recorded against this quote and Sales is notified.</p>
          <QuoteDecisionForm token={token} initialDecision={meta.customer_quote_decision ?? null} initialSigner={meta.customer_quote_signer_name ?? null} initialComment={meta.customer_quote_revision_comment ?? null} initialReviewedAt={meta.customer_quote_decision_at ?? null} />
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Next Step</p><h2 className="mt-1 text-xl font-black">Artwork approval follows quotation approval</h2><p className="mt-2 text-sm font-semibold text-slate-600">Once the quotation is approved, the final artwork is prepared on the selected KLD and shared for your approval before production.</p></section>
      </div>
    </main>
  );
}
