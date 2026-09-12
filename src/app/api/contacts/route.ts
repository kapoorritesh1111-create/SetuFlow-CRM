import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { normalizeIdentityEmail } from '@/lib/contacts/identity';

export const dynamic = 'force-dynamic';
const RELATIONSHIPS = new Set(['buyer','supplier','prospect','customer','vendor','other']);

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) };
  return { workspace, db: (await createClient()) as any };
}

function clean(value: unknown, max = 240) { return String(value ?? '').trim().slice(0, max); }
function relationship(value: unknown) { const key = clean(value, 32).toLowerCase(); return RELATIONSHIPS.has(key) ? key : 'other'; }

export async function GET(request: Request) {
  const ctx = await context(); if ('error' in ctx) return ctx.error;
  const { workspace, db } = ctx; const organizationId = workspace.organization.id;
  const url = new URL(request.url); const q = clean(url.searchParams.get('q'), 120).toLowerCase();
  const { data: rows, error } = await db.from('contacts')
    .select('id,first_name,last_name,company,job_title,email,normalized_email,phone,relationship_type,archived_at,created_at,updated_at')
    .eq('organization_id', organizationId).is('archived_at', null)
    .order('last_name', { ascending: true }).order('first_name', { ascending: true }).limit(500);
  if (error) return NextResponse.json({ error: 'Unable to load Contacts.' }, { status: 503 });
  const contacts = (rows ?? []).filter((row: any) => !q || [row.first_name,row.last_name,row.company,row.job_title,row.email,row.phone,row.relationship_type].filter(Boolean).join(' ').toLowerCase().includes(q));
  const ids = contacts.map((row: any) => row.id);
  const { data: links } = ids.length ? await db.from('contact_crm_links').select('id,contact_id,entity_type,entity_id').eq('organization_id', organizationId).in('contact_id', ids) : { data: [] };
  const { data: accessibleLeads } = await db.from('leads').select('id,lead_type,company_name,contact_name,email,job_title,updated_at').eq('organization_id', organizationId).limit(2000);
  const leadById = new Map((accessibleLeads ?? []).map((lead: any) => [lead.id, lead]));
  const leadsByEmail = new Map<string, any[]>();
  for (const lead of accessibleLeads ?? []) { const email = normalizeIdentityEmail(lead.email); if (!email) continue; const list = leadsByEmail.get(email) ?? []; list.push(lead); leadsByEmail.set(email, list); }
  const enriched = contacts.map((contact: any) => {
    const contactLinks = (links ?? []).filter((link: any) => link.contact_id === contact.id).map((link: any) => ({ ...link, record: leadById.get(link.entity_id) ?? null }));
    const linkedIds = new Set(contactLinks.map((link: any) => link.entity_id));
    const candidates = (leadsByEmail.get(normalizeIdentityEmail(contact.email)) ?? []).filter((lead: any) => !linkedIds.has(lead.id)).map((lead: any) => ({ id: lead.id, type: String(lead.lead_type).toLowerCase() === 'buyer' ? 'buyer' : String(lead.lead_type).toLowerCase() === 'supplier' ? 'supplier' : 'lead', company_name: lead.company_name, contact_name: lead.contact_name, email: lead.email, href: `/leads/${lead.id}` }));
    return { ...contact, links: contactLinks, candidates };
  });
  return NextResponse.json({ contacts: enriched, autonomousLeadCreation: false }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const ctx = await context(); if ('error' in ctx) return ctx.error;
  const { workspace, db } = ctx; const organizationId = workspace.organization.id;
  const body = await request.json().catch(() => ({}));
  const email = normalizeIdentityEmail(body.email);
  if (!email) return NextResponse.json({ error: 'Add a valid email address.' }, { status: 400 });
  const { data: duplicate } = await db.from('contacts').select('id,archived_at').eq('organization_id', organizationId).eq('normalized_email', email).maybeSingle();
  if (duplicate) return NextResponse.json({ error: duplicate.archived_at ? 'A contact with this email is archived. Restore or edit that contact instead.' : 'A contact with this email already exists.', existingId: duplicate.id }, { status: 409 });
  const values = {
    organization_id: organizationId, first_name: clean(body.firstName, 120), last_name: clean(body.lastName, 120), company: clean(body.company, 200) || null,
    job_title: clean(body.jobTitle, 160) || null, email, phone: clean(body.phone, 80) || null, relationship_type: relationship(body.relationshipType), created_by: workspace.user.id,
  };
  if (!values.first_name && !values.last_name && !values.company) return NextResponse.json({ error: 'Add a name or company.' }, { status: 400 });
  const { data: contact, error } = await db.from('contacts').insert(values).select('*').single();
  if (error || !contact) return NextResponse.json({ error: error?.code === '23505' ? 'A contact with this email already exists.' : 'Unable to create Contact.' }, { status: error?.code === '23505' ? 409 : 503 });
  return NextResponse.json({ contact, leadCreated: false }, { status: 201 });
}
