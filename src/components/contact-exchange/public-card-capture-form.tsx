'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { PublicCardIdentity } from '@/lib/contact-exchange/public-card';

type PublicCardCaptureFormProps = {
  identity: PublicCardIdentity;
};

type CaptureFormState = {
  leadType: 'buyer' | 'supplier';
  desiredAction: 'request_quote' | 'book_appointment';
  contactName: string;
  companyName: string;
  jobTitle: string;
  email: string;
  phone: string;
  country: string;
  notes: string;
  preferredTime: string;
};

const initialForm: CaptureFormState = {
  leadType: 'buyer',
  desiredAction: 'request_quote',
  contactName: '',
  companyName: '',
  jobTitle: '',
  email: '',
  phone: '',
  country: '',
  notes: '',
  preferredTime: '',
};

function fieldClassName() {
  return 'mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100';
}

export function PublicCardCaptureForm({ identity }: PublicCardCaptureFormProps) {
  const [form, setForm] = useState<CaptureFormState>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [prefillState, setPrefillState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    function syncDesiredActionFromHash() {
      const hash = window.location.hash;
      if (hash === '#book-appointment') {
        setForm((current) => ({ ...current, desiredAction: 'book_appointment' }));
      } else if (hash === '#request-quote') {
        setForm((current) => ({ ...current, desiredAction: 'request_quote' }));
      }
    }

    syncDesiredActionFromHash();
    window.addEventListener('hashchange', syncDesiredActionFromHash);
    return () => window.removeEventListener('hashchange', syncDesiredActionFromHash);
  }, []);

  async function handlePrefill() {
    if (!file) return;
    setPrefillState('loading');
    setMessage('');
    try {
      const formData = new FormData();
      formData.set('source', file);
      const response = await fetch('/api/public/card-intake/prefill', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to prefill from document.');
      setForm((current) => ({
        ...current,
        contactName: payload.contactName || current.contactName,
        companyName: payload.companyName || current.companyName,
        jobTitle: payload.jobTitle || current.jobTitle,
        email: payload.email || current.email,
        phone: payload.phone || current.phone,
        notes: [current.notes, payload.notes].filter(Boolean).join('\n\n').trim(),
      }));
      setPrefillState('done');
      setMessage('AI extracted details from the uploaded document and prefilled the form. Review before sending.');
    } catch (error) {
      setPrefillState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to prefill from document.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('submitting');
    setMessage('');
    try {
      const formData = new FormData();
      formData.set('organizationId', identity.organizationId || '');
      formData.set('repName', identity.fullName);
      formData.set('leadType', form.leadType);
      formData.set('desiredAction', form.desiredAction);
      formData.set('contactName', form.contactName);
      formData.set('companyName', form.companyName || form.contactName || 'Card share contact');
      formData.set('jobTitle', form.jobTitle);
      formData.set('email', form.email);
      formData.set('phone', form.phone);
      formData.set('country', form.country);
      formData.set('notes', form.notes);
      formData.set('preferredTime', form.preferredTime);
      formData.set('sourceLabel', `${identity.fullName} digital card`);
      if (file) formData.set('source', file);

      const response = await fetch('/api/public/card-intake', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to send your information.');
      setSubmitState('done');
      setMessage(payload.success || 'Your information was captured and routed into the CRM.');
      setForm(initialForm);
      setFile(null);
    } catch (error) {
      setSubmitState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send your information.');
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Shared contact follow-through</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Request a quote or book an appointment</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">After saving the contact or scanning the QR, a buyer or supplier can share their own details, upload a card or requirement document, and let AI prefill the form before it is written into the CRM.</p>
        </div>
        <div className="flex gap-2">
          <a href="#request-quote" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Request quote</a>
          <a href="#book-appointment" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Book appointment</a>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-slate-700">I am sharing as</span>
            <div className="mt-2 flex gap-2">
              {(['buyer', 'supplier'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, leadType: value }))} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${form.leadType === value ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                  {value === 'buyer' ? 'Buyer' : 'Supplier'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700">What I need</span>
            <div className="mt-2 flex gap-2">
              <button id="request-quote" type="button" onClick={() => setForm((current) => ({ ...current, desiredAction: 'request_quote' }))} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${form.desiredAction === 'request_quote' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Request quote</button>
              <button id="book-appointment" type="button" onClick={() => setForm((current) => ({ ...current, desiredAction: 'book_appointment' }))} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${form.desiredAction === 'book_appointment' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Book appointment</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Full name<input className={fieldClassName()} value={form.contactName} onChange={(e) => setForm((c) => ({ ...c, contactName: e.target.value }))} required /></label>
          <label className="block text-sm font-medium text-slate-700">Company<input className={fieldClassName()} value={form.companyName} onChange={(e) => setForm((c) => ({ ...c, companyName: e.target.value }))} required /></label>
          <label className="block text-sm font-medium text-slate-700">Role / title<input className={fieldClassName()} value={form.jobTitle} onChange={(e) => setForm((c) => ({ ...c, jobTitle: e.target.value }))} /></label>
          <label className="block text-sm font-medium text-slate-700">Email<input className={fieldClassName()} type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} /></label>
          <label className="block text-sm font-medium text-slate-700">Phone<input className={fieldClassName()} value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} /></label>
          <label className="block text-sm font-medium text-slate-700">Country<input className={fieldClassName()} value={form.country} onChange={(e) => setForm((c) => ({ ...c, country: e.target.value }))} /></label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">Preferred time or availability<input className={fieldClassName()} value={form.preferredTime} onChange={(e) => setForm((c) => ({ ...c, preferredTime: e.target.value }))} placeholder="Tomorrow afternoon, next Tuesday 11 AM GST, etc." /></label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">Requirements / notes<textarea className={`${fieldClassName()} min-h-[140px]`} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} placeholder="Tell us what products, quantities, or partnership details you want to discuss." /></label>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">AI document / card intake</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Upload a business card, requirement sheet, or image. AI will scan it, prefill the form, and the captured information will be saved into the CRM when you send this request.</p>
            </div>
            <button type="button" onClick={handlePrefill} disabled={!file || prefillState === 'loading'} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
              {prefillState === 'loading' ? 'Scanning…' : 'AI prefill from upload'}
            </button>
          </div>
          <input type="file" accept="image/*,application/pdf,text/plain" className="mt-4 block w-full text-sm text-slate-700" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} />
        </div>

        {message ? <div className={`rounded-2xl px-4 py-3 text-sm ${submitState === 'done' || prefillState === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{message}</div> : null}

        <button type="submit" disabled={submitState === 'submitting'} className="inline-flex min-h-[56px] items-center justify-center rounded-[1.35rem] bg-slate-950 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {submitState === 'submitting' ? 'Sending…' : form.desiredAction === 'request_quote' ? 'Send quote request' : 'Book appointment'}
        </button>
      </form>
    </div>
  );
}
