export type IdentityCrmRecord = {
  type: 'lead' | 'buyer' | 'supplier';
  id: string;
  lead_type: string | null;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  job_title?: string | null;
  href: string;
};

export type CommunicationIdentity = {
  email: string;
  contact: null | {
    id: string;
    first_name: string;
    last_name: string;
    company: string | null;
    job_title: string | null;
    email: string;
    phone: string | null;
    relationship_type: string;
    href: string;
  };
  records: IdentityCrmRecord[];
};

export function normalizeIdentityEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase();
  return email.includes('@') && email.length <= 320 ? email : '';
}

function leadRecord(row: any): IdentityCrmRecord {
  const leadType = String(row?.lead_type ?? '').toLowerCase();
  const type: IdentityCrmRecord['type'] = leadType === 'buyer' ? 'buyer' : leadType === 'supplier' ? 'supplier' : 'lead';
  return {
    type,
    id: String(row.id),
    lead_type: row.lead_type ?? null,
    company_name: row.company_name ?? null,
    contact_name: row.contact_name ?? null,
    email: row.email ?? null,
    job_title: row.job_title ?? null,
    href: `/leads/${row.id}`,
  };
}

export async function matchCommunicationIdentity(db: any, organizationId: string, rawEmail: unknown): Promise<CommunicationIdentity> {
  const email = normalizeIdentityEmail(rawEmail);
  if (!email) return { email: '', contact: null, records: [] };

  const [{ data: contact }, { data: directLeads }] = await Promise.all([
    db.from('contacts')
      .select('id,first_name,last_name,company,job_title,email,phone,relationship_type')
      .eq('organization_id', organizationId)
      .eq('normalized_email', email)
      .is('archived_at', null)
      .maybeSingle(),
    db.from('leads')
      .select('id,lead_type,company_name,contact_name,email,job_title,updated_at')
      .eq('organization_id', organizationId)
      .ilike('email', email)
      .order('updated_at', { ascending: false })
      .limit(10),
  ]);

  let linkedLeads: any[] = [];
  if (contact?.id) {
    const { data: links } = await db.from('contact_crm_links')
      .select('entity_id')
      .eq('organization_id', organizationId)
      .eq('contact_id', contact.id);
    const ids = [...new Set((links ?? []).map((row: any) => String(row.entity_id)).filter(Boolean))];
    if (ids.length) {
      const { data } = await db.from('leads')
        .select('id,lead_type,company_name,contact_name,email,job_title,updated_at')
        .eq('organization_id', organizationId)
        .in('id', ids);
      linkedLeads = data ?? [];
    }
  }

  const merged = new Map<string, any>();
  for (const row of [...(directLeads ?? []), ...linkedLeads]) if (row?.id) merged.set(String(row.id), row);
  const records = [...merged.values()].map(leadRecord);

  return {
    email,
    contact: contact ? {
      id: contact.id,
      first_name: contact.first_name ?? '',
      last_name: contact.last_name ?? '',
      company: contact.company ?? null,
      job_title: contact.job_title ?? null,
      email: contact.email,
      phone: contact.phone ?? null,
      relationship_type: contact.relationship_type,
      href: `/contacts?id=${contact.id}`,
    } : null,
    records,
  };
}

export function primaryIdentityMatch(identity: CommunicationIdentity) {
  if (identity.contact) {
    const name = `${identity.contact.first_name} ${identity.contact.last_name}`.trim();
    return {
      type: 'contact' as const,
      id: identity.contact.id,
      company_name: identity.contact.company,
      contact_name: name || identity.contact.email,
      relationship_type: identity.contact.relationship_type,
      email: identity.contact.email,
      job_title: identity.contact.job_title,
      href: identity.contact.href,
    };
  }
  return identity.records[0] ?? null;
}
