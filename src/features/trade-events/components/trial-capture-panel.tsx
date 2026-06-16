'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveTrialTradeEventCapture, type TrialCaptureActionState, type TrialCaptureSource } from '@/features/trade-events/server/trial-capture-actions';

type TrialCaptureEventOption = {
  id: string;
  name: string;
  locationLabel: string;
  dateLabel: string;
};

export type TrialCaptureReusableTerm = {
  id: string;
  kind: 'product' | 'category';
  displayTerm: string;
  usageCount: number;
};

type CaptureFields = {
  company: string;
  contact: string;
  email: string;
  phone: string;
  productInterest: string;
  typedCategory: string;
  notes: string;
  transcript: string;
  scanPayload: string;
  scanRef: string;
};

type TrialCapturePanelProps = {
  events: TrialCaptureEventOption[];
  reusableTerms: TrialCaptureReusableTerm[];
};

const TABS: Array<{ key: TrialCaptureSource; label: string; icon: string; help: string }> = [
  { key: 'type', label: 'Type', icon: '⌨️', help: 'Structured booth entry' },
  { key: 'dictate', label: 'Dictate', icon: '🎙️', help: 'Paste or dictate a transcript' },
  { key: 'scan', label: 'Scan', icon: '▣', help: 'Card, badge, or QR payload' },
];

const emptyFields: CaptureFields = {
  company: '',
  contact: '',
  email: '',
  phone: '',
  productInterest: '',
  typedCategory: '',
  notes: '',
  transcript: '',
  scanPayload: '',
  scanRef: '',
};

function SubmitButton({ captureSource }: { captureSource: TrialCaptureSource }) {
  const status = useFormStatus();
  const label = captureSource === 'type' ? 'Save typed entry' : captureSource === 'dictate' ? 'Save dictated entry' : 'Save scanned entry';
  return (
    <button
      type="submit"
      disabled={status.pending}
      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {status.pending ? 'Saving…' : label}
    </button>
  );
}

