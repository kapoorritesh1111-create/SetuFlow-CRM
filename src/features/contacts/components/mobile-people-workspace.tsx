'use client';

import themeStyles from '@/components/layout/communication-theme.module.css';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Archive, CalendarPlus, Mail, Menu, MessageCircle, Pencil, PhoneCall, Plus, Search, Star, UserRound, X } from 'lucide-react';

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  job_title: string | null;
  department: string | null;
  contact_role: string | null;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  relationship_type: string;
  links?: Array<{ entity_id:string; entity_type:string; is_primary?:boolean }>;
};

type FormState = {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  department: string;
  contactRole: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  relationshipType: string;
  isPrimary: boolean;
};

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  company: '',
  jobTitle: '',
  department: '',
  contactRole: '',
  email: '',
  phone: '',
  whatsappNumber: '',
  relationshipType: 'other',
  isPrimary: false,
};

const RELATIONSHIPS = ['buyer', 'supplier', 'prospect', 'customer', 'vendor', 'other'];
const DEPARTMENTS=['Purchasing / Procurement','Management / Owner','Finance / Accounts','Design / Creative','Operations','Logistics / Supply Chain','Quality / Compliance','Technical / Engineering','Sales','Marketing','Warehouse / Dispatch','Other'];
const CONTACT_ROLES=['Decision Maker','Buyer / Purchasing Contact','Approver','Influencer','Finance / Accounts Payable','Design Contact','Technical Contact','Operations Contact','Logistics / Delivery Contact','Owner / Director','Other'];
const title = (value: string) => value ? value[0].toUpperCase() + value.slice(1) : value;
const displayName = (contact: Contact) => `${contact.first_name} ${contact.last_name}`.trim() || contact.company || contact.email;
const initials = (contact: Contact) => {
  const value = displayName(contact).trim();
  const parts = value.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
};
const secondary = (contact: Contact) => contact.phone || contact.email || contact.company || title(contact.relationship_type);

