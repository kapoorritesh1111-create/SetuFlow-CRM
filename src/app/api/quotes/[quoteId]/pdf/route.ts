import {resolveFrameQuotePresentation} from '@/lib/packaging-pricing-v5/customer-quote-unit';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { loadOrganizationLogo, type PdfImage } from '@/lib/pdf/organization-logo';
import { customerVolumeSuggestions } from '@/lib/packaging-pricing-v5/volume-suggestions';
import { isStarkPackmateOrganization, STARK_PACKMATE_POLICY, STARK_PACKMATE_POLICY_TITLE, STARK_PACKMATE_POLICY_INTRO, STARK_PACKMATE_POLICY_ACKNOWLEDGEMENT } from '@/lib/quotes/stark-packmate-policy';

export const runtime = 'nodejs';

const INK = '#0f172a';
const MUTED = '#475569';
const NAVY = '#0b2e4a';
const BLUE = '#1d4ed8';
const LINE = '#cbd5e1';
const PANEL = '#f8fafc';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

type PdfText = { x: number; y: number; text: string; size: number; bold: boolean; color: string; right: boolean };
type PdfRow = { sku: string; product: string; specification?: string; qty: number; basis: string; casePrice: number; total: number };
type PdfData = {
  quoteNo: string;
  volumeSuggestions?: string[];
  org: any;
  buyer: any;
  market: string;
  destination: string;
  place: string;
  basis: string;
  currency: string;
  quoteDate: string;
  validUntil: string;
  terms: string;
  rows: PdfRow[];
  taxTotal?: number;
  taxLabel?: string;
  logoImage?: PdfImage | null;
  includeStarkPolicy?: boolean;
  domesticQuote?: boolean;
};

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, fallback = '-') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function clip(value: unknown, max = 36, fallback = '-') {
  const out = text(value, fallback);
  return out.length > max ? `${out.slice(0, Math.max(1, max - 3))}...` : out;
}

