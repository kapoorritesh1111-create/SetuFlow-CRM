import { validateShareToken, markShareOpened } from '@/lib/catalog-share/validate';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { BuyerShareRoom, type RoomProduct } from './buyer-share-room';

export const dynamic = 'force-dynamic';

const STYLE = `
*{box-sizing:border-box}body{margin:0}
.bwrap{min-height:100vh;background:#eef2f6;font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:#1e293b}
.unavail{max-width:520px;margin:14vh auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center}
.pinbox{max-width:420px;margin:14vh auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:30px;text-align:center}
.pinput{width:100%;border:1px solid #dbe6ef;border-radius:10px;padding:11px;font-size:18px;text-align:center;letter-spacing:4px;margin-top:14px}
.pbtn{margin-top:14px;width:100%;border:none;background:linear-gradient(135deg,#1f487c,#279491);color:#fff;border-radius:10px;padding:11px;font-size:14px;font-weight:700;cursor:pointer}
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

  const svc = createServiceRoleClient() as any;
  const [{ data: org }, { data: products }] = await Promise.all([
    svc.from('organizations').select('name').eq('id', share.organization_id).maybeSingle(),
    productIds.length
      ? svc.from('products').select('id, name, image_url, pack_size, hsn_code, description, certifications, country_of_origin, fob_price, exw_price, cif_price, pricing_currency').in('id', productIds)
      : Promise.resolve({ data: [] }),
  ]);

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

  const roomProducts: RoomProduct[] = productIds.map((id) => {
    const p = (products ?? []).find((x: any) => x.id === id);
    if (!p) return null;
    const item = itemsByProduct[p.id];
    const tiers = item ? (tiersByItem[item.id] ?? []) : [];
    return {
      id: p.id, name: p.name, image_url: p.image_url ?? null, pack_size: p.pack_size ?? null, description: p.description ?? null,
      hsn_code: p.hsn_code ?? null, certifications: p.certifications ?? null, country_of_origin: p.country_of_origin ?? null,
      moq: item?.moq ?? null, moq_unit: item?.moq_unit ?? null,
      base_price: item?.unit_price ?? p.fob_price ?? p.exw_price ?? p.cif_price ?? null,
      tiers: tiers.map((t: any) => ({ id: t.id, tier_qty_min: t.tier_qty_min, tier_qty_max: t.tier_qty_max, unit_price: t.unit_price, discount_pct: t.discount_pct })),
    } as RoomProduct;
  }).filter(Boolean) as RoomProduct[];

  return (
    <BuyerShareRoom
      token={params.token}
      pin={pin}
      orgName={org?.name || 'Product Catalog'}
      buyerCompany={share.buyer_company}
      buyerName={share.buyer_name}
      buyerEmail={share.buyer_email}
      currency={share.currency || 'USD'}
      incoterm={share.incoterm}
      incotermLocation={null}
      validUntil={fmtDate(share.valid_until)}
      pdfAllowed={share.pdf_download_allowed}
      trackingEnabled={share.tracking_enabled}
      products={roomProducts}
    />
  );
}
