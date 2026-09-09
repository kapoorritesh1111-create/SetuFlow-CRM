import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const MAX_ROWS = 500;
type Row = { contactName?:string; company?:string; mobile?:string; email?:string; city?:string; address?:string; country?:string; requirement?:string; notes?:string; assignedTo?:string; source?:string; profile?:string };
const clean = (v:unknown,n=2000) => String(v ?? '').trim().slice(0,n);
const phone = (v:unknown) => clean(v,80).replace(/\D/g,'');
const email = (v:unknown) => clean(v,254).toLowerCase();

const INDIA_LOCATION_PATTERNS: Array<[RegExp,string]> = [
  [/\b(india|bharat)\b/i,'explicit India location text'],
  [/\b(delhi|new delhi|ncr|saket|mehrauli|ashok vihar|gadodia market)\b/i,'Delhi/NCR location'],
  [/\b(noida|nodia|greater noida|ghaziabad|sahibabad|hapur|agra|lucknow|kanpur|meerut|uttar pradesh|\bup\b)\b/i,'Uttar Pradesh location'],
  [/\b(gurugram|gurgaon|faridabad|manesar|haryana)\b/i,'Haryana location'],
  [/\b(bikaner|jaipur|jodhpur|udaipur|kota|rajasthan)\b/i,'Rajasthan location'],
  [/\b(ludhiana|amritsar|jalandhar|mohali|chandigarh|punjab)\b/i,'Punjab/Chandigarh location'],
  [/\b(mumbai|bombay|pune|thane|navi mumbai|nagpur|maharashtra)\b/i,'Maharashtra location'],
  [/\b(bangalore|bengaluru|mysore|mysuru|mangalore|karnataka)\b/i,'Karnataka location'],
  [/\b(chennai|coimbatore|madurai|tiruppur|tamil nadu)\b/i,'Tamil Nadu location'],
  [/\b(hyderabad|secunderabad|telangana)\b/i,'Telangana location'],
  [/\b(kolkata|calcutta|howrah|west bengal)\b/i,'West Bengal location'],
  [/\b(ahmedabad|surat|vadodara|baroda|rajkot|gujarat)\b/i,'Gujarat location'],
  [/\b(indore|bhopal|madhya pradesh)\b/i,'Madhya Pradesh location'],
  [/\b(kochi|cochin|ernakulam|kerala)\b/i,'Kerala location'],
  [/\b(bhubaneswar|odisha|orissa)\b/i,'Odisha location'],
];

function indiaEvidence(value:string) {
  for (const [pattern,basis] of INDIA_LOCATION_PATTERNS) if (pattern.test(value)) return basis;
  return null;
}

