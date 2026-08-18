'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, PackageSearch, Sparkles } from 'lucide-react';
import { GuruAvatar } from '@/components/ui/guru-avatar';
import { workspaceFieldSurfaceClass, workspaceHeroClass, workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';
import type { IcpProfile, IcpProfileInput } from '@/lib/setu-guru/icp';

type FormState = {
  id?: string;
  name: string; products: string; target_countries: string; buyer_types: string; supplier_types: string;
  moq_note: string; preferred_currency: string; available_documents: string; required_documents: string;
  outreach_channel: '' | 'whatsapp' | 'email' | 'linkedin';
  outreach_tone: '' | 'short' | 'warm' | 'professional' | 'trade_show_follow_up';
  packaging_families: string; end_use_sectors: string; materials: string; print_methods: string;
  quantity_bands: string; artwork_states: string; sustainability_needs: string; regulated_uses: string;
  services: string; lead_time_priorities: string;
};

const EMPTY: FormState = {
  name: 'Default ICP', products: '', target_countries: '', buyer_types: '', supplier_types: '', moq_note: '', preferred_currency: '',
  available_documents: '', required_documents: '', outreach_channel: '', outreach_tone: '', packaging_families: '', end_use_sectors: '',
  materials: '', print_methods: '', quantity_bands: '', artwork_states: '', sustainability_needs: '', regulated_uses: '', services: '', lead_time_priorities: '',
};
const list = (value?: string[] | null) => (value ?? []).join(', ');
const parse = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 80);
const profileList = (profile: IcpProfile | null, key: string) => list(Array.isArray(profile?.vertical_profile?.[key]) ? profile?.vertical_profile?.[key] as string[] : []);

function toForm(profile: IcpProfile | null): FormState {
  if (!profile) return EMPTY;
  return {
    ...EMPTY, id: profile.id, name: profile.name, products: list(profile.products), target_countries: list(profile.target_countries),
    buyer_types: list(profile.buyer_types), supplier_types: list(profile.supplier_types), moq_note: typeof profile.moq_rules?.note === 'string' ? String(profile.moq_rules.note) : '',
    preferred_currency: profile.preferred_currency ?? '', available_documents: list(profile.available_documents), required_documents: list(profile.required_documents),
    outreach_channel: (profile.outreach_channel as FormState['outreach_channel']) || '', outreach_tone: (profile.outreach_tone as FormState['outreach_tone']) || '',
    packaging_families: profileList(profile, 'packaging_families'), end_use_sectors: profileList(profile, 'end_use_sectors'), materials: profileList(profile, 'materials'),
    print_methods: profileList(profile, 'print_methods'), quantity_bands: profileList(profile, 'quantity_bands'), artwork_states: profileList(profile, 'artwork_states'),
    sustainability_needs: profileList(profile, 'sustainability_needs'), regulated_uses: profileList(profile, 'regulated_uses'), services: profileList(profile, 'services'),
    lead_time_priorities: profileList(profile, 'lead_time_priorities'),
  };
}

function payload(form: FormState, packaging: boolean): IcpProfileInput {
  return {
    id: form.id, name: form.name, products: parse(form.products), target_countries: parse(form.target_countries), buyer_types: parse(form.buyer_types),
    supplier_types: parse(form.supplier_types), moq_rules: form.moq_note ? { note: form.moq_note } : {}, preferred_currency: form.preferred_currency || null,
    available_documents: parse(form.available_documents), required_documents: parse(form.required_documents), outreach_channel: form.outreach_channel || null,
    outreach_tone: form.outreach_tone || null,
    vertical_profile: packaging ? {
      vertical: 'packaging', packaging_families: parse(form.packaging_families), end_use_sectors: parse(form.end_use_sectors), materials: parse(form.materials),
      print_methods: parse(form.print_methods), quantity_bands: parse(form.quantity_bands), artwork_states: parse(form.artwork_states),
      sustainability_needs: parse(form.sustainability_needs), regulated_uses: parse(form.regulated_uses), services: parse(form.services), lead_time_priorities: parse(form.lead_time_priorities),
    } : {},
  };
}

const GENERIC_STEPS = [
  { key: 'products', title: 'Products & markets' }, { key: 'buyers', title: 'Buyer & supplier fit' }, { key: 'commercial', title: 'Commercial rules' },
  { key: 'documents', title: 'Documents' }, { key: 'outreach', title: 'Outreach' },
] as const;
const PACKAGING_STEPS = [
  { key: 'products', title: 'Packaging offer' }, { key: 'buyers', title: 'Target buyers' }, { key: 'technical', title: 'Technical fit' },
  { key: 'commercial', title: 'Volume & process' }, { key: 'documents', title: 'Evidence' }, { key: 'outreach', title: 'Outreach' },
] as const;

