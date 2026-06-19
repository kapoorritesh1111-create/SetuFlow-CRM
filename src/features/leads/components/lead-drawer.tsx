'use client';

import { useMemo, useState, useTransition } from 'react';
import RightDrawer from '@/components/RightDrawer';
import type { LeadDrawerProps, LeadDrawerSavePayload } from '@/features/leads/types/workspace';
import { saveLead } from '@/features/leads/server/actions';
import { LeadDrawer as LeadDrawerImplementation } from '@/features/leads/components/drawer/lead-drawer-implementation';

export * from '@/features/leads/components/drawer/lead-drawer-implementation';

const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 disabled:bg-slate-50';

function nextFollowUpLocal() {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function QuickLeadDrawer(props: LeadDrawerProps) {
  const productCategories = props.productCategories ?? [];
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{ error?: string; success?: string }>({});
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>('buyer');
  const [sourceType, setSourceType] = useState(props.prefill?.sourceType || 'trade_show');
  const [tradeEventId, setTradeEventId] = useState('');
  const [sourceLabel, setSourceLabel] = useState(props.prefill?.sourceLabel || '');
  const [interestMode, setInterestMode] = useState<'product' | 'category' | 'new_request'>('new_request');
  const [productId, setProductId] = useState(props.prefill?.selectedProductIds?.[0] || '');
  const [categoryId, setCategoryId] = useState('');
  const [requestText, setRequestText] = useState('');
  const [countryId, setCountryId] = useState('');
  const selectedEvent = useMemo(() => props.tradeEvents.find((event) => event.id === tradeEventId), [props.tradeEvents, tradeEventId]);
  const defaultOwner = props.currentUserId || props.profiles[0]?.id || '';
  const defaultNextStep = props.nextSteps.find((step) => step.name.toLowerCase() === 'send introduction')?.id || props.nextSteps[0]?.id || '';

  const submit = (formData: FormData) => {
    const company = String(formData.get('company_name') || '').trim();
    if (!company) return setState({ error: 'Company name is required.' });
    if (!countryId) return setState({ error: 'Country is required.' });
    const quickInterest = interestMode === 'new_request'
      ? `New buyer request: ${requestText.trim()}`
      : interestMode === 'category'
        ? `Interested in category: ${productCategories.find((item) => item.id === categoryId)?.name || ''}`
        : `Interested in products: ${props.products.find((item) => item.id === productId)?.name || ''}`;
    formData.set('lead_type', leadType);
    formData.set('source_type', sourceType);
    formData.set('source_label', sourceType === 'trade_show' ? (selectedEvent?.name || sourceLabel) : sourceLabel);
    formData.set('trade_event_id', sourceType === 'trade_show' ? tradeEventId : '');
    formData.set('country_id', countryId);
    formData.set('owner_user_id', defaultOwner);
    formData.set('next_step_id', defaultNextStep);
    formData.set('next_follow_up_at', nextFollowUpLocal());
    formData.set('notes', [quickInterest, String(formData.get('notes') || '').trim()].filter(Boolean).join('\n'));
    if (productId) formData.append('product_ids', productId);
    if (categoryId) formData.append('category_ids', categoryId);
    startTransition(() => {
      void saveLead(undefined, formData).then((result: any) => {
        if (result?.error) return setState({ error: result.error });
        setState({ success: 'Lead saved.' });
        props.onSaved?.({ resetForNextLead: true, lead: undefined, selectedProductIds: productId ? [productId] : [], selectedMarketIds: [] } as LeadDrawerSavePayload);
        props.onClose?.();
      }).catch((error) => setState({ error: error instanceof Error ? error.message : 'Could not save lead.' }));
    });
  };

  return (
    <RightDrawer open={Boolean(props.open)} onClose={props.onClose ?? (() => undefined)} title="Quick Add Lead" widthClassName="sm:max-w-xl lg:max-w-2xl" footer={<div className="flex items-center justify-between gap-3"><div className="text-sm text-slate-600"><strong className="text-slate-900">Lead capture</strong><br />Review, then save.</div><div className="flex gap-2"><button type="button" onClick={props.onClose} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" form="quick-lead-form" disabled={isPending} className="rounded-2xl bg-slate-950 px-5 py-2 text-sm font-black text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Save lead'}</button></div></div>}>
      <form id="quick-lead-form" action={submit} className="space-y-5">
        {state.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.error}</div> : null}
        <section className="space-y-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Lead type</p><div className="grid gap-2 sm:grid-cols-2">{(['buyer', 'supplier'] as const).map((type) => <button key={type} type="button" onClick={() => setLeadType(type)} className={`rounded-2xl border px-4 py-3 text-center text-sm font-black ${leadType === type ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700'}`}>{type === 'buyer' ? 'Buyer' : 'Supplier'}<span className="mt-1 block text-xs font-semibold text-slate-500">{type === 'buyer' ? 'Importing / purchasing' : 'Sourcing / manufacturing'}</span></button>)}</div></section>
        <section className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Company name *</span><input name="company_name" required className={inputClass} placeholder="e.g. Metro Retail GmbH" /></label><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Country *</span><select value={countryId} onChange={(event) => setCountryId(event.target.value)} className={inputClass}><option value="">Select country…</option>{props.countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Contact name</span><input name="contact_name" className={inputClass} placeholder="Primary contact person" /></label><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Job title</span><input name="job_title" className={inputClass} placeholder="e.g. Procurement Director" /></label><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Email</span><input name="email" type="email" className={inputClass} placeholder="contact@company.com" /></label><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Phone</span><input name="phone" className={inputClass} placeholder="+49 151…" /></label><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">WhatsApp</span><input name="whatsapp_number" className={inputClass} placeholder="+91 98765 43210" /></label></section>
        <section className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Lead source</span><select value={sourceType} onChange={(event) => { setSourceType(event.target.value); if (event.target.value !== 'trade_show') setTradeEventId(''); }} className={inputClass}><option value="trade_show">Trade show</option><option value="direct_inquiry">Direct inquiry</option><option value="referral">Referral</option><option value="linkedin">LinkedIn</option><option value="website">Website</option><option value="other">Other</option></select></label>{sourceType === 'trade_show' ? <label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Event / source label</span><select value={tradeEventId} onChange={(event) => { const next = event.target.value; const found = props.tradeEvents.find((item) => item.id === next); setTradeEventId(next); setSourceLabel(found?.name || ''); }} className={inputClass}><option value="">Select trade event…</option>{props.tradeEvents.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select>{selectedEvent ? <span className="text-xs text-slate-500">Booth context comes from this event.</span> : null}</label> : <label className="space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Event / source label</span><input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} className={inputClass} placeholder="Referral, website, distributor intro" /></label>}</section>
        <section className="space-y-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Interest</p><div className="grid gap-2 sm:grid-cols-3">{(['product', 'category', 'new_request'] as const).map((mode) => <button key={mode} type="button" onClick={() => setInterestMode(mode)} className={`rounded-2xl border px-4 py-3 text-sm font-black ${interestMode === mode ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700'}`}>{mode === 'new_request' ? 'New request' : mode === 'category' ? 'Category' : 'Product'}</button>)}</div>{interestMode === 'product' ? <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass}><option value="">Select product…</option>{props.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select> : null}{interestMode === 'category' ? <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}><option value="">Select category…</option>{productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : null}{interestMode === 'new_request' ? <input value={requestText} onChange={(event) => setRequestText(event.target.value)} className={inputClass} placeholder="Test Product" /> : null}</section>
        <label className="block space-y-1"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Trade note</span><textarea name="notes" rows={4} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="Add trade-show context, timing, or follow-up notes." /></label>
      </form>
    </RightDrawer>
  );
}

export function LeadDrawer(props: LeadDrawerProps) {
  const quickNewLead = (props.mode ?? 'quick') === 'quick' && !props.lead?.id;
  if (quickNewLead) return <QuickLeadDrawer {...props} />;
  return <LeadDrawerImplementation {...props} />;
}