function inferRequirement(row: Row) {
  const explicit = clean(row.requirement,1000);
  if (explicit) return { value: explicit, confidence: 'explicit' as const, basis: 'spreadsheet requirement/product column' };
  const source = clean(row.notes,4000);
  if (!source) return { value: '', confidence: 'unknown' as const, basis: '' };
  const normalized = source.replace(/\s+/g,' ').trim();
  const found: string[] = [];
  const add = (value:string) => { if (!found.some((item) => item.toLowerCase() === value.toLowerCase())) found.push(value); };

  if (/\bstand\s*[- ]?up\s+pouch(?:es)?\b/i.test(normalized)) add('Stand-up pouch');
  if (/\b3\s*[- ]?side\s+seal(?:\s+(?:pouch|pouches))?\b/i.test(normalized)) add(/\bzipper\b/i.test(normalized) ? '3-side seal pouch with zipper' : '3-side seal pouch');
  if (/\bzipper\s+pouch(?:es)?\b/i.test(normalized) && !found.some((x) => x.includes('zipper'))) add('Zipper pouch');
  if (/\b(flat\s*bottom|box)\s+pouch(?:es)?\b/i.test(normalized)) add('Flat-bottom pouch');
  if (/\bspout\s+pouch(?:es)?\b/i.test(normalized)) add('Spout pouch');
  if (/\bretort\s+pouch(?:es)?\b/i.test(normalized)) add('Retort pouch');
  if (/\blabel(?:s)?\b/i.test(normalized)) add('Labels');
  if (/\bsleeve(?:s)?\b/i.test(normalized)) add('Sleeves');
  if (/\blaminate(?:s|ion)?\b/i.test(normalized)) add('Laminates');
  if (/\bprinted\s+(?:pouch|pouches|packaging)\b/i.test(normalized)) add('Printed packaging');
  if (/\b(?:flexible\s+)?packaging\b/i.test(normalized) && !found.length) add('Packaging requirement');
  if (/\bpouch(?:es)?\b/i.test(normalized) && !found.some((x) => /pouch/i.test(x))) add('Pouches');

  const quantityMatches = normalized.match(/\b(?:\d+(?:\.\d+)?\s*(?:k|K|thousand|lakh|lac|million)?\s*(?:pcs|pieces|units)?(?:\s*\/\s*sku|\s+per\s+sku)?|per\s+sku\s+\d+(?:\.\d+)?\s*(?:k|K|thousand|lakh|lac)?\s*(?:pcs|pieces|units)?)\b/g) ?? [];
  const quantity = quantityMatches.map((x) => x.trim()).find((x) => /\d/.test(x) && /(pcs|pieces|units|sku|\bk\b|thousand|lakh|lac|million)/i.test(x));
  const skuMatch = normalized.match(/\b(\d+)\s*sku(?:s)?\b/i);
  const sizes = normalized.match(/\b\d+(?:\s*\/\s*\d+){1,5}\s*(?:gm|g|kg|ml|ltr|litre|liter)s?\b/i)?.[0];
  if (quantity) add(quantity.replace(/\s+/g,' '));
  if (skuMatch) add(`${skuMatch[1]} SKUs`);
  if (sizes) add(`Pack sizes ${sizes}`);

  return found.length
    ? { value: found.join(' · '), confidence: 'inferred' as const, basis: 'Setu Guru extracted product/quantity evidence from notes and remarks' }
    : { value: '', confidence: 'unknown' as const, basis: '' };
}