function dateText(value: unknown) {
  const out = text(value, '');
  if (!out) return '-';
  const date = new Date(out.includes('T') ? out : `${out}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function pdfText(value: string) {
  return String(value).split(BS).join(BS + BS).split('(').join(BS + '(').split(')').join(BS + ')').split(NL).join(' ');
}

function rgb(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `${(((value >> 16) & 255) / 255).toFixed(3)} ${(((value >> 8) & 255) / 255).toFixed(3)} ${((value & 255) / 255).toFixed(3)}`;
}

function money(value: unknown, currency = 'USD') {
  return `${currency} ${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function quoteBasis(value: unknown) {
  const out = text(value, 'FOB').replaceAll('_', ' ').trim().toUpperCase();
  return out.includes('EX') ? 'EXW' : out || 'FOB';
}

function docStatus(quote: any) {
  return quote.approval_required && !quote.approved_at ? 'submitted' : 'approved';
}

function width(value: string, size: number, bold = false) {
  return value.length * size * (bold ? 0.56 : 0.52);
}

function orgLogoMark(org: any) {
  const name = text(org?.legal_name ?? org?.name, 'ORG').replace(/[^A-Za-z0-9 ]/g, ' ').trim();
  const words = name.split(/\s+/).filter(Boolean).filter((word) => !['demo', 'llc', 'llp', 'inc', 'ltd', 'private', 'limited', 'exports', 'exporter'].includes(word.toLowerCase()));
  const mark = (words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? name).slice(0, 3)).toUpperCase();
  return mark || 'ORG';
}

function buildPdf(data: PdfData) {
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  let logoObj = 0;
  let smaskObj = 0;
  if (data.logoImage?.smask) smaskObj = add(`<< /Type /XObject /Subtype /Image /Width ${data.logoImage.width} /Height ${data.logoImage.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${data.logoImage.smask.length} >>${NL}stream${NL}${data.logoImage.smask.toString('binary')}${NL}endstream`);
  if (data.logoImage) logoObj = add(`<< /Type /XObject /Subtype /Image /Width ${data.logoImage.width} /Height ${data.logoImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${data.logoImage.filter} ${smaskObj ? `/SMask ${smaskObj} 0 R ` : ''}/Length ${data.logoImage.data.length} >>${NL}stream${NL}${data.logoImage.data.toString('binary')}${NL}endstream`);

  const ops: string[] = [];
  const copy: PdfText[] = [];
  const left = 24;
  const right = 588;
  const box = (x: number, y: number, w: number, h: number, fill?: string, stroke?: string) => { if (fill) ops.push(`${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`); if (stroke) ops.push(`${rgb(stroke)} RG ${x} ${y} ${w} ${h} re S`); };
  const line = (x1: number, y1: number, x2: number, y2: number, color = LINE, lineWidth = 0.7) => ops.push(`${rgb(color)} RG ${lineWidth} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const put = (x: number, y: number, value: string, size = 7, bold = false, color = INK, alignRight = false) => copy.push({ x, y, text: value, size, bold, color, right: alignRight });
  const subtotal = data.rows.reduce((sum, row) => sum + row.total, 0);
  const taxTotal = Math.max(0, num(data.taxTotal));
  const total = subtotal + taxTotal;
  const logo = orgLogoMark(data.org);

  box(0, 0, 612, 792, '#ffffff');
  box(left, 724, 564, 44, '#ffffff', LINE);
  box(left, 724, 54, 44, '#ffffff', LINE);
  if (logoObj && data.logoImage) {
    const scale = Math.min(46 / data.logoImage.width, 36 / data.logoImage.height);
    const renderedWidth = data.logoImage.width * scale;
    const renderedHeight = data.logoImage.height * scale;
    ops.push(`q ${renderedWidth.toFixed(2)} 0 0 ${renderedHeight.toFixed(2)} ${(left + 27 - renderedWidth / 2).toFixed(2)} ${(746 - renderedHeight / 2).toFixed(2)} cm /Logo Do Q`);
  } else {
    box(left, 724, 54, 44, NAVY);
    put(54, 746, logo, logo.length > 2 ? 6.8 : 8.5, true, '#ffffff', true);
  }
  put(92, 750, 'COMMERCIAL QUOTATION', 15.5, true, NAVY);
  put(92, 736, 'Buyer-facing offer and commercial terms', 7, false, MUTED);
  box(456, 732, 122, 28, PANEL, LINE);
  put(574, 750, data.quoteNo, 8.4, true, NAVY, true);
  put(574, 739, `${data.quoteDate} | Valid ${data.validUntil}`, 5.7, false, MUTED, true);

  box(24, 612, 176, 92, PANEL, LINE);
  put(36, 686, data.domesticQuote ? 'SELLER' : 'SELLER / EXPORTER', 6.5, true, BLUE);
  put(36, 672, clip(data.org?.legal_name ?? data.org?.name, 34, 'Seller'), 8, true);
  put(36, 658, clip(data.org?.registered_address, 38), 6.2, false, MUTED);
  put(36, 648, clip([data.org?.city, data.org?.postal_code, data.org?.headquarters_country].filter(Boolean).join(', '), 38), 6.2, false, MUTED);
  put(36, 632, clip(data.org?.contact_email ?? data.org?.website, 36), 6.2, false, MUTED);
  put(36, 622, `Tax ID: ${clip(data.org?.tax_id, 28)}`, 6.2, false, MUTED);

  box(216, 612, 176, 92, PANEL, LINE);
  put(228, 686, data.domesticQuote ? 'CUSTOMER' : 'BUYER / IMPORTER', 6.5, true, BLUE);
  put(228, 672, clip(data.buyer?.company_name, 34, 'Buyer pending'), 8, true);
  put(228, 658, clip(data.buyer?.contact_name, 35, ''), 6.2, false, MUTED);
  put(228, 648, clip(data.buyer?.country, 35, data.destination), 6.2, false, MUTED);
  put(228, 632, clip(data.buyer?.email, 36), 6.2, false, MUTED);
  put(228, 622, clip(data.buyer?.phone, 36), 6.2, false, MUTED);

  box(408, 612, 180, 92, PANEL, LINE);
  (data.domesticQuote ? [['Quote type','Domestic supply'],['Pricing','Direct / per unit'],['Tax','GST as shown'],['Validity',data.validUntil],['Currency',data.currency],['Lines',String(data.rows.length)]] : [['Destination', data.destination], ['Market', data.market], ['Basis', `${data.basis} Incoterms 2020`], ['Named place', data.place], ['Currency', data.currency], ['Lines', String(data.rows.length)]]).forEach(([label, value], index) => {
    const y = 688 - index * 12;
    put(420, y, label, 5.3, true, MUTED);
    put(580, y, clip(value, 24), 5.7, false, INK, true);
  });

  box(left, 590, 564, 14, '#eef6ff', '#bfdbfe');
  put(36, 594, data.domesticQuote ? 'Domestic supply quotation. GST is shown in the financial summary; delivery arrangements are subject to order confirmation.' : 'Taxes, duties and destination charges follow the agreed Incoterm. Unless included, buyer pays import duty, VAT/GST, clearance and destination handling.', 5.45, false, '#1e3a8a');

  let y = 560;
  box(18, y - 17, 576, 20, '#e2e8f0', LINE);
  put(24, y - 10, '#', 5, true, NAVY);
  put(62, y - 10, 'SKU', 5, true, NAVY);
  put(142, y - 10, 'Product / Service', 5, true, NAVY);
  put(318, y - 10, 'Qty', 5, true, NAVY, true);
  put(372, y - 10, data.domesticQuote ? 'Pricing' : 'Basis', 5, true, NAVY);
  put(458, y - 10, `${data.currency}/Rate`, 5, true, NAVY, true);
  put(582, y - 10, `Total ${data.currency}`, 5, true, NAVY, true);
  y -= 23;

  data.rows.slice(0, 12).forEach((row, index) => {
    box(18, y - 15, 576, 21, index % 2 ? '#ffffff' : '#f8fafc', LINE);
    put(24, y - 6, String(index + 1), 5.2);
    put(62, y - 6, clip(row.sku, 16), 5.2);
    put(142, y - 4, clip(row.product, 40), 5.2, index === 0);
    if (row.specification) put(142, y - 12, clip(row.specification, 76), 4.4, false, MUTED);
    put(318, y - 6, String(row.qty || '-'), 5.2, false, INK, true);
    put(372, y - 6, row.basis, 5.2);
    put(458, y - 6, money(row.casePrice, data.currency), 5.2, index === 0, INK, true);
    put(582, y - 6, money(row.total, data.currency), 5.2, index === 0, INK, true);
    y -= 21;
  });

  line(18, y + 5, 594, y + 5, NAVY, 1.1);
  put(450, y - 7, 'Grand Total', 8.5, true, NAVY, true);
  put(582, y - 7, money(total, data.currency), 9, true, NAVY, true);

  y -= 44;
  box(24, y - 68, 274, 68, PANEL, LINE);
  put(36, y - 15, 'COMMERCIAL DETAILS', 7, true, NAVY);
  (data.domesticQuote ? ['Sale type: Domestic', 'Pricing: Direct unit price', 'Tax: GST as shown', `Validity: ${data.validUntil}`] : [`Destination: ${data.destination}`, `Pricing basis: ${data.basis}`, `Named place: ${data.place}`, `Validity: ${data.validUntil}`]).forEach((lineText, index) => put(36, y - 31 - index * 10, `- ${clip(lineText, 72)}`, 5.7, false, MUTED));

  box(314, y - 68, 274, 68, PANEL, LINE);
  put(326, y - 15, `FINANCIAL SUMMARY (${data.currency})`, 7, true, NAVY);
  [['Subtotal', money(subtotal, data.currency)], [data.domesticQuote ? 'Delivery charges' : 'Freight / insurance', data.domesticQuote ? 'As agreed' : 'Not included'], [taxTotal > 0 ? (data.taxLabel || 'GST') : (data.domesticQuote ? 'GST' : 'Taxes / duties'), taxTotal > 0 ? money(taxTotal, data.currency) : (data.domesticQuote ? 'As applicable' : 'Per Incoterm')], ['Amount payable', money(total, data.currency)]].forEach(([label, value], index) => {
    put(326, y - 31 - index * 10, label, 5.8, false, MUTED);
    put(580, y - 31 - index * 10, value, 5.8, index === 3, INK, true);
  });

  y -= 90;
  box(left, y - 76, right - left, 76, '#ffffff', LINE);
  const suggestionLines=(data.volumeSuggestions ?? []).slice(0,2);
  put(36, y - 15, suggestionLines.length ? 'VOLUME SAVINGS & TERMS' : 'TERMS & CONDITIONS', 7, true, NAVY);
  const termLines = data.domesticQuote ? [
    ...suggestionLines.map((item)=>`More quantity: ${item}`),
    `Quote valid until ${data.validUntil}.`,
    'Direct unit prices in INR; GST as detailed above.',
    'Order confirmation is subject to agreed quantities, pack sizes, MOQs and specifications.',
    'See the attached Stark Packmate order, delivery and rejection policy.',
  ] : suggestionLines.length
    ? [
        ...suggestionLines.map((item)=>`More quantity: ${item}`),
        `Quote valid until ${data.validUntil}.`,
        `Prices quoted on ${data.basis} basis from ${data.place}.`,
        'Order confirmation is subject to agreed quantities, pack sizes, MOQs and specifications.',
      ]
    : [
        `Quote valid until ${data.validUntil}.`,
        `Prices quoted on ${data.basis} basis from ${data.place}.`,
        'Import duties, VAT/GST, customs clearance and destination handling are buyer account unless included.',
        'Order confirmation is subject to agreed quantities, pack sizes, MOQs and specifications.',
        clip(data.terms, 118),
      ];
  termLines.slice(0,5).forEach((lineText, index) => put(36, y - 31 - index * 9.5, clip(lineText, 135), 5.2, index < suggestionLines.length, index < suggestionLines.length ? BLUE : MUTED));

  put(36, 54, 'Generated from the seller workspace. This quotation is intended for the named buyer.', 5.4, false, MUTED);

  const textOps = copy.flatMap((entry) => {
    const x = entry.right ? Math.max(left, entry.x - width(entry.text, entry.size, entry.bold)) : entry.x;
    return ['BT', `${rgb(entry.color)} rg /F${entry.bold ? 'B' : 'R'} ${entry.size} Tf`, `1 0 0 1 ${x.toFixed(2)} ${entry.y.toFixed(2)} Tm (${pdfText(entry.text)}) Tj`, 'ET'];
  });
  const stream = [...ops, ...textOps].join(NL);
  const content = add(`<< /Length ${Buffer.byteLength(stream, 'binary')} >>${NL}stream${NL}${stream}${NL}endstream`);
  const xobjects = logoObj ? `/XObject << /Logo ${logoObj} 0 R >>` : '';
  const page = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /FR ${font} 0 R /FB ${fontBold} 0 R >> ${xobjects} >> /Contents ${content} 0 R >>`);
  const pageRefs = [page];
  if (data.includeStarkPolicy) {
    // Standalone policy appendix: the first quotation page remains unchanged.
    // Keep every policy point intact while paginating by paragraph, never by
    // unmeasured character counts (which caused orphaned headings and overflow).
    const paper = { left: 38, right: 574, bottom: 73 };
    const policyPages: string[][] = [];
    let policyOps: string[] = [];
    let cursor = 0;
    let pageIndex = 0;
    const policyRect = (x:number,y:number,w:number,h:number,color:string) =>
      policyOps.push(rgb(color)+' rg '+x+' '+y.toFixed(2)+' '+w+' '+h.toFixed(2)+' re f');
    const policyRule = (x:number,y:number,w:number,color:string) =>
      policyOps.push(rgb(color)+' RG 0.7 w '+x+' '+y.toFixed(2)+' m '+(x+w)+' '+y.toFixed(2)+' l S');
    const policyText = (x:number,y:number,value:string,size:number,bold=false,color=INK) => {
      const printable=value.replace(/[\u2013\u2014]/g,'-').replace(/\u00b1/g,'+/-').replace(/\u00d7/g,'x')
        .replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').normalize('NFKD').replace(/[^\x20-\x7e]/g,'');
      policyOps.push('BT '+rgb(color)+' rg /F'+(bold?'B':'R')+' '+size+
        ' Tf 1 0 0 1 '+x+' '+y.toFixed(2)+' Tm ('+pdfText(printable)+') Tj ET');
    };
    const wrapPolicy = (value:string, maxWidth:number, fontSize:number, bold=false) => {
      const words=value.split(/\s+/).filter(Boolean);
      const wrapped:string[]=[]; let current='';
      for(const word of words){
        const candidate=current?current+' '+word:word;
        if(current && width(candidate,fontSize,bold)>maxWidth){wrapped.push(current);current=word;}
        else current=candidate;
      }
      if(current) wrapped.push(current);
      return wrapped;
    };
    const newPage=()=>{
      if(pageIndex) policyPages.push(policyOps);
      pageIndex++;
      policyOps=[];
      policyRect(0,0,612,792,'#ffffff');
      policyRect(0,765,612,27,NAVY);
      policyText(paper.left,775,'STARK PACKMATE',10,true,'#ffffff');
      policyText(455,775,'QUOTATION APPENDIX',7,true,'#ffffff');
      policyText(paper.left,736,'CLIENT ORDER, DELIVERY & REJECTION POLICY',13.3,true,NAVY);
      policyText(paper.left,719,'Commercial terms and conditions  |  '+data.quoteNo,8,false,MUTED);
      policyRule(paper.left,705,paper.right-paper.left,LINE);
      cursor=686;
      if(pageIndex===1){
        const introLines=wrapPolicy(STARK_PACKMATE_POLICY_INTRO,490,8.6);
        const height=19+introLines.length*13;
        policyRect(paper.left,cursor-height,536,height,'#eff6ff');
        policyRect(paper.left,cursor-height,3,height,BLUE);
        introLines.forEach((v,i)=>policyText(52,cursor-18-i*13,v,8.6,false,NAVY));
        cursor-=height+21;
      }
    };
    newPage();
    for(const [sectionIndex, section] of STARK_PACKMATE_POLICY.entries()){
      const title=section.title.replace(/^\d+\.\s*/,'');
      const pointLines=section.points.map(point=>wrapPolicy(point,480,8.25));
      const needed=40+pointLines.reduce((total,lines)=>total+lines.length*12.5+10,0);
      // Keep a section on the same page when possible; if too long,
      // continue after a full paragraph with the section title repeated.
      if(cursor-needed<paper.bottom && cursor<490) newPage();
      let firstPart=true;
      const heading=()=>{
        const label=firstPart?title:title+' (continued)';
        policyRect(paper.left,cursor-26,536,27,'#edf2f7');
        policyRect(paper.left,cursor-26,3,27,BLUE);
        policyText(51,cursor-18,String(sectionIndex+1).padStart(2,'0'),9,true,BLUE);
        policyText(80,cursor-18,label,10.1,true,NAVY);
        cursor-=39;firstPart=false;
      };
      heading();
      for(const lines of pointLines){
        const paragraphHeight=lines.length*12.5+10;
        if(cursor-paragraphHeight<paper.bottom){
          newPage();
          heading();
        }
        policyRect(53,cursor-6,3,3,BLUE);
        lines.forEach((value,i)=>policyText(65,cursor-7-i*12.5,value,8.25,false,INK));
        cursor-=paragraphHeight;
      }
      cursor-=13;
    }
    const acknowledgement=wrapPolicy(STARK_PACKMATE_POLICY_ACKNOWLEDGEMENT,498,8.3);
    const acknowledgeHeight=23+acknowledgement.length*13;
    if(cursor-acknowledgeHeight<paper.bottom) newPage();
    policyRect(paper.left,cursor-acknowledgeHeight,536,acknowledgeHeight,'#eaf6f3');
    policyRect(paper.left,cursor-acknowledgeHeight,3,acknowledgeHeight,'#0f766e');
    acknowledgement.forEach((value,i)=>policyText(53,cursor-20-i*13,value,8.3,i===0,NAVY));
    policyPages.push(policyOps);
    for(const [index,operations] of policyPages.entries()){
      const footerY=41;
      operations.push(rgb(LINE)+' RG 0.6 w 38 61 m 574 61 l S');
      operations.push('BT '+rgb(MUTED)+' rg /FR 7 Tf 1 0 0 1 38 '+footerY+' Tm ('+
        pdfText('Stark Packmate | '+data.quoteNo+' | Commercial terms')+') Tj ET');
      operations.push('BT '+rgb(NAVY)+' rg /FB 7 Tf 1 0 0 1 519 '+footerY+' Tm ('+
        pdfText((index+1)+' / '+policyPages.length)+') Tj ET');
      const policyStream=operations.join(NL);
      const policyContent=add('<< /Length '+Buffer.byteLength(policyStream,'binary')+' >>'+NL+
        'stream'+NL+policyStream+NL+'endstream');
      pageRefs.push(add('<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /FR '+
        font+' 0 R /FB '+fontBold+' 0 R >> >> /Contents '+policyContent+' 0 R >>'));
    }
  }
  const pages = add(`<< /Type /Pages /Kids [${pageRefs.map(ref=>ref+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`);
  for(const pageRef of pageRefs) objects[pageRef-1]=objects[pageRef-1].replace('/Parent 0 0 R',`/Parent ${pages} 0 R`);
  const catalog = add(`<< /Type /Catalog /Pages ${pages} 0 R >>`);

  let pdf = `%PDF-1.4${NL}`;
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, 'binary')); pdf += `${index + 1} 0 obj${NL}${object}${NL}endobj${NL}`; });
  const xref = Buffer.byteLength(pdf, 'binary');
  pdf += `xref${NL}0 ${objects.length + 1}${NL}0000000000 65535 f ${NL}`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n ${NL}`; });
  pdf += `trailer${NL}<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>${NL}startxref${NL}${xref}${NL}%%EOF${NL}`;
  return Buffer.from(pdf, 'binary');
}

export async function GET(request: Request, { params }: { params: { quoteId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  const { quoteId } = params;
  const url=new URL(request.url);
  const token=String(url.searchParams.get('token')||'').trim();
  const download=url.searchParams.get('download')==='1';

  let workspace:any=null;
  let organizationId:string|null=null;
  let db:any=null;

  if(token){
    const admin=createAdminSupabaseClient() as any;
    if(!admin) return NextResponse.json({error:'Quote service is not configured.'},{status:500});
    const {data:publicQuote,error:publicError}=await admin.from('quotes')
      .select('id,organization_id,industry_metadata')
      .eq('id',quoteId)
      .contains('industry_metadata',{customer_review_token:token})
      .maybeSingle();
    if(publicError||!publicQuote?.id) return NextResponse.json({error:'Quote link not found.'},{status:404});
    organizationId=publicQuote.organization_id;
    db=admin;
  }else{
    workspace=await requireWorkspace();
    organizationId=workspace.organization?.id??null;
    if(!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
    db=(await createClient()) as any;
  }

  if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
  const resolvedOrganizationId=organizationId;
  const { data: quote, error } = await db.from('quotes').select('id, quote_number, lead_id, currency, display_currency, updated_at, created_at, valid_until, pricing_basis, destination_port, market_id, country_id, freight_profile_id, approval_required, approved_at, notes_customer').eq('organization_id', resolvedOrganizationId).eq('id', quoteId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });

  const { data: leadRow } = await db.from('leads').select('id, company_name, contact_name, email, phone, country').eq('organization_id', resolvedOrganizationId).eq('id', quote.lead_id).maybeSingle();
  const countryPromise = quote.country_id
    ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', resolvedOrganizationId).eq('id', quote.country_id).maybeSingle()
    : leadRow?.country
      ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', resolvedOrganizationId).ilike('name', leadRow.country).maybeSingle()
      : Promise.resolve({ data: null });

  const [{ data: items }, { data: org }, { data: country }, { data: freight }] = await Promise.all([
    db.from('quote_line_items').select('id, product_id, product_variant_id, quantity, unit_price, catalog_price_amount, is_price_overridden, override_reason, notes, line_type, input_snapshot_json, pricing_breakdown_json, calculation_version, packaging_family_id, packaging_size_profile_v5_id').eq('quote_id', quote.id).order('created_at', { ascending: true }),
    db.from('organizations').select('id, name, legal_name, logo_storage_path, registered_address, city, postal_code, headquarters_country, website, contact_email, tax_id, quote_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    countryPromise,
    quote.freight_profile_id ? db.from('freight_profiles').select('id, destination_port, notes').eq('organization_id', resolvedOrganizationId).eq('id', quote.freight_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const marketId = quote.market_id ?? country?.market_id ?? null;
  const { data: market } = marketId ? await db.from('markets').select('id, name').eq('organization_id', resolvedOrganizationId).eq('id', marketId).maybeSingle() : { data: null };
  const allLines=(items??[]) as any[];
  // Zero-price lead inquiry placeholders were never selected as customer quote lines.
  const lines=allLines.filter((line:any)=>
    !(line.input_snapshot_json?.source==='lead_requirement' && num(line.unit_price)<=0)
  );
  const productIds = Array.from(new Set(lines.map((line) => line.product_id).filter(Boolean)));
  const packagingFamilyIds = Array.from(new Set(lines.map((line) => line.packaging_family_id).filter(Boolean)));
  const packagingVariationIds = Array.from(new Set(lines.map((line) => line.packaging_product_variation_id).filter(Boolean)));
  const sizeProfileIds = Array.from(new Set(lines.map((line) => line.packaging_size_profile_v5_id ?? line.input_snapshot_json?.input?.size_profile_id).filter(Boolean)));
  const constructionIds = Array.from(new Set(lines.map((line) => line.input_snapshot_json?.input?.construction_id ?? line.input_snapshot_json?.construction_id).filter(Boolean)));
  const [{ data: products }, { data: variants }, { data: packagingFamilies }, { data: packagingVariations }, {data: sizeProfiles}, {data: constructions}] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code').eq('organization_id', resolvedOrganizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    productIds.length ? db.from('product_variants').select('id, product_id, name, sku_code').in('product_id', productIds) : Promise.resolve({ data: [] }),
    packagingFamilyIds.length ? db.from('packaging_service_families').select('id,name').eq('organization_id',resolvedOrganizationId).in('id',packagingFamilyIds) : Promise.resolve({data:[]}),
    packagingVariationIds.length ? db.from('packaging_product_variations').select('id,name,dimension_label,width_mm,height_mm,bottom_gusset_each_mm').in('id',packagingVariationIds) : Promise.resolve({data:[]}),
    sizeProfileIds.length ? db.from('packaging_size_profiles_v5').select('id,name,width_mm,height_mm,bottom_gusset_each_mm').eq('organization_id',resolvedOrganizationId).in('id',sizeProfileIds) : Promise.resolve({data:[]}),
    constructionIds.length ? db.from('packaging_constructions_v5').select('id,name').eq('organization_id',resolvedOrganizationId).in('id',constructionIds) : Promise.resolve({data:[]}),
  ]);

  const productMap = new Map((products ?? []).map((product: any) => [product.id, product]));
  const variantMap = new Map((variants ?? []).map((variant: any) => [variant.id, variant]));
  const familyMap = new Map((packagingFamilies ?? []).map((entry: any) => [String(entry.id),entry]));
  const packagingVariationMap = new Map((packagingVariations ?? []).map((entry: any) => [String(entry.id),entry]));
  const sizeProfileMap = new Map((sizeProfiles ?? []).map((entry:any)=>[String(entry.id),entry]));
  const constructionMap = new Map((constructions ?? []).map((entry:any)=>[String(entry.id),entry]));
  const quoteBase = quoteBasis(quote.pricing_basis);
  const currency = String(quote.display_currency ?? quote.currency ?? org?.default_currency ?? 'USD').toUpperCase();
  // Missing buyer country is common for Stark domestic leads; do not infer export terms
  // from the legacy quote pricing_basis default. A specified non-India country or export
  // destination explicitly keeps the export template.
  const buyerCountry = String(country?.name ?? leadRow?.country ?? '').trim().toLowerCase();
  const domesticQuote = isStarkPackmateOrganization(org) &&
    (buyerCountry === 'india' || buyerCountry === 'in' ||
      (!buyerCountry && currency === 'INR' && !quote.destination_port && !quote.country_id));
  const displayBasis = domesticQuote ? 'Direct' : quoteBase;
  const logoImage = await loadOrganizationLogo(db, resolvedOrganizationId, org);
  const { data: optionalCharges } = await db.from('quote_optional_charges').select('label, amount, currency').eq('organization_id', resolvedOrganizationId).eq('quote_id', quote.id);

  const v5TaxTotal = lines.reduce((sum, line) => line.line_type === 'packaging' && Number(line.calculation_version) === 5
    ? sum + Math.max(0, num(line.pricing_breakdown_json?.selling_price?.gst))
    : sum, 0);

  const rows: PdfRow[] = lines.map((line) => {
    if (line.line_type === 'packaging') {
      const qty = num(line.quantity, 1);
      const view=resolveFrameQuotePresentation(line);
      const unitPrice = num(line.unit_price);
      const snapshot = line.input_snapshot_json ?? {};
      const input = snapshot.input ?? {};
      const family: any = familyMap.get(String(line.packaging_family_id ?? snapshot.family_id ?? '')) ?? {};
      const variation: any = packagingVariationMap.get(String(line.packaging_product_variation_id ?? '')) ?? {};
      const product: any = productMap.get(line.product_id) ?? {};
      const sizeProfile:any = sizeProfileMap.get(String(line.packaging_size_profile_v5_id ?? input.size_profile_id ?? '')) ?? {};
      const construction:any = constructionMap.get(String(input.construction_id ?? snapshot.construction_id ?? '')) ?? {};
      const size = text(sizeProfile.name ?? (sizeProfile.width_mm && sizeProfile.height_mm ? [sizeProfile.width_mm,sizeProfile.height_mm,sizeProfile.bottom_gusset_each_mm].filter(Boolean).join(' x ')+' mm':null) ?? variation.dimension_label ?? input.dimension_label ?? snapshot.dimension_label ??
        (input.width_mm && input.height_mm ? [input.width_mm,input.height_mm,input.bottom_gusset_each_mm].filter(Boolean).join(' x ') + ' mm' : null),'');
      const substrate = text(construction.name ?? input.substrate ?? input.construction ?? input.material_construction ?? snapshot.substrate ?? snapshot.construction ?? snapshot.spec_summary,'');
      const productName = text(product.name ?? variation.name ?? snapshot.product_name ?? family.name,'Packaging item');
      const details = [
        family.name ? 'Family: ' + family.name : '',
        size ? 'Size: ' + size : '',
        substrate ? 'Substrate: ' + substrate : '',
      ].filter(Boolean).join(' | ');
      return { sku: text(product.sku_code ?? product.sku,'PKG'), product: productName, specification: details, qty: view.isFrame?view.displayQuantity:qty, basis:view.isFrame?(view.unit==='kg'?'kg':'pcs'):displayBasis, casePrice:view.isFrame?view.displayPrice:unitPrice, total:qty*unitPrice };
    }
    const product: any = productMap.get(line.product_id) ?? {};
    const variant: any = variantMap.get(line.product_variant_id) ?? {};
    const unitPrice = num(line.unit_price ?? line.catalog_price_amount);
    return { sku: text(variant.sku_code ?? product.sku_code ?? product.sku), product: text(product.name ?? variant.name, 'Catalog line'), qty: num(line.quantity, 1), basis: displayBasis, casePrice: unitPrice, total: num(line.quantity, 1) * unitPrice };
  });
  for (const charge of (optionalCharges ?? []) as any[]) {
    const amount = num(charge.amount);
    if (amount > 0) rows.push({ sku: '—', product: text(charge.label, 'Additional charge'), qty: 1, basis: displayBasis, casePrice: amount, total: amount });
  }

  const volumeSuggestions = lines
    .filter((line) => line.line_type === 'packaging' && Number(line.calculation_version) === 5 && (!resolveFrameQuotePresentation(line).isFrame || resolveFrameQuotePresentation(line).unit==='pcs'))
    .flatMap((line, lineIndex) => {
      const suggestions = customerVolumeSuggestions(
        line.quantity,
        line.unit_price,
        Array.isArray(line.pricing_breakdown_json?.suggested_quantities) ? line.pricing_breakdown_json.suggested_quantities : [],
        3,
      );
      if (!suggestions.length) return [];
      const prefix = lines.filter((item) => item.line_type === 'packaging' && Number(item.calculation_version) === 5).length > 1
        ? `Item ${lineIndex + 1}: `
        : '';
      const summary = suggestions.map((item: any) => `${Number(item.quantity).toLocaleString()} pcs @ ${money(item.unit_price, currency)}/pc · ${money(item.product_total, currency)} order${item.price_per_kg!=null?` · ${money(item.price_per_kg, currency)}/kg`:''} (${Number(item.savings_pct).toFixed(1)}% lower/pc)`).join(' | ');
      return [`${prefix}${summary}`];
    });

  const bytes = buildPdf({
    quoteNo: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    org: org ?? { name: workspace?.organization?.name ?? 'Seller' },
    buyer: leadRow ?? {},
    market: text(market?.name),
    destination: text(country?.name ?? leadRow?.country),
    place: text(quote.destination_port ?? freight?.destination_port ?? country?.default_port_of_loading, 'Confirm place before sending'),
    basis: displayBasis,
    domesticQuote,
    currency,
    quoteDate: dateText(quote.updated_at ?? quote.created_at),
    validUntil: dateText(quote.valid_until),
    terms: text(org?.quote_terms_conditions ?? quote.notes_customer, 'Prices are subject to validity, Incoterms basis, final order confirmation, agreed payment terms, and buyer destination charges unless included.'),
    rows,
    volumeSuggestions,
    taxTotal: v5TaxTotal,
    taxLabel: v5TaxTotal > 0 ? 'GST' : undefined,
    logoImage,
    includeStarkPolicy: isStarkPackmateOrganization(org),
  });

  if(!token){
    await db.from('documents').upsert({
      organization_id: resolvedOrganizationId,
      related_entity: 'quote',
      related_id: quote.id,
      file_name: `quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf`,
      file_url: `/api/quotes/${quote.id}/pdf`,
      doc_type: 'quote_pdf',
      uploaded_by: workspace.user?.id ?? null,
      uploaded_at: quote.updated_at ?? quote.created_at ?? new Date().toISOString(),
      version: 1,
      status: docStatus(quote),
      linked_quote_id: quote.id,
    }, { onConflict: 'organization_id,related_entity,related_id,file_name' }).then(() => null);
  }


  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quotation-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
