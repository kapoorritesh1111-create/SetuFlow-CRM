import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic='force-dynamic';

export async function GET(_request:Request,{params}:{params:{token:string;lineId:string}}){
  const token=String(params.token??'').trim();
  const lineId=String(params.lineId??'').trim();
  if(token.length<32||!lineId) return NextResponse.json({error:'Unavailable'},{status:404});
  const db=createAdminSupabaseClient() as any;
  if(!db) return NextResponse.json({error:'Unavailable'},{status:404});
  const {data:quotes}=await db.from('quotes').select('id,organization_id')
    .contains('industry_metadata',{customer_review_token:token}).limit(1);
  const quote=quotes?.[0];
  if(!quote) return NextResponse.json({error:'Unavailable'},{status:404});
  const {data:line}=await db.from('quote_line_items')
    .select('id,input_snapshot_json,packaging_family_id').eq('id',lineId).eq('quote_id',quote.id).maybeSingle();
  if(!line?.packaging_family_id) return NextResponse.json({error:'Unavailable'},{status:404});
  const {data:family}=await db.from('packaging_service_families').select('name')
    .eq('id',line.packaging_family_id).eq('organization_id',quote.organization_id).maybeSingle();
  const name=String(family?.name??'').toLowerCase();
  const css=name.includes('center seal');
  const threeSS=name.includes('3 side seal')||name.includes('three side seal');
  if(!css&&!threeSS) return NextResponse.json({error:'Unavailable'},{status:404});
  const input=line.input_snapshot_json?.input??{};
  const width=Number(input.width_mm),height=Number(input.height_mm);
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<20||width>1500||height<20||height>3000)
    return NextResponse.json({error:'Dimensions unavailable'},{status:404});
  const seal=10, margin=25;
  const web=2*width+(css?seal:0), canvasWidth=web+margin*2,canvasHeight=height+95;
  const safeW=Math.max(1,width-20),safeH=Math.max(1,height-20);
  const rightX=margin+width+(css?seal:0);
  const label=(text:string,x:number,y:number)=>`<text x="${x}" y="${y}" font-family="Arial" font-size="7" fill="#123047">${text}</text>`;
  const panel=(x:number)=>`<rect x="${x}" y="40" width="${width}" height="${height}" fill="none" stroke="#dc2777" stroke-width="1"/><rect x="${x+10}" y="50" width="${safeW}" height="${safeH}" fill="none" stroke="#059669" stroke-dasharray="4 3" stroke-width="1"/>`;
  const title=css?'CENTER SEAL POUCH':'3 SIDE SEAL POUCH';
  const center=css?`<rect x="${margin+width}" y="40" width="${seal}" height="${height}" fill="none" stroke="#2563eb" stroke-dasharray="4 3"/>${label('Back seal (illustrative)',margin+width,35)}`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}mm" height="${canvasHeight}mm" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><rect width="100%" height="100%" fill="#fff"/>${label('STARK PACKMATE  |  '+title,10,14)}${label('System-generated KLD  |  '+width+' x '+height+' mm',10,25)}${panel(margin)}${panel(rightX)}${center}${label('FRONT',margin+5,65)}${label('BACK',rightX+5,65)}${label('Reference layout. Seal, trim and web allowances require production specification.',10,height+58)}${label('Not a final manufacturing die or artwork approval.',10,height+70)}</svg>`;
  return new NextResponse(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Content-Disposition':`inline; filename="Stark-${css?'CSS':'3SS'}-${width}x${height}-KLD.svg"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