export async function POST(request:Request) {
  const w = await requireWorkspace();
  if (!w.organization || !w.user || !w.membership) return NextResponse.json({error:'Workspace access required.'},{status:401});
  const roles = w.currentRoles.map(r => String(r).toLowerCase());
  const field = roles.includes('field_sales');
  if (!w.canAccessAdmin && !roles.some(r => ['owner','manager','admin','sales','field_sales'].includes(r))) return NextResponse.json({error:'Your role does not allow lead import.'},{status:403});
  const body = await request.json().catch(() => null) as {action?:string;rows?:Row[];assignUserId?:string;fileName?:string}|null;
  const rows = Array.isArray(body?.rows) ? body!.rows : [];
  if (!rows.length || rows.length > MAX_ROWS) return NextResponse.json({error:`Provide 1-${MAX_ROWS} lead rows.`},{status:400});

  const db = createAdminSupabaseClient() as any;
  const {data:members} = await db.from('organization_members').select('user_id,profiles(email,full_name)').eq('organization_id',w.organization.id).eq('is_active',true);
  const directory = (members ?? []).map((m:any) => { const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles; return {userId:String(m.user_id),name:clean(p?.full_name,160),email:email(p?.email)}; });
  const me = directory.find((m:any) => m.userId === w.user!.id);
  const forced = field ? me : (body?.assignUserId ? directory.find((m:any) => m.userId === body.assignUserId) : null);

  const {data:countries} = await db.from('countries').select('id,name,iso2_code,phone_code,market_id,search_aliases,markets(name)').eq('organization_id',w.organization.id).eq('is_active',true);
  const countryList = countries ?? [];
  const {data:existing} = await db.from('leads').select('id,phone,whatsapp_number,email').eq('organization_id',w.organization.id);
  const phones = new Set((existing ?? []).flatMap((x:any) => [phone(x.phone),phone(x.whatsapp_number)]).filter(Boolean));
  const emails = new Set((existing ?? []).map((x:any) => email(x.email)).filter(Boolean));
  const seenP = new Set<string>(), seenE = new Set<string>();
  const previewRows:any[] = [], inserts:any[] = [];
  let dup = 0, err = 0;

  for (let i=0;i<rows.length;i++) {
    const r = rows[i], company = clean(r.company,200), contact = clean(r.contactName,160), p = phone(r.mobile), e = email(r.email);
    const location = [r.address,r.city,r.country].map(x => clean(x,300)).filter(Boolean).join(', ');
    const errors:string[] = [];
    if (!company && !contact) errors.push('Company or Contact Name is required.');
    if (!p && !e) errors.push('Mobile or Email is required.');
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.push('Email format is not valid.');

    let owner = forced || me;
    const wanted = clean(r.assignedTo,160).toLowerCase();
    if (!field && !body?.assignUserId && wanted) {
      const match = directory.filter((m:any) => m.email === wanted || m.name.toLowerCase() === wanted);
      if (match.length === 1) owner = match[0];
    }
    if (!owner) errors.push('A valid owner is required.');

    let c:any = null, confidence = 'unknown', basis = '';
    const explicit = clean(r.country,100).toLowerCase();
    if (explicit) {
      c = countryList.find((x:any) => String(x.name).toLowerCase() === explicit || String(x.iso2_code).toLowerCase() === explicit);
      if (c) { confidence = 'confirmed'; basis = 'spreadsheet country'; }
    }
    const indiaBasis = !c ? indiaEvidence(location) : null;
    if (!c && indiaBasis) {
      c = countryList.find((x:any) => String(x.iso2_code).toUpperCase() === 'IN');
      if (c) { confidence = 'high'; basis = indiaBasis; }
    }
    if (!c && /^91\d{10}$/.test(p)) {
      c = countryList.find((x:any) => String(x.iso2_code).toUpperCase() === 'IN');
      if (c) { confidence = 'high'; basis = 'Indian +91 phone country code'; }
    }

    const requirement = inferRequirement(r);
    const duplicate = (p && (phones.has(p) || seenP.has(p))) || (e && (emails.has(e) || seenE.has(e)));
    if (p) seenP.add(p); if (e) seenE.add(e);
    const marketName = Array.isArray(c?.markets) ? c.markets[0]?.name : c?.markets?.name;
    const previewBase = {row:i+2,ownerName:owner?.name,countryName:c?.name??null,marketName:marketName??null,countryConfidence:confidence,countryBasis:basis,requirement:requirement.value||null,requirementConfidence:requirement.confidence,requirementBasis:requirement.basis};

    if (errors.length) { err++; previewRows.push({...previewBase,status:'error',message:errors.join(' ')}); continue; }
    if (duplicate) { dup++; previewRows.push({...previewBase,status:'duplicate',message:'Possible duplicate by Mobile or Email.'}); continue; }

    previewRows.push({...previewBase,status:'ready',message:c?`Ready · ${c.name} (${confidence})`:'Ready · Country not confirmed'});
    inserts.push({
      organization_id:w.organization.id, lead_type:'buyer', owner_user_id:owner.userId, created_by:w.user.id, updated_by:w.user.id,
      company_name:company||contact, contact_name:contact||company, job_title:clean(r.profile,160)||null,
      phone:clean(r.mobile,80)||null, whatsapp_number:clean(r.mobile,80)||null, email:e||null,
      country:c?.name??null, country_id:c?.id??null, market_id:c?.market_id??null,
      products_or_needs:requirement.value||null, notes:clean(r.notes)||null,
      source_type:'import', source_label:clean(r.source,160)||(field?'Field Sales Import':'Imported Prospect List'),
      industry_metadata:{city:clean(r.city,120)||null,address:clean(r.address,500)||null,country_inference:{confidence,basis,original:clean(r.country,100)||null},requirement_inference:{confidence:requirement.confidence,basis:requirement.basis,original:clean(r.requirement,1000)||null}}
    });
  }

  const summary = {found:rows.length,ready:inserts.length,duplicates:dup,corrections:err};
  if (body?.action !== 'commit') return NextResponse.json({imported:0,...summary,previewRows});
  if (!inserts.length) return NextResponse.json({imported:0,...summary,previewRows},{status:400});
  const {data:inserted,error:insertError} = await db.from('leads').insert(inserts).select('id');
  if (insertError) return NextResponse.json({error:insertError.message,...summary,previewRows},{status:500});
  return NextResponse.json({imported:inserted?.length??inserts.length,...summary,previewRows});
}