export function MobilePeopleWorkspace() {
  const params=useSearchParams();const leadId=params.get('lead')||'';const leadCompany=params.get('company')||'';const leadContactName=params.get('contactName')||'';const leadParts=leadContactName.trim().split(/\s+/).filter(Boolean);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(params.get('create')==='1');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormState>({...EMPTY,firstName:leadParts[0]||'',lastName:leadParts.slice(1).join(' '),company:leadCompany,jobTitle:params.get('jobTitle')||'',email:params.get('email')||'',phone:params.get('phone')||'',whatsappNumber:params.get('phone')||'',relationshipType:leadId?'buyer':'other',isPrimary:Boolean(leadId)});
  const [saving, setSaving] = useState(false);

  async function load(query = search) {
    setLoading(true);
    try {
      const response = await fetch(`/api/contacts?q=${encodeURIComponent(query)}${leadId?`&lead=${encodeURIComponent(leadId)}`:''}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load People.');
      const next = [...(payload.contacts || [])] as Contact[];
      next.sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' }));
      setContacts(next);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load People.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(search), search ? 220 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const groups = useMemo(() => contacts.reduce<Record<string, Contact[]>>((acc, contact) => {
    const first = displayName(contact).charAt(0).toUpperCase();
    const key = /[A-Z]/.test(first) ? first : '#';
    (acc[key] ??= []).push(contact);
    return acc;
  }, {}), [contacts]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, company:leadCompany, relationshipType:leadId?'buyer':'other', isPrimary:Boolean(leadId&&contacts.length===0) });
    setFormOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setForm({
      firstName: contact.first_name,
      lastName: contact.last_name,
      company: contact.company || '',
      jobTitle: contact.job_title || '',
      department: contact.department || '',
      contactRole: contact.contact_role || '',
      email: contact.email,
      phone: contact.phone || '',
      whatsappNumber: contact.whatsapp_number || '',
      relationshipType: contact.relationship_type,
      isPrimary: Boolean(contact.links?.some(link=>link.is_primary)),
    });
    setFormOpen(true);
  }

  async function save() {
    if (!form.email.trim()) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch(editing ? `/api/contacts/${editing.id}` : '/api/contacts', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, leadId: editing ? '' : leadId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save contact.');
      setFormOpen(false);
      await load();
      if (payload.contact?.id) {
        const refreshed = await fetch(`/api/contacts?q=${encodeURIComponent(payload.contact.email || '')}`, { cache: 'no-store' });
        const refreshedPayload = await refreshed.json().catch(() => ({}));
        const contact = refreshedPayload.contacts?.find((item: Contact) => item.id === payload.contact.id);
        if (contact) setSelected(contact);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save contact.');
    } finally {
      setSaving(false);
    }
  }

  async function archive(contact: Contact) {
    if (!confirm(`Archive ${displayName(contact)}? This does not delete or change any Lead.`)) return;
    const response = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error || 'Unable to archive contact.');
      return;
    }
    setSelected(null);
    await load();
  }

  return (
    <div className={`${themeStyles.scope} min-h-[calc(100vh-4rem)] bg-surface-1 pb-24 text-content-primary md:hidden`}>
      <header className={`${themeStyles.safeHeader} sticky top-0 z-30 bg-brand-800 text-white shadow-sm`}>
        <div className="flex h-14 items-center gap-2 px-3">
          <button type="button" onClick={() => setMenuOpen(open => !open)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Open communications menu"><Menu size={22} /></button>
          <h1 className="min-w-0 flex-1 text-[19px] font-semibold">People</h1>
          <button type="button" onClick={() => setSearchOpen(open => !open)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Search people"><Search size={21} /></button>
          <div className="grid h-8 w-8 place-items-center rounded-full border border-line border-white/60 bg-white/15 text-[10px] font-bold">SF</div>
        </div>
        {searchOpen ? (
          <div className="px-3 pb-3">
            <label className="flex h-10 items-center gap-2 rounded-xl bg-surface-1 px-3 text-content-secondary shadow-sm">
              <Search size={17} className="text-content-muted" />
              <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              {search ? <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={16} /></button> : null}
            </label>
            {leadId?<label className="flex items-center gap-2 text-xs font-semibold text-content-secondary"><input type="checkbox" checked={form.isPrimary} onChange={event=>setForm({...form,isPrimary:event.target.checked})}/>Primary contact for this lead</label>:null}
            <datalist id="mobile-contact-departments">{DEPARTMENTS.map(item=><option key={item} value={item}/>)}</datalist><datalist id="mobile-contact-roles">{CONTACT_ROLES.map(item=><option key={item} value={item}/>)}</datalist>
          </div>
        ) : null}
        {menuOpen ? (
          <div className="absolute left-3 top-12 z-50 w-56 overflow-hidden rounded-xl bg-surface-1 py-1 text-sm font-semibold text-content-secondary shadow-2xl ring-1 ring-black/5">
            <Link href="/mail" className="block px-4 py-3 hover:bg-surface-2" onClick={() => setMenuOpen(false)}>Mail</Link>
            <Link href="/calendar" className="block px-4 py-3 hover:bg-surface-2" onClick={() => setMenuOpen(false)}>Calendar</Link>
            <Link href="/contacts" className="block bg-surface-2 px-4 py-3 text-content-accent" onClick={() => setMenuOpen(false)}>People</Link>
          </div>
        ) : null}
      </header>

      <main className="pb-6">
        {loading ? <div className="px-5 py-12 text-center text-sm font-semibold text-content-muted">Loading people…</div> : null}
        {!loading && !contacts.length ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-content-accent"><UserRound size={26} /></div>
            <h2 className="mt-4 text-lg font-bold">No people yet</h2>
            <p className="mt-1 text-sm text-content-muted">Add a contact to make email and meeting scheduling faster.</p>
            <button type="button" onClick={openNew} className="mt-5 rounded-xl bg-brand-800 px-5 py-3 text-sm font-bold text-white">Add person</button>
          </div>
        ) : null}
        {!loading ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([letter, list]) => (
          <section key={letter}>
            <div className="sticky top-14 z-10 bg-surface-1 px-4 py-1.5 text-[11px] font-semibold uppercase text-content-muted backdrop-blur">{letter}</div>
            <div>{list.map(contact => (
              <button key={contact.id} type="button" onClick={() => setSelected(contact)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-semibold text-white">{initials(contact)}</div>
                <div className="min-w-0 flex-1 border-b border-line border-line pb-3">
                  <div className="truncate text-[15px] font-medium text-content-primary">{displayName(contact)}</div>
                  <div className="mt-0.5 truncate text-[13px] text-content-muted">{secondary(contact)}</div>
                </div>
              </button>
            ))}</div>
          </section>
        )) : null}
      </main>

      <button type="button" onClick={openNew} className="fixed bottom-[82px] right-5 z-[410] grid h-14 w-14 place-items-center rounded-full bg-brand-800 text-white shadow-card" aria-label="Add person"><Plus size={28} /></button>

      {selected ? (
        <div className="fixed inset-0 z-[520] overflow-y-auto bg-surface-1 md:hidden">
          <div className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line border-line bg-surface-1 px-2">
            <button type="button" onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-full text-content-secondary" aria-label="Back to people"><ArrowLeft size={21} /></button>
            <div className="min-w-0 flex-1 truncate text-base font-semibold">Person</div>
            <button type="button" onClick={() => openEdit(selected)} className="grid h-10 w-10 place-items-center rounded-full text-content-secondary" aria-label="Edit person"><Pencil size={19} /></button>
          </div>
          <div className="px-5 pb-28 pt-8">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-700 text-2xl font-semibold text-white">{initials(selected)}</div>
            <h2 className="mt-4 text-center text-2xl font-semibold text-content-primary">{displayName(selected)}</h2>
            <p className="mt-1 text-center text-sm text-content-muted">{[selected.job_title, selected.department, selected.company].filter(Boolean).join(' · ') || title(selected.relationship_type)}</p>{selected.contact_role?<p className="mt-2 text-center text-xs font-semibold text-content-secondary">{selected.contact_role}</p>:null}{selected.links?.some(link=>link.is_primary)?<div className="mt-2 flex justify-center"><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"><Star size={12}/>Primary contact</span></div>:null}
            <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3"><Link href={`/mail?compose=1&to=${encodeURIComponent(selected.email)}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-800 text-sm font-semibold text-white"><Mail size={17}/>Email</Link>{selected.whatsapp_number||selected.phone?<a href={`https://wa.me/${String(selected.whatsapp_number||selected.phone).replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700"><MessageCircle size={17}/>WhatsApp</a>:null}{selected.phone?<a href={`tel:${selected.phone}`} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-content-secondary"><PhoneCall size={17}/>Call</a>:null}<Link href={`/calendar?compose=1&guest=${encodeURIComponent(selected.email)}&contact=${selected.id}`} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-content-secondary"><CalendarPlus size={17}/>Meeting</Link></div>
            <div className="mx-auto mt-7 max-w-sm overflow-hidden rounded-2xl border border-line border-line bg-surface-1">
              <Info label="Email" value={selected.email} />
              <Info label="Phone" value={selected.phone || '—'} />
              <Info label="WhatsApp" value={selected.whatsapp_number || selected.phone || '—'} />
              <Info label="Department" value={selected.department || '—'} />
              <Info label="Role" value={selected.contact_role || selected.job_title || '—'} />
              <Info label="Company" value={selected.company || '—'} />
              <Info label="Relationship" value={title(selected.relationship_type)} last />
            </div>
            <button type="button" onClick={() => void archive(selected)} className="mx-auto mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-danger-fg"><Archive size={17} />Archive person</button>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <div className="fixed inset-0 z-[560] overflow-y-auto bg-surface-1 md:hidden">
          <div className="sticky top-0 z-20 flex h-14 items-center border-b border-line border-line bg-surface-1 px-3">
            <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full text-content-secondary" aria-label="Close person form"><X size={20} /></button>
            <div className="ml-1 min-w-0 flex-1 text-base font-semibold">{editing ? 'Edit Person' : 'New Person'}</div>
            <button type="button" disabled={saving || !form.email.trim()} onClick={() => void save()} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
          <div className="space-y-4 p-4 pb-24">
            <MobileField label="First name" value={form.firstName} onChange={value => setForm({ ...form, firstName: value })} />
            <MobileField label="Last name" value={form.lastName} onChange={value => setForm({ ...form, lastName: value })} />
            <MobileField label="Company" value={form.company} onChange={value => setForm({ ...form, company: value })} />
            <MobileField label="Job title" value={form.jobTitle} onChange={value => setForm({ ...form, jobTitle: value })} />
            <MobileField label="Department" value={form.department} onChange={value => setForm({ ...form, department: value })} list="mobile-contact-departments" />
            <MobileField label="Contact role" value={form.contactRole} onChange={value => setForm({ ...form, contactRole: value })} list="mobile-contact-roles" />
            <MobileField label="Email" type="email" value={form.email} onChange={value => setForm({ ...form, email: value })} />
            <MobileField label="Phone" type="tel" value={form.phone} onChange={value => setForm({ ...form, phone: value })} />
            <MobileField label="WhatsApp" type="tel" value={form.whatsappNumber} onChange={value => setForm({ ...form, whatsappNumber: value })} />
            <label className="block text-xs font-semibold text-content-secondary">Relationship
              <select value={form.relationshipType} onChange={event => setForm({ ...form, relationshipType: event.target.value })} className="mt-1 h-12 w-full rounded-xl border border-line border-line bg-surface-1 px-3 text-sm font-medium text-content-primary outline-none focus:border-accent-500">
                {RELATIONSHIPS.map(item => <option key={item} value={item}>{title(item)}</option>)}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {notice ? <div className="fixed inset-x-4 bottom-24 z-[600] rounded-xl bg-brand-800 px-4 py-3 text-sm text-white shadow-xl">{notice}</div> : null}
    </div>
  );
}

function Info({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={`px-4 py-3 ${last ? '' : 'border-b border-line border-line'}`}><div className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">{label}</div><div className="mt-1 break-words text-sm font-medium text-content-primary">{value}</div></div>;
}

function MobileField({ label, value, onChange, type = 'text', list }: { label: string; value: string; onChange: (value: string) => void; type?: string; list?: string }) {
  return <label className="block text-xs font-semibold text-content-secondary">{label}<input type={type} list={list} value={value} onChange={event => onChange(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-line border-line px-3 text-sm font-medium text-content-primary outline-none focus:border-accent-500" /></label>;
}
