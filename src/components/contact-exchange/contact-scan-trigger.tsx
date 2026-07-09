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
    return `Contact details were read from this ${humanizeProfile(extraction.sourceProfile)}. ${lowConfidenceCount ? `Review ${lowConfidenceCount} field${lowConfidenceCount > 1 ? 's' : ''} before applying.` : 'Review the values, then apply them back into the lead form.'}`;
  }
  if (extraction.boundary === 'server_image_ocr_ready') {
    return 'Image received. Review the suggested details before applying them.';
  }
  if (extraction.boundary === 'server_pdf_ocr_ready') {
    return 'PDF received. Review the suggested details before applying them.';
  }
  if (extraction.boundary === 'server_pdf_text_layer') {
    return 'Embedded PDF text was recovered on the server. Review the mapped values before applying them.';
  }
  return `Extraction complete for this ${humanizeProfile(extraction.sourceProfile)}. ${lowConfidenceCount ? `Review ${lowConfidenceCount} lower-confidence field${lowConfidenceCount > 1 ? 's' : ''} before applying.` : 'Review the prefilled values before applying them.'}`;
}

function hasMeaningfulDraft(draft: ContactScanDraft) {
  return Boolean(
    draft.contactName.trim() ||
      draft.companyName.trim() ||
      draft.email.trim() ||
      draft.phone.trim() ||
      draft.phoneSecondary.trim() ||
      draft.website.trim() ||
      draft.notes.trim(),
  );
}

