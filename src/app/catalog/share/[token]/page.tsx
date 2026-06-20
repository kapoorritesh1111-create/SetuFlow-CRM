import { validateShareToken, markShareOpened } from '@/lib/catalog-share/validate';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const STYLE = `
*{box-sizing:border-box}
body{margin:0}
.bwrap{min-height:100vh;background:#eef2f6;font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:#1e293b}
.bhead{background:linear-gradient(135deg,#1f487c,#279491);color:#fff;padding:22px 20px}
.bhead .org{font-size:20px;font-weight:800;letter-spacing:-.01em}
.bhead .sub{font-size:13px;opacity:.9;margin-top:2px}
.bmeta{display:flex;flex-wrap:wrap;gap:18px;margin-top:14px;font-size:12.5px}
.bmeta .k{opacity:.75}.bmeta .v{font-weight:700}
.bbody{max-width:1080px;margin:0 auto;padding:20px}
.bcard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.bgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.pimg{width:100%;height:140px;object-fit:cover;background:#f1f5f9}
.pbody{padding:13px}
.pname{font-size:14.5px;font-weight:700}
.pmeta{font-size:11.5px;color:#64748b;margin-top:3px}
.ttbl{width:100%;border-collapse:collapse;margin-top:10px;font-size:11.5px}
.ttbl th{color:#94a3b8;font-weight:600;text-align:left;padding:3px 5px}
.ttbl td{padding:3px 5px;border-top:1px solid #f1f5f9}
.unavail{max-width:520px;margin:14vh auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center}
.pinbox{max-width:420px;margin:14vh auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:30px;text-align:center}
.pinput{width:100%;border:1px solid #dbe6ef;border-radius:10px;padding:11px;font-size:18px;text-align:center;letter-spacing:4px;margin-top:14px}
.pbtn{margin-top:14px;width:100%;border:none;background:linear-gradient(135deg,#1f487c,#279491);color:#fff;border-radius:10px;padding:11px;font-size:14px;font-weight:700;cursor:pointer}
.contact{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:13px;color:#475569}
`;

function Unavailable({ title, msg }: { title: string; msg: string }) {
  return (
    <div className="bwrap"><style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="unavail">
        <div style={{ fontSize: 34 }}>🔒</div>
        <h2 style={{ fontSize: 19, margin: '10px 0 0' }}>{title}</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>{msg}</p>
      </div>
    </div>
  );
}

function PinGate({ token, invalid }: { token: string; invalid: boolean }) {
  return (
    <div className="bwrap"><style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <form className="pinbox" method="GET" action={`/catalog/share/${token}`}>
        <div style={{ fontSize: 30 }}>🔑</div>
        <h2 style={{ fontSize: 18, margin: '10px 0 4px' }}>Enter access PIN</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>This catalog is protected. Enter the PIN your contact shared with you.</p>
        {invalid && <p style={{ color: '#dc2626', fontSize: 12.5, marginTop: 8 }}>That PIN didn&rsquo;t match. Please try again.</p>}
        <input className="pinput" name="pin" inputMode="numeric" autoComplete="off" placeholder="••••" />
        <button className="pbtn" type="submit">View catalog</button>
      </form>
    </div>
  );
}

