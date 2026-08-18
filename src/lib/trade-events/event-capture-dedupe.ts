type MatchInput = {
  organizationId: string;
  tradeEventId: string;
  leadType: 'buyer' | 'supplier';
  company: string;
  contact: string;
  email: string;
  phone: string;
};

export type EventCaptureIdentityMatch = {
  repeatEntry: { id: string; converted_lead_id?: string | null; captured_at?: string | null } | null;
  exactLead: { id: string; company_name?: string | null; contact_name?: string | null; lead_type?: string | null } | null;
  possibleLeadIds: string[];
};

const clean = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => clean(value).toLowerCase();
const digits = (value: unknown) => clean(value).replace(/\D/g, '');
const comparableCompany = (value: unknown) => lower(value).replace(/\b(pvt|private|ltd|limited|llp|inc|corp|corporation|company|co)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

function sameIdentity(left: { email?: string | null; phone?: string | null; company?: string | null; contact?: string | null }, right: MatchInput) {
  if (right.email && lower(left.email) === lower(right.email)) return true;
  const leftPhone = digits(left.phone);
  const rightPhone = digits(right.phone);
  if (leftPhone && rightPhone && leftPhone === rightPhone) return true;
  return Boolean(comparableCompany(left.company) && comparableCompany(left.company) === comparableCompany(right.company) && lower(left.contact) && lower(left.contact) === lower(right.contact));
}

export async function findEventCaptureIdentityMatch(db: any, input: MatchInput): Promise<EventCaptureIdentityMatch> {
  const repeatCandidates = new Map<string, any>();
  const collectEntries = async (query: any) => {
    const { data } = await query;
    for (const row of data ?? []) if (row?.id) repeatCandidates.set(row.id, row);
  };

  if (input.email) await collectEntries(db.from('trade_event_entries').select('id, converted_lead_id, captured_at, captured_email, captured_phone, captured_company_name, captured_contact_name').eq('organization_id', input.organizationId).eq('trade_event_id', input.tradeEventId).ilike('captured_email', input.email).limit(8));
  if (input.phone) await collectEntries(db.from('trade_event_entries').select('id, converted_lead_id, captured_at, captured_email, captured_phone, captured_company_name, captured_contact_name').eq('organization_id', input.organizationId).eq('trade_event_id', input.tradeEventId).eq('captured_phone', input.phone).limit(8));
  if (!input.email && !input.phone && input.company && input.contact) await collectEntries(db.from('trade_event_entries').select('id, converted_lead_id, captured_at, captured_email, captured_phone, captured_company_name, captured_contact_name').eq('organization_id', input.organizationId).eq('trade_event_id', input.tradeEventId).ilike('captured_company_name', input.company).ilike('captured_contact_name', input.contact).limit(8));

  const repeatEntry = Array.from(repeatCandidates.values()).find((row) => sameIdentity({ email: row.captured_email, phone: row.captured_phone, company: row.captured_company_name, contact: row.captured_contact_name }, input)) ?? null;

  const leadCandidates = new Map<string, any>();
  const collectLeads = async (query: any) => {
    const { data } = await query;
    for (const row of data ?? []) if (row?.id) leadCandidates.set(row.id, row);
  };
  const select = 'id, company_name, contact_name, email, phone, whatsapp_number, lead_type';
  if (input.email) await collectLeads(db.from('leads').select(select).eq('organization_id', input.organizationId).ilike('email', input.email).limit(10));
  if (input.phone) {
    await collectLeads(db.from('leads').select(select).eq('organization_id', input.organizationId).eq('phone', input.phone).limit(10));
    await collectLeads(db.from('leads').select(select).eq('organization_id', input.organizationId).eq('whatsapp_number', input.phone).limit(10));
  }
  if (input.company) await collectLeads(db.from('leads').select(select).eq('organization_id', input.organizationId).ilike('company_name', `%${input.company}%`).limit(12));
  if (input.contact) await collectLeads(db.from('leads').select(select).eq('organization_id', input.organizationId).ilike('contact_name', `%${input.contact}%`).limit(12));

  let exactLead: any = null;
  const possibleLeadIds: string[] = [];
  for (const lead of leadCandidates.values()) {
    const exactDirect = Boolean((input.email && lower(lead.email) === lower(input.email)) || (input.phone && [digits(lead.phone), digits(lead.whatsapp_number)].includes(digits(input.phone))));
    const exactNamed = Boolean(comparableCompany(lead.company_name) && comparableCompany(lead.company_name) === comparableCompany(input.company) && lower(lead.contact_name) && lower(lead.contact_name) === lower(input.contact));
    if ((exactDirect || exactNamed) && lower(lead.lead_type) === input.leadType && !exactLead) exactLead = lead;
    else if (exactDirect || exactNamed || comparableCompany(lead.company_name) === comparableCompany(input.company)) possibleLeadIds.push(lead.id);
  }

  return { repeatEntry, exactLead, possibleLeadIds: Array.from(new Set(possibleLeadIds)).slice(0, 5) };
}
