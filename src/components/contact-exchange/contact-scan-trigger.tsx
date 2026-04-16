'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { extractContactScan, suggestContactScanPostApplyAssist } from '@/features/leads/server/contact-scan-actions';
import type { ContactServerExtractionResult } from '@/lib/contact-exchange/contact-extraction';
import type { ContactPostApplyAssistResult } from '@/lib/contact-exchange/contact-post-apply-assist';

type ContactScanDraft = {
  contactName: string;
  companyName: string;
  jobTitle: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  website: string;
  notes: string;
  sourceType?: string;
  sourceLabel?: string;
  sourceProfile?: ContactServerExtractionResult['sourceProfile'];
};

type ContactScanTriggerProps = {
  currentLeadId?: string;
  companyName: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  website: string;
  notes: string;
  onApply: (draft: ContactScanDraft, assist: ContactPostApplyAssistResult | null) => void;
};

function buildInitialDraft(props: Omit<ContactScanTriggerProps, 'onApply'>): ContactScanDraft {
  return {
    contactName: props.contactName,
    companyName: props.companyName,
    jobTitle: props.jobTitle,
    email: props.email,
    phone: props.phone,
    phoneSecondary: props.phoneSecondary,
    website: props.website,
    notes: props.notes,
    sourceType: '',
    sourceLabel: '',
    sourceProfile: 'generic',
  };
}

function mergeNotes(existing: string, incoming: string) {
  const current = existing.trim();
  const next = incoming.trim();
  if (!next) return current;
  if (!current) return next;
  if (current.includes(next)) return current;
  return `${current}\n\n${next}`;
}

function humanizeProfile(profile: ContactServerExtractionResult['sourceProfile']) {
  return profile === 'business_card' ? 'business card' : profile === 'screenshot' ? 'screenshot' : profile === 'scan_pdf' ? 'scan-PDF' : 'generic source';
}

function buildExtractionMessage(extraction: ContactServerExtractionResult) {
  const lowConfidenceCount = extraction.fields.filter((field) => field.value && field.confidence === 'Low').length;
  if (!extraction.fields.some((field) => field.value)) {
    return 'Extraction found limited contact detail. Review and complete the fields inline before applying them.';
  }
  if (extraction.boundary === 'server_image_ocr_live' || extraction.boundary === 'server_pdf_ocr_live') {
    return `Live OCR extracted this ${humanizeProfile(extraction.sourceProfile)} on the server. ${lowConfidenceCount ? `Review ${lowConfidenceCount} lower-confidence field${lowConfidenceCount > 1 ? 's' : ''} before applying.` : 'Review the mapped values, confirm, and then apply them back into the lead form.'}`;
  }
  if (extraction.boundary === 'server_image_ocr_ready') {
    return 'Server boundary accepted the image. If live AI OCR is unavailable the system falls back to local OCR, then you can review and apply the mapped values.';
  }
  if (extraction.boundary === 'server_pdf_ocr_ready') {
    return 'Server boundary accepted the PDF. Configure the OCR provider for scan-PDF extraction, or add assist text and review the values before applying them.';
  }
  if (extraction.boundary === 'server_pdf_text_layer') {
    return 'Embedded PDF text was recovered on the server. Review the mapped values before applying them.';
  }
  return `Extraction complete for this ${humanizeProfile(extraction.sourceProfile)}. ${lowConfidenceCount ? `Review ${lowConfidenceCount} lower-confidence field${lowConfidenceCount > 1 ? 's' : ''} before applying.` : 'Review the prefilled values before applying them.'}`;
}