function fmtDate(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function BuyerCatalogSharePage({ params, searchParams }: { params: { token: string }; searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = searchParams ?? {};
  const pin = typeof sp.pin === 'string' ? sp.pin : null;
  const result = await validateShareToken(params.token, pin);

  if (!result.ok) {
    if (result.reason === 'pin_required') return <PinGate token={params.token} invalid={false} />;
    if (result.reason === 'pin_invalid') return <PinGate token={params.token} invalid={true} />;
    if (result.reason === 'expired') return <Unavailable title="This catalog link has expired" msg="Please ask your contact for an updated link." />;
    if (result.reason === 'revoked') return <Unavailable title="This catalog link is no longer active" msg="The supplier has revoked access. Please reach out to your contact for a new link." />;
    return <Unavailable title="Catalog not found" msg="This link may be incorrect or no longer available." />;
  }

  const share = result.share!;
  const productIds = result.productIds ?? [];
  await markShareOpened(share.id, share.use_count);

  // Load supplier org + products + pricing via service role (buyer is anonymous).
  const svc = createServiceRoleClient() as any;
  const [{ data: org }, { data: products }] = await Promise.all([
    svc.from('organizations').select('name').eq('id', share.organization_id).maybeSingle(),
    productIds.length
      ? svc.from('products').select('id, name, image_url, pack_size, hsn_code, description, certifications, country_of_origin, fob_price, exw_price, cif_price, pricing_currency').in('id', productIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Pricing from the chosen price list (items + tiers), if any.
  let itemsByProduct: Record<string, any> = {};
  let tiersByItem: Record<string, any[]> = {};
  if (share.price_list_id && productIds.length) {
    const { data: items } = await svc.from('price_list_items').select('*').eq('price_list_id', share.price_list_id).in('product_id', productIds);
    for (const it of (items ?? []) as any[]) itemsByProduct[it.product_id] = it;
    const itemIds = (items ?? []).map((i: any) => i.id);
    if (itemIds.length) {
      const { data: tiers } = await svc.from('price_list_tiers').select('*').in('price_list_item_id', itemIds).order('sort_order', { ascending: true });
      for (const t of (tiers ?? []) as any[]) (tiersByItem[t.price_list_item_id] ||= []).push(t);
    }
  }

  const orderedProducts = productIds.map((id) => (products ?? []).find((p: any) => p.id === id)).filter(Boolean) as any[];
  const currency = share.currency || 'USD';
  const validUntil = fmtDate(share.valid_until);

  return (
    <div className="bwrap"><style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="bhead">
        <div className="org">{org?.name || 'Product Catalog'}</div>
        <div className="sub">{share.buyer_company ? `Prepared for ${share.buyer_company}` : 'Curated product catalog'}</div>
        <div className="bmeta">
          <span><span className="k">Currency:</span> <span className="v">{currency}</span></span>
          {share.incoterm && <span><span className="k">Incoterm:</span> <span className="v">{share.incoterm}</span></span>}
          {validUntil && <span><span className="k">Valid until:</span> <span className="v">{validUntil}</span></span>}
          <span><span className="k">Products:</span> <span className="v">{orderedProducts.length}</span></span>
        </div>
      </div>

      <div className="bbody">
        <div className="bgrid">
          {orderedProducts.map((p) => {
            const item = itemsByProduct[p.id];
            const tiers = item ? (tiersByItem[item.id] ?? []) : [];
            const basePrice = item?.unit_price ?? p.fob_price ?? p.exw_price ?? p.cif_price ?? null;
            return (
              <div key={p.id} className="bcard">
                {p.image_url ? <img className="pimg" src={p.image_url} alt={p.name} /> : <div className="pimg" />}
                <div className="pbody">
                  <div className="pname">{p.name}</div>
                  <div className="pmeta">
                    {item?.moq != null ? `MOQ ${item.moq} ${item.moq_unit || ''}` : ''}{p.pack_size ? ` · ${p.pack_size}` : ''}{p.country_of_origin ? ` · ${p.country_of_origin}` : ''}
                  </div>
                  {Array.isArray(p.certifications) && p.certifications.length > 0 && (
                    <div className="pmeta">{p.certifications.slice(0, 4).join(' · ')}</div>
                  )}
                  {tiers.length > 0 ? (
                    <table className="ttbl">
                      <thead><tr><th>Qty</th><th>Price ({currency})</th></tr></thead>
                      <tbody>
                        {tiers.map((t: any, i: number) => (
                          <tr key={t.id}><td>{t.tier_qty_min ?? 0}{t.tier_qty_max ? `–${t.tier_qty_max}` : '+'}</td><td>{t.unit_price ?? '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : basePrice != null ? (
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#1f487c' }}>{currency} {basePrice}</div>
                  ) : (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>Price on request</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bcard" style={{ marginTop: 18, padding: 16 }}>
          <div className="contact">
            <strong style={{ color: '#1e293b' }}>Interested?</strong>
            <span>Contact {org?.name || 'the supplier'} to request a quote.</span>
            {share.buyer_email && <a href={`mailto:?subject=${encodeURIComponent('Quote request')}`} style={{ color: '#1f487c', fontWeight: 700, textDecoration: 'none' }}>Request a quote</a>}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 18 }}>Powered by SETU Flow · Secure shared catalog</p>
      </div>
    </div>
  );
}