function getFirstMatch(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function extractFields(rawInput: string): Partial<CaptureFields> {
  const normalized = rawInput.replace(/\s+/g, ' ').trim();
  if (!normalized) return {};

  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = normalized.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? '';
  const company = getFirstMatch(normalized, /(?:company|organization|org|business)\s*(?:is|:|-)?\s*([^.;,]+)/i);
  const contact = getFirstMatch(normalized, /(?:contact|name|person|met with)\s*(?:is|:|-)?\s*([^.;,]+)/i);
  const productInterest = getFirstMatch(normalized, /(?:product|interest|interested in|looking for)\s*(?:is|:|-)?\s*([^.;]+)/i);
  const typedCategory = getFirstMatch(normalized, /(?:category|segment|vertical)\s*(?:is|:|-)?\s*([^.;,]+)/i);
  const notes = normalized.length > 240 ? `${normalized.slice(0, 237)}…` : normalized;

  return { company, contact, email, phone, productInterest, typedCategory, notes };
}

function TermChips({
  label,
  terms,
  onPick,
  onAddNew,
}: {
  label: string;
  terms: TrialCaptureReusableTerm[];
  onPick: (term: string) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <button type="button" onClick={onAddNew} className="rounded-full border border-dashed border-blue-300 bg-white px-3 py-1 text-xs font-black text-blue-700 hover:bg-blue-50">+ Add New</button>
      </div>
      {terms.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {terms.map((term) => (
            <button key={term.id} type="button" onClick={() => onPick(term.displayTerm)} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700">
              {term.displayTerm} <span className="font-semibold text-slate-400">×{term.usageCount}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-slate-500">Save a term once and it will appear here for quick reuse.</p>
      )}
    </div>
  );
}

function tradeEventExportHref(eventId?: string | null) {
  return eventId ? `/api/trial/export-csv?event_id=${encodeURIComponent(eventId)}` : '/api/trial/export-csv';
}

export function TrialCapturePanel({ events, reusableTerms }: TrialCapturePanelProps) {
  const [captureSource, setCaptureSource] = useState<TrialCaptureSource>('type');
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '');
  const [fields, setFields] = useState<CaptureFields>(emptyFields);
  const [state, formAction] = useFormState<TrialCaptureActionState | undefined, FormData>(saveTrialTradeEventCapture, undefined);
  const hasEvents = events.length > 0;
  const productTerms = reusableTerms.filter((term) => term.kind === 'product').slice(0, 12);
  const categoryTerms = reusableTerms.filter((term) => term.kind === 'category').slice(0, 12);
  const selectedEventExportHref = tradeEventExportHref(selectedEventId);

  const extractedPreview = useMemo(() => {
    if (captureSource === 'dictate') return extractFields(fields.transcript);
    if (captureSource === 'scan') return extractFields(fields.scanPayload);
    return {};
  }, [captureSource, fields.scanPayload, fields.transcript]);

  function updateField<K extends keyof CaptureFields>(key: K, value: CaptureFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function applyExtractedFields() {
    setFields((current) => ({
      ...current,
      company: extractedPreview.company || current.company,
      contact: extractedPreview.contact || current.contact,
      email: extractedPreview.email || current.email,
      phone: extractedPreview.phone || current.phone,
      productInterest: extractedPreview.productInterest || current.productInterest,
      typedCategory: extractedPreview.typedCategory || current.typedCategory,
      notes: extractedPreview.notes || current.notes,
    }));
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Trade Show Trial Capture</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Capture leads three ways</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
            Save booth conversations as event entries only. Product and category terms become reusable quick-pick chips for the next capture.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {hasEvents ? (
            <a href={selectedEventExportHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100">Export selected CSV</a>
          ) : null}
          <a href="/api/trial/export-csv" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800 transition hover:bg-emerald-100">Export all CSV</a>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {TABS.map((tab) => {
          const selected = captureSource === tab.key;
          return (
            <button key={tab.key} type="button" onClick={() => setCaptureSource(tab.key)} className={`rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-blue-500 bg-blue-50 shadow-[0_16px_34px_rgba(37,99,235,0.14)]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2 text-sm font-black text-slate-950"><span>{tab.icon}</span>{tab.label}</div>
              <p className="mt-1 text-xs font-semibold text-slate-500">{tab.help}</p>
            </button>
          );
        })}
      </div>

      {!hasEvents ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-lg font-black text-slate-950">Create a trade event first</p>
          <p className="mt-2 text-sm font-medium text-slate-600">Trial capture needs an event so every entry is scoped to the correct booth workspace.</p>
        </div>
      ) : (
        <form action={formAction} className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <input type="hidden" name="capture_source" value={captureSource} />
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Trade event</span>
              <select name="trade_event_id" value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none ring-blue-500/20 focus:ring-4" required>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name} · {event.locationLabel} · {event.dateLabel}</option>)}
              </select>
            </label>

            {captureSource === 'dictate' ? (
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Full transcript</span>
                <textarea name="raw_transcript" value={fields.transcript} onChange={(event) => updateField('transcript', event.target.value)} rows={6} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-blue-500/20 focus:ring-4" placeholder="Example: Contact is Priya Shah from Sunrise Imports. Looking for mango chips. Category snacks." required />
              </label>
            ) : null}

            {captureSource === 'scan' ? (
              <div className="grid gap-4">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Raw OCR / QR / badge payload</span>
                  <textarea name="raw_scan_payload" value={fields.scanPayload} onChange={(event) => updateField('scanPayload', event.target.value)} rows={6} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-blue-500/20 focus:ring-4" placeholder="Paste card OCR text, QR payload, or badge export text here." required={!fields.scanRef} />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Optional scan reference</span>
                  <input name="source_scan_ref" value={fields.scanRef} onChange={(event) => updateField('scanRef', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-blue-500/20 focus:ring-4" placeholder="File name, badge ID, QR URL, or storage reference" />
                </label>
              </div>
            ) : null}

            {(captureSource === 'dictate' || captureSource === 'scan') && Object.values(extractedPreview).some(Boolean) ? (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-black text-blue-950">Auto-extracted fields ready</p><p className="mt-1 text-xs font-semibold text-blue-700">Review and edit before saving. Raw input is still retained.</p></div>
                  <button type="button" onClick={applyExtractedFields} className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-black text-white">Apply fields</button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Company *</span><input name="captured_company_name" value={fields.company} onChange={(event) => updateField('company', event.target.value)} required className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none ring-blue-500/20 focus:ring-4" /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Contact</span><input name="captured_contact_name" value={fields.contact} onChange={(event) => updateField('contact', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none ring-blue-500/20 focus:ring-4" /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Email</span><input name="captured_email" type="email" value={fields.email} onChange={(event) => updateField('email', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none ring-blue-500/20 focus:ring-4" /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Phone / WhatsApp</span><input name="captured_phone" value={fields.phone} onChange={(event) => updateField('phone', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none ring-blue-500/20 focus:ring-4" /></label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Product interest</span><input name="product_interest" value={fields.productInterest} onChange={(event) => updateField('productInterest', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none ring-blue-500/20 focus:ring-4" /></label>
                <TermChips label="Saved products" terms={productTerms} onPick={(term) => updateField('productInterest', term)} onAddNew={() => updateField('productInterest', '')} />
              </div>
              <div className="space-y-3">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Typed category</span><input name="typed_category" value={fields.typedCategory} onChange={(event) => updateField('typedCategory', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-medium outline-none ring-blue-500/20 focus:ring-4" /></label>
                <TermChips label="Saved categories" terms={categoryTerms} onPick={(term) => updateField('typedCategory', term)} onAddNew={() => updateField('typedCategory', '')} />
              </div>
            </div>

            <label className="block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Notes</span><textarea name="captured_notes" value={fields.notes} onChange={(event) => updateField('notes', event.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none ring-blue-500/20 focus:ring-4" /></label>
          </div>

          <aside className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4 lg:self-start">
            <p className="text-sm font-black text-slate-950">Before save</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
              <li>• Saves to <span className="font-black text-slate-900">trade_event_entries</span></li>
              <li>• Saves product/category terms for reuse</li>
              <li>• Keeps terms independent from catalog products</li>
              <li>• Does not create a CRM lead automatically</li>
              <li>• CSV exports include capture-only fields for this event</li>
            </ul>
            {state?.error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{state.error}</p> : null}
            {state?.success ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{state.success}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <SubmitButton captureSource={captureSource} />
              <a href={selectedEventExportHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50">Export this event CSV</a>
            </div>
          </aside>
        </form>
      )}
    </section>
  );
}