export function ContactScanTrigger(props: ContactScanTriggerProps) {
  const [open, setOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<File | null>(null);
  const [draft, setDraft] = useState<ContactScanDraft>(buildInitialDraft(props));
  const [assistText, setAssistText] = useState('');
  const [sourceMode, setSourceMode] = useState<'upload' | 'camera'>('upload');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [extraction, setExtraction] = useState<ContactServerExtractionResult | null>(null);
  const [extractionMessage, setExtractionMessage] = useState('Select a source to start extraction.');
  const [extractionError, setExtractionError] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(buildInitialDraft(props));
      setSelectedSource(null);
      setSourceMode('upload');
      setAssistText('');
      setExtraction(null);
      setExtractionMessage('Select a source to start extraction.');
      setExtractionError('');
      setIsExtracting(false);
      setIsApplying(false);
      setReviewConfirmed(false);
    }
  }, [open, props.currentLeadId, props.companyName, props.contactName, props.jobTitle, props.email, props.phone, props.phoneSecondary, props.website, props.notes]);

  const sourceLabel = useMemo(() => {
    if (!selectedSource) return 'No source selected yet';
    return `${selectedSource.name} · ${selectedSource.type || 'file'}`;
  }, [selectedSource]);

  async function runExtraction(fileOverride?: File | null) {
    const activeFile = fileOverride ?? selectedSource;
    const formData = new FormData();
    formData.set('assist_text', assistText.trim());
    formData.set('source_mode', sourceMode);
    if (activeFile) formData.set('source', activeFile);

    setIsExtracting(true);
    setExtractionMessage('Running the live OCR-capable server extraction boundary…');
    setExtractionError('');
    setReviewConfirmed(false);

    try {
      const result = await extractContactScan(undefined, formData);
      if (result.error) {
        setExtraction(null);
        setExtractionError(result.error);
        setExtractionMessage(result.error);
        return;
      }
      const parsed = result.extraction ?? null;
      if (!parsed) {
        setExtraction(null);
        setExtractionError('Extraction did not return a review payload.');
        setExtractionMessage('Extraction did not return a review payload.');
        return;
      }
      setExtraction(parsed);
      setDraft((current) => ({
        ...current,
        contactName: parsed.draft.contactName || current.contactName,
        companyName: parsed.draft.companyName || current.companyName,
        jobTitle: parsed.draft.jobTitle || current.jobTitle,
        email: parsed.draft.email || current.email,
        phone: parsed.draft.phone || current.phone,
        phoneSecondary: parsed.draft.phoneSecondary || current.phoneSecondary,
        website: parsed.draft.website || current.website,
        notes: mergeNotes(current.notes, parsed.draft.notes),
        sourceType: parsed.sourceType,
        sourceLabel: parsed.sourceLabel,
        sourceProfile: parsed.sourceProfile,
      }));
      setExtractionMessage(buildExtractionMessage(parsed));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server extraction failed.';
      setExtraction(null);
      setExtractionError(message);
      setExtractionMessage(message);
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleApply() {
    setIsApplying(true);
    let assist: ContactPostApplyAssistResult | null = null;
    try {
      const assistFormData = new FormData();
      if (props.currentLeadId) assistFormData.set('current_lead_id', props.currentLeadId);
      assistFormData.set('company_name', draft.companyName);
      assistFormData.set('contact_name', draft.contactName);
      assistFormData.set('job_title', draft.jobTitle);
      assistFormData.set('email', draft.email);
      assistFormData.set('phone', draft.phone);
      assistFormData.set('phone_secondary', draft.phoneSecondary);
      assistFormData.set('website', draft.website);
      assistFormData.set('notes', draft.notes);
      assistFormData.set('source_type', draft.sourceType ?? 'contact_scan_upload');
      assistFormData.set('source_label', draft.sourceLabel ?? 'Quick entry contact scan');
      assistFormData.set('source_profile', draft.sourceProfile ?? extraction?.sourceProfile ?? 'generic');
      assist = await suggestContactScanPostApplyAssist(assistFormData);
    } catch {
      assist = null;
    } finally {
      props.onApply(draft, assist);
      setIsApplying(false);
      setOpen(false);
    }
  }

  const updateField = (field: keyof ContactScanDraft, value: string) => {
    setReviewConfirmed(false);
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleFileSelected = async (file: File | null, mode: 'upload' | 'camera') => {
    setSourceMode(mode);
    setSelectedSource(file);
    setExtraction(null);
    setExtractionError('');
    setReviewConfirmed(false);
    setExtractionMessage(file ? 'Source attached. Run extraction to prefill the lead form.' : 'Select a source to start extraction.');
    if (!file) return;
    if (file.type.startsWith('text/')) {
      const text = await file.text();
      setAssistText((current) => current || text);
      await runExtraction(file);
    }
  };

  const canRunExtraction = Boolean(selectedSource || assistText.trim());
  const canApply = reviewConfirmed && Boolean(extraction || assistText.trim() || selectedSource);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow-sm">⌁</span>
        Scan contact
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Quick entry · inbound capture</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Scan Contact Info</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload or capture a source, let the live OCR-capable server extraction boundary prefill the contact block, then review and apply it back into Quick Add Lead on the same screen.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Close</button>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                <p className="font-semibold">One-screen review stays intact.</p>
                <p className="mt-2 leading-6">This flow still keeps extraction, editable review, and apply on one screen. After apply, Quick Add Lead can show guarded duplicate/contact-match suggestions and follow-up prompts, but the final save remains manual.</p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.02fr,1.1fr]">
                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Source intake</p>
                      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Upload or camera, still small and fast</h4>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">No heavy dashboard</span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => { setSourceMode('upload'); uploadInputRef.current?.click(); }} className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${sourceMode === 'upload' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                      <p className="text-sm font-semibold">Upload source</p>
                      <p className="mt-1 text-sm text-slate-500">Image, PDF, text, or shared asset</p>
                    </button>
                    <button type="button" onClick={() => { setSourceMode('camera'); cameraInputRef.current?.click(); }} className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${sourceMode === 'camera' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                      <p className="text-sm font-semibold">Use camera</p>
                      <p className="mt-1 text-sm text-slate-500">Capture a business card or live contact source</p>
                    </button>
                  </div>

                  <input ref={uploadInputRef} type="file" accept="image/*,application/pdf,text/*,application/json" className="hidden" onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null, 'upload')} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null, 'camera')} />

                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected source</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{sourceLabel}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{selectedSource ? (sourceMode === 'camera' ? 'Camera capture is attached to the same review surface and routed through the server extraction boundary.' : 'Upload is attached to the same review surface and routed through the server extraction boundary.') : 'Choose upload or camera to anchor this one-screen scan flow inside Quick Add Lead.'}</p>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Assist text for extraction</span>
                    <textarea value={assistText} onChange={(event) => { setAssistText(event.target.value); setReviewConfirmed(false); }} className="mt-2 min-h-[132px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Paste visible text from a screenshot, card, PDF, catalog back, or email signature to strengthen extraction when confidence is low or when the OCR provider is not configured." />
                  </label>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => void runExtraction()} className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isExtracting || !canRunExtraction}>{isExtracting ? 'Extracting…' : 'Run extraction'}</button>
                    <span className="text-sm text-slate-500">{extractionMessage}</span>
                  </div>
                  {extractionError ? <p className="mt-3 text-sm font-medium text-rose-600">{extractionError}</p> : null}

                  <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Target interaction</p>
                    <ol className="mt-3 space-y-2 leading-6">
                      <li>1. Tap the small scan trigger from Quick Add Lead.</li>
                      <li>2. Upload a source or open the camera.</li>
                      <li>3. Run server extraction and review the same-screen prefill.</li>
                      <li>4. Confirm review, apply the mapped values, then review guarded duplicate and follow-up assist back in Quick Add Lead before the final manual save.</li>
                    </ol>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Editable prefill</p>
                      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Keep review on one screen</h4>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Save stays manual</span>
                  </div>

                  {extraction ? (
                    <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 shadow-sm">Boundary: {extraction.boundary.replace(/_/g, ' ')}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 shadow-sm">Kind: {extraction.acceptedSourceKind}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 shadow-sm">Profile: {humanizeProfile(extraction.sourceProfile)}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 shadow-sm">Mime: {extraction.sourceMimeType}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 shadow-sm">Needs review: {extraction.fields.filter((field) => field.value && field.confidence === 'Low').length}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {extraction.fields.map((field) => (
                          <div key={field.label} className="rounded-2xl border border-white bg-white px-3 py-3 text-sm shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{field.label}</p>
                            <p className="mt-1 text-slate-900">{field.value || '—'}</p>
                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${field.confidence === 'High' ? 'bg-emerald-50 text-emerald-700' : field.confidence === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{field.confidence}</span>
                          </div>
                        ))}
                      </div>
                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        {extraction.notes.map((note) => <li key={note}>{note}</li>)}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Full name</span><input value={draft.contactName} onChange={(event) => updateField('contactName', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="e.g. Aarav Mehta" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company</span><input value={draft.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="e.g. Northfield Retail Group" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</span><input value={draft.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="e.g. Procurement Manager" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</span><input type="email" value={draft.email} onChange={(event) => updateField('email', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="name@company.com" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone 1</span><input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Primary phone" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone 2</span><input value={draft.phoneSecondary} onChange={(event) => updateField('phoneSecondary', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Secondary phone" /></label>
                    <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Website</span><input value={draft.website} onChange={(event) => updateField('website', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="https://company.com" /></label>
                    <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes / context</span><textarea value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} className="min-h-[120px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Add context from the scanned source or sales conversation." /></label>
                  </div>

                  <label className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300" />
                    <span><strong className="text-slate-900">Review confirmed.</strong> I have checked the extracted values on this screen before applying them back into the lead form.</span>
                  </label>
                </section>
              </div>
            </div>
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <p className="text-sm text-slate-500">Applying now maps the reviewed fields into the standard lead save payload and stamps the source as a contact scan. After apply, Quick Add Lead can show guarded duplicate hints and follow-up prompts, but the final save still happens only from the lead form.</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={() => void handleApply()} disabled={!canApply || isApplying} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isApplying ? 'Applying with assist…' : 'Apply to lead form'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