function Field({ label, hint, value, onChange, area = false, placeholder }: { label: string; hint?: string; value: string; onChange: (value: string) => void; area?: boolean; placeholder?: string }) {
  const cls = cn(workspaceFieldSurfaceClass, area ? 'min-h-24 w-full rounded-ctl border px-3 py-2 text-sm' : 'h-10 w-full rounded-ctl border px-3 text-sm');
  return <label className="block"><span className="text-sm font-semibold text-content-primary">{label}</span>{hint ? <span className="mt-0.5 block text-xs text-content-muted">{hint}</span> : null}<div className="mt-2">{area ? <textarea className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /> : <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}</div></label>;
}

export function IcpSetupWizard() {
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false); const [packaging, setPackaging] = useState(false); const [step, setStep] = useState(0); const [form, setForm] = useState<FormState>(EMPTY);
  useEffect(() => { fetch('/api/setu-guru/icp', { cache: 'no-store' }).then((r) => r.json()).then((body) => { setPackaging(Boolean(body.packagingEnabled)); setForm(toForm(body.profile ?? null)); }).catch(() => setError('Could not load the existing ICP profile.')).finally(() => setLoading(false)); }, []);
  const steps = packaging ? PACKAGING_STEPS : GENERIC_STEPS; const active = steps[step]; const last = step === steps.length - 1;
  const completion = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step, steps.length]);
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function save() { setSaving(true); setError(null); setSaved(false); try { const response = await fetch('/api/setu-guru/icp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(form, packaging)) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not save ICP.'); setForm(toForm(body.profile)); setSaved(true); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save ICP.'); } finally { setSaving(false); } }

  return <main className="space-y-5 pb-10">
    <section className={workspaceHeroClass}><div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8"><div className="flex items-start gap-4"><GuruAvatar size="lg" /><div><div className="flex items-center gap-2 text-sm font-semibold text-accent-700">{packaging ? <PackageSearch className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}Setu Guru</div><h1 className="mt-2 text-2xl font-bold text-content-primary">{packaging ? 'Packaging ICP Setup' : 'ICP Setup Wizard'}</h1><p className="mt-2 max-w-3xl text-sm text-content-secondary">{packaging ? 'Configure packaging families, buyer sectors, materials, print methods, quantity bands, artwork readiness, compliance evidence, and growth signals used by CRM fit scoring and External Discovery.' : 'Tell Setu Guru what you sell, where you sell, and who you work with.'}</p></div></div><Link href="/growth-agent" className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}><ArrowLeft className="h-4 w-4" />Back to Growth Center</Link></div></section>
    <section className={cn(workspacePanelClass, 'p-5 lg:p-6')}>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-brand-700 transition-all" style={{ width: `${completion}%` }} /></div>
      <div className="mt-4 flex flex-wrap gap-2">{steps.map((item, index) => <button key={item.key} type="button" onClick={() => setStep(index)} className={cn('rounded-ctl border px-3 py-2 text-xs font-semibold', index === step ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface-1 text-content-secondary')}>{index < step ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{item.title}</button>)}</div>
      {loading ? <div className="mt-8 flex items-center gap-2 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading ICP…</div> : <div className="mt-6 space-y-5">
        {active.key === 'products' ? <div className="grid gap-4 lg:grid-cols-2"><Field label={packaging ? 'Packaging products and services' : 'Products or categories'} value={form.products} onChange={(v) => update('products', v)} area placeholder={packaging ? 'Stand-up pouches, labels, shrink sleeves, roll stock, pre-press' : 'Products or categories'} /><Field label="Target countries" value={form.target_countries} onChange={(v) => update('target_countries', v)} placeholder="India, UAE, UK, United States" />{packaging ? <><Field label="Packaging families" value={form.packaging_families} onChange={(v) => update('packaging_families', v)} area placeholder="Stand-up pouches, roll stock, labels, shrink sleeves" /><Field label="Services" value={form.services} onChange={(v) => update('services', v)} area placeholder="Artwork, pre-press, prototypes, 3D packshots, variable data" /></> : null}</div> : null}
        {active.key === 'buyers' ? <div className="grid gap-4 lg:grid-cols-2"><Field label="Target buyer types" value={form.buyer_types} onChange={(v) => update('buyer_types', v)} area placeholder={packaging ? 'Brand owner, food manufacturer, cosmetics brand, contract manufacturer' : 'Importer, distributor, retailer'} /><Field label="Supplier capabilities" value={form.supplier_types} onChange={(v) => update('supplier_types', v)} area placeholder={packaging ? 'Flexible converter, digital printer, flexo printer, film supplier' : 'Supplier capabilities'} />{packaging ? <Field label="End-use sectors" value={form.end_use_sectors} onChange={(v) => update('end_use_sectors', v)} area placeholder="Food, beverage, nutraceutical, pharmaceutical, cosmetics, household" /> : null}</div> : null}
        {active.key === 'technical' && packaging ? <div className="grid gap-4 lg:grid-cols-2"><Field label="Materials and structures" value={form.materials} onChange={(v) => update('materials', v)} area placeholder="PET/PE, BOPP, paper, aluminum laminate, mono-material PE" /><Field label="Print methods" value={form.print_methods} onChange={(v) => update('print_methods', v)} placeholder="Digital, flexo, rotogravure" /><Field label="Artwork states" value={form.artwork_states} onChange={(v) => update('artwork_states', v)} placeholder="Customer artwork ready, design support needed, dieline needed" /><Field label="Regulated uses" value={form.regulated_uses} onChange={(v) => update('regulated_uses', v)} placeholder="Food contact, pharma, cosmetics, child-resistant" /><Field label="Sustainability needs" value={form.sustainability_needs} onChange={(v) => update('sustainability_needs', v)} area placeholder="Recyclable, mono-material, recycled content, FSC paper" /></div> : null}
        {active.key === 'commercial' ? <div className="grid gap-4 lg:grid-cols-2"><Field label="MOQ and pricing rules" value={form.moq_note} onChange={(v) => update('moq_note', v)} area placeholder={packaging ? 'Digital under 10,000; flexo for medium runs; review rotogravure above 500,000' : 'MOQ and pricing rules'} /><Field label="Preferred currency" value={form.preferred_currency} onChange={(v) => update('preferred_currency', v.toUpperCase())} placeholder="USD" />{packaging ? <><Field label="Quantity bands" value={form.quantity_bands} onChange={(v) => update('quantity_bands', v)} area placeholder="Prototype, 1,000–10,000, 10,001–100,000, 100,001+" /><Field label="Lead-time priorities" value={form.lead_time_priorities} onChange={(v) => update('lead_time_priorities', v)} placeholder="Standard, rush, launch-critical" /></> : null}</div> : null}
        {active.key === 'documents' ? <div className="grid gap-4 lg:grid-cols-2"><Field label="Available documents" value={form.available_documents} onChange={(v) => update('available_documents', v)} area placeholder={packaging ? 'Technical data sheet, material declaration, migration report, artwork approval' : 'Available documents'} /><Field label="Required supplier evidence" value={form.required_documents} onChange={(v) => update('required_documents', v)} area placeholder={packaging ? 'Food-contact declaration, migration report, ink and adhesive declarations, FSC where applicable' : 'Required documents'} /></div> : null}
        {active.key === 'outreach' ? <div className="grid gap-4 lg:grid-cols-2"><label><span className="text-sm font-semibold text-content-primary">Default channel</span><select className={cn(workspaceFieldSurfaceClass, 'mt-2 h-10 w-full rounded-ctl border px-3 text-sm')} value={form.outreach_channel} onChange={(e) => update('outreach_channel', e.target.value)}><option value="">No preference</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="linkedin">LinkedIn</option></select></label><label><span className="text-sm font-semibold text-content-primary">Default tone</span><select className={cn(workspaceFieldSurfaceClass, 'mt-2 h-10 w-full rounded-ctl border px-3 text-sm')} value={form.outreach_tone} onChange={(e) => update('outreach_tone', e.target.value)}><option value="">No preference</option><option value="short">Short</option><option value="warm">Warm</option><option value="professional">Professional</option><option value="trade_show_follow_up">Trade show follow-up</option></select></label></div> : null}
        {error ? <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">{error}</div> : null}{saved ? <div className="rounded-card border border-success-border bg-success-bg px-4 py-3 text-sm text-success-fg">ICP saved. New Growth Center scoring and research jobs will use these Packaging dimensions.</div> : null}
        <div className="flex items-center justify-between border-t border-line pt-5"><button type="button" disabled={step === 0} onClick={() => setStep((n) => Math.max(0, n - 1))} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-semibold disabled:opacity-50')}><ArrowLeft className="h-4 w-4" />Back</button><div className="flex gap-2"><button type="button" onClick={save} disabled={saving} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-semibold disabled:opacity-50')}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save progress</button>{!last ? <button type="button" onClick={() => setStep((n) => Math.min(steps.length - 1, n + 1))} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-semibold')}>Next<ArrowRight className="h-4 w-4" /></button> : null}</div></div>
      </div>}
    </section>
  </main>;
}