function buildApplyStatus(args: {
  selectedSource: File | null;
  assistText: string;
  extraction: ContactServerExtractionResult | null;
  reviewConfirmed: boolean;
  draft: ContactScanDraft;
}) {
  const hasInput = Boolean(args.selectedSource || args.assistText.trim());
  const hasDraftValues = hasMeaningfulDraft(args.draft);

  if (!hasInput && !hasDraftValues) {
    return 'Add a source, paste assist text, or type the contact details before applying them to the lead form.';
  }
  if (!args.reviewConfirmed) {
    return 'Confirm that you reviewed the contact values on this screen before applying them.';
  }
  if (args.extraction) {
    return 'Reviewed extraction is ready. Apply it back into the lead form.';
  }
  if (hasDraftValues) {
    return 'Manual review is complete. Apply these contact values back into the lead form.';
  }
  return 'Apply is ready once your review is confirmed.';
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
    setExtractionMessage('Reading contact details…');
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
  const canApply = reviewConfirmed && Boolean(selectedSource || assistText.trim() || extraction || hasMeaningfulDraft(draft));
  const applyStatus = buildApplyStatus({ selectedSource, assistText, extraction, reviewConfirmed, draft });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow-sm">⌁</span>
        Scan contact
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-hero border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick entry · inbound capture</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Scan Contact Info</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload or capture a card, review the suggested contact details, then apply them back into Quick Add Lead.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Close</button>
            </div>

            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className={`rounded-card border px-4 py-3 text-sm ${selectedSource || assistText.trim() ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Step 1</p>
                  <p className="mt-1 font-semibold">Choose source</p>
                  <p className="mt-1 text-xs leading-5">Upload a file, use the camera, or paste visible text.</p>
                </div>
                <div className={`rounded-card border px-4 py-3 text-sm ${extraction || isExtracting ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Step 2</p>
                  <p className="mt-1 font-semibold">Review prefill</p>
                  <p className="mt-1 text-xs leading-5">Check extracted fields or finish them manually on one screen.</p>
                </div>
                <div className={`rounded-card border px-4 py-3 text-sm ${reviewConfirmed ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Step 3</p>
                  <p className="mt-1 font-semibold">Confirm and apply</p>
                  <p className="mt-1 text-xs leading-5">Unlock the apply button only after your review is explicitly confirmed.</p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
                <section className="rounded-panel border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Source intake</p>
                      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Upload or camera, still small and fast</h4>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Dashboard</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceMode('upload');
                        setExtractionMessage('Choose an image, PDF, or text file to continue.');
                        uploadInputRef.current?.click();
                      }}
                      className={`rounded-panel border px-4 py-4 text-left transition ${sourceMode === 'upload' ? 'border-sky-300 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <p className="text-sm font-semibold text-sky-700">Upload source</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Image, PDF, text, or shared asset</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceMode('camera');
                        setExtractionMessage('Use the camera to capture a card or contact source.');
                        cameraInputRef.current?.click();
                      }}
                      className={`rounded-panel border px-4 py-4 text-left transition ${sourceMode === 'camera' ? 'border-sky-300 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <p className="text-sm font-semibold text-sky-700">Use camera</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Capture a business card or live contact source</p>
                    </button>
                  </div>

                  <input ref={uploadInputRef} type="file" accept="image/*,.pdf,text/plain,.txt" className="hidden" onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null, 'upload')} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null, 'camera')} />

                  <div className="mt-4 rounded-panel border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Selected source</p>
                    <p className="mt-2 font-semibold text-slate-900">{sourceLabel}</p>
                    <p className="mt-3 leading-6 text-slate-600">
                      {selectedSource
                        ? sourceMode === 'camera'
                          ? 'Camera capture is ready for review.'
                          : 'Uploaded file is ready for review.'
                        : 'Pick a file or use the camera to begin. The chosen source stays in this review flow only.'}
                    </p>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Assist text for extraction</span>
                    <textarea value={assistText} onChange={(event) => setAssistText(event.target.value)} className="mt-2 min-h-[120px] w-full rounded-panel border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Add visible text only when a photo is blurry or incomplete." />
                  </label>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => void runExtraction()} className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isExtracting || !canRunExtraction}>{isExtracting ? 'Extracting…' : 'Run extraction'}</button>
                    <span className="text-sm text-slate-500">{extractionMessage}</span>
                  </div>
                  {extractionError ? <p className="mt-3 text-sm font-medium text-rose-600">{extractionError}</p> : null}

                  <div className="mt-4 rounded-panel border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">How this flow works</p>
                    <ol className="mt-3 space-y-2 leading-6">
                      <li>1. Pick a source or paste visible text.</li>
                      <li>2. Run extraction only when you want a prefill suggestion.</li>
                      <li>3. Review or manually edit the contact fields on the right.</li>
                      <li>4. Review and apply the details back into Quick Add Lead before saving.</li>
                    </ol>
                  </div>
                </section>

                <section className="rounded-panel border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Editable prefill</p>
                      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Keep review on one screen</h4>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Save stays manual</span>
                  </div>

                  {extraction ? (
                    <div className="mt-4 rounded-panel border border-slate-200 bg-slate-50/70 p-4">
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
                  ) : (
                    <div className="mt-4 rounded-panel border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-600">
                      No extraction payload yet. You can still fill these fields manually and apply them after review.
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Full name</span><input value={draft.contactName} onChange={(event) => updateField('contactName', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="e.g. Alex Morgan" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company</span><input value={draft.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="e.g. Northfield Retail Group" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</span><input value={draft.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="e.g. Procurement Manager" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</span><input type="email" value={draft.email} onChange={(event) => updateField('email', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="name@company.com" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone 1</span><input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Primary phone" /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone 2</span><input value={draft.phoneSecondary} onChange={(event) => updateField('phoneSecondary', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Secondary phone" /></label>
                    <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Website</span><input value={draft.website} onChange={(event) => updateField('website', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="https://company.com" /></label>
                    <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes / context</span><textarea value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} className="min-h-[120px] w-full rounded-panel border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Add context from the scanned source or sales conversation." /></label>
                  </div>

                  <label className={`mt-5 flex items-start gap-3 rounded-panel border px-4 py-4 text-sm ${reviewConfirmed ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    <input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300" />
                    <span><strong className="text-slate-900">Review confirmed.</strong> I have checked the extracted or manually edited values on this screen before applying them back into the lead form.</span>
                  </label>
                </section>
              </div>
            </div>
            <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{applyStatus}</p>
                  <p className="mt-1 text-sm text-slate-500">Apply the reviewed details to the lead form, then save when the information looks right.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                  <button type="button" onClick={() => void handleApply()} disabled={!canApply || isApplying} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isApplying ? 'Applying with assist…' : 'Apply to lead form'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
