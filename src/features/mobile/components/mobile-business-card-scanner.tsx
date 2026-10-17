'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { extractContactScan, createLeadFromContactScanReview } from '@/features/leads/server/contact-scan-actions';
import type { ContactServerExtractionResult } from '@/lib/contact-exchange/contact-extraction';
import { prepareMobileScanFile, MOBILE_SCAN_MAX_ORIGINAL_IMAGE_BYTES, MOBILE_SCAN_MAX_PDF_UPLOAD_BYTES } from '@/features/mobile/lib/mobile-card-image';
import { ThreeDIconOrb } from './icon-3d-orb';

type Draft = {
  contactName: string;
  companyName: string;
  jobTitle: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  website: string;
  notes: string;
  sourceLabel: string;
  familyId: string;
  requirement: string;
};

function draftFromExtraction(extraction: ContactServerExtractionResult | null): Draft {
  return {
    contactName: extraction?.draft.contactName || '',
    companyName: extraction?.draft.companyName || '',
    jobTitle: extraction?.draft.jobTitle || '',
    email: extraction?.draft.email || '',
    phone: extraction?.draft.phone || '',
    phoneSecondary: extraction?.draft.phoneSecondary || '',
    website: extraction?.draft.website || '',
    notes: '',
    sourceLabel: extraction?.sourceLabel || 'Mobile business card scan',
    familyId: '',
    requirement: '',
  };
}

function hasDraftSignal(draft: Draft) {
  return Boolean(draft.contactName || draft.companyName || draft.email || draft.phone || draft.website || draft.notes);
}

function workspaceModeForLeadType(leadType: 'buyer' | 'supplier') {
  return leadType === 'supplier' ? 'suppliers' : 'buyers';
}

async function tryBrowserTextDetection(file: File): Promise<string> {
  if (typeof window === 'undefined') return '';
  const Detector = (window as unknown as { TextDetector?: new () => { detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string; text?: string }>> } }).TextDetector;
  if (!Detector || !file.type.startsWith('image/')) return '';
  try {
    const bitmap = await createImageBitmap(file);
    const detector = new Detector();
    const blocks = await detector.detect(bitmap);
    bitmap.close?.();
    return blocks.map((block) => block.rawValue || block.text || '').filter(Boolean).join('\n').trim();
  } catch {
    return '';
  }
}

export function MobileBusinessCardScanner({ initialLeadType = 'buyer', eventId, serviceFamilies = [] }: { initialLeadType?: 'buyer' | 'supplier'; eventId?: string | null; serviceFamilies?: Array<{ id: string; name: string }> }) {
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>(initialLeadType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [assistText, setAssistText] = useState('');
  const [extraction, setExtraction] = useState<ContactServerExtractionResult | null>(null);
  const [draft, setDraft] = useState<Draft>(draftFromExtraction(null));
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('Take or upload a business card photo. The scan will prefill the lead fields for review.');
  const [error, setError] = useState('');
  const [createdLeadId, setCreatedLeadId] = useState('');
  const [dictating, setDictating] = useState(false);
  const [dictationMessage, setDictationMessage] = useState('');
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<HTMLElement | null>(null);
  const savingRef = useRef(false);
  const [lastSavedName, setLastSavedName] = useState('');

  const previewKind = useMemo(() => selectedFile?.type?.startsWith('image/') ? 'image' : selectedFile?.type === 'application/pdf' ? 'pdf' : 'none', [selectedFile]);
  const canScan = Boolean(scanFile || assistText.trim());
  const canSave = Boolean(draft.companyName.trim() || draft.contactName.trim()) && !isSaving && !isScanning && !createdLeadId;

  function updateField(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setCreatedLeadId('');
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setLastSavedName('');
    setScanFile(null);
    setExtraction(null);
    setDraft(draftFromExtraction(null));
    setError('');
    setCreatedLeadId('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = file ? URL.createObjectURL(file) : '';
    setPreviewUrl(nextPreview);
    if (!file) {
      setStatus('Take or upload a business card photo.');
      return;
    }
    if (file.type.startsWith('image/') && file.size > MOBILE_SCAN_MAX_ORIGINAL_IMAGE_BYTES) {
      setError('This photo is too large for mobile scan. Retake it closer to the card or choose an image under 10 MB.');
      setStatus('This photo is too large for mobile scan. Retake it closer to the card or choose an image under 10 MB.');
      return;
    }
    if (file.type === 'application/pdf' && file.size > MOBILE_SCAN_MAX_PDF_UPLOAD_BYTES) {
      setError('This PDF is too large for mobile scan. Upload a PDF under 3 MB, or take a photo of the card instead.');
      setStatus('This PDF is too large for mobile scan. Upload a PDF under 3 MB, or take a photo of the card instead.');
      return;
    }
    setScanFile(file);
    // iOS/Android file pickers close after photo capture: process that same photo
    // immediately instead of requiring a second 'scan card' action.
    void runScan(file);
  }

  function toggleDictation() {
    if (dictating) { recognitionRef.current?.stop(); setDictating(false); return; }
    const SpeechCtor = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechCtor) {
      setDictationMessage('Use your keyboard microphone to dictate into Customer requirements, or type your notes. Browser voice recognition is not available.');
      return;
    }
    const recognition = new SpeechCtor();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => {
      const text = Array.from(event.results).slice(event.resultIndex).map((result) => result[0]?.transcript ?? '').join(' ').trim();
      if (text) setDraft((current) => ({ ...current, requirement: [current.requirement.trim(), text].filter(Boolean).join(' ') }));
    };
    recognition.onerror = () => { setDictating(false); setDictationMessage('Voice recording stopped. Check microphone permission or use your keyboard microphone.'); };
    recognition.onend = () => setDictating(false);
    try { recognition.start(); recognitionRef.current = recognition; setDictating(true); setDictationMessage('Listening… describe the customer requirement.'); }
    catch { setDictationMessage('Microphone could not start. Use your keyboard microphone or type the requirement.'); }
  }

  async function runScan(fileOverride?: File) {
    setIsScanning(true);
    setError('');
    setCreatedLeadId('');
    setStatus('Scanning card and reading contact details…');
    try {
      const formData = new FormData();
      const sourceFile = fileOverride ?? selectedFile;
      let uploadFile = fileOverride ?? scanFile;
      if (sourceFile) {
        setStatus('Preparing photo for secure mobile scan…');
        const prepared = await prepareMobileScanFile(sourceFile);
        uploadFile = prepared.file;
        setScanFile(prepared.file);
        if (prepared.compressed) setStatus(prepared.note);
      }
      const browserText = sourceFile ? await tryBrowserTextDetection(sourceFile) : '';
      const combinedAssistText = [assistText.trim(), browserText].filter(Boolean).join('\n');
      if (uploadFile) formData.set('source', uploadFile);
      if (combinedAssistText.trim()) formData.set('assist_text', combinedAssistText.trim());
      if (browserText && !assistText.trim()) setAssistText(browserText);
      formData.set('source_mode', uploadFile ? 'camera' : 'manual');
      const result = await extractContactScan(undefined, formData);
      if (result.error) throw new Error(result.error);
      if (!result.extraction) throw new Error('No scan result returned.');
      setExtraction(result.extraction);
      const nextDraft = draftFromExtraction(result.extraction);
      setDraft((current) => ({ ...nextDraft, familyId: current.familyId, requirement: current.requirement, notes: current.notes }));
      if (hasDraftSignal(nextDraft)) {
        setStatus('Lead fields were prefilled. Review and save when ready.');
      } else if (result.extraction.boundary === 'server_image_ocr_ready' || result.extraction.boundary === 'server_pdf_ocr_ready') {
        setStatus('The card was received, but contact details could not be read. Add visible text or try another image.');
      } else {
        setStatus('Scan finished with limited data. Add or correct values before saving.');
      }
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : 'Business card scan failed.';
      setError(message);
      setStatus(message);
      setExtraction(null);
    } finally {
      setIsScanning(false);
    }
  }

  async function saveLead() {
    if (savingRef.current || createdLeadId) return;
    savingRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      const formData = new FormData();
      const workspaceMode = workspaceModeForLeadType(leadType);
      formData.set('lead_type', leadType);
      formData.set('workspace_mode', workspaceMode);
      formData.set('mode', workspaceMode);
      formData.set('contact_name', draft.contactName);
      formData.set('company_name', draft.companyName || draft.contactName || 'Scanned contact');
      formData.set('job_title', draft.jobTitle);
      formData.set('email', draft.email);
      formData.set('phone', draft.phone);
      formData.set('phone_secondary', draft.phoneSecondary);
      formData.set('website', draft.website);
      const chosenFamily = serviceFamilies.find((family) => family.id === draft.familyId);
      formData.set('notes', [
        chosenFamily ? `Interested in category: ${chosenFamily.name}` : '',
        draft.requirement.trim(),
        draft.notes.trim(),
      ].filter(Boolean).join('\n\n'));
      formData.set('source_label', draft.sourceLabel || selectedFile?.name || 'Mobile business card scan');
      formData.set('source_profile', extraction?.sourceProfile || 'business_card');
      formData.set('extraction_boundary', extraction?.boundary || 'server_manual_text');
      if (eventId) formData.set('trade_event_id', eventId);
      const result = await createLeadFromContactScanReview(formData);
      if (result.error) throw new Error(result.error);
      if (!result.success || !result.lead?.id) throw new Error('Lead save could not be verified. Please retry without taking another picture.');
      // The confirmed lead is saved; reset every capture field for the next visitor.
      // Keep the event and buyer/supplier selection so trade-show capture stays fast.
      setLastSavedName(draft.contactName.trim() || draft.companyName.trim() || 'Contact');
      setCreatedLeadId('');
      setSelectedFile(null);
      setScanFile(null);
      setExtraction(null);
      setAssistText('');
      setDraft(draftFromExtraction(null));
      setDictationMessage('');
      if (dictating) recognitionRef.current?.stop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatus('Ready to scan the next business card.');
      scannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to create lead from business card scan.';
      setError(message);
      setStatus(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <section ref={scannerRef} className="space-y-4">
      {lastSavedName ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">✓ {lastSavedName} saved successfully. Ready for the next business card.</div> : null}
      <div className="rounded-hero bg-[linear-gradient(145deg,#0c172d_0%,#122241_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Business card scan</p>
            <h1 className="mt-2 text-3xl font-black leading-none tracking-tight">Scan card. Prefill lead. Save fast.</h1>
            <p className="mt-3 text-sm text-white/68">Use camera capture on mobile, review the extracted contact fields, then save as buyer or supplier.</p>
          </div>
          <ThreeDIconOrb icon="📷" tone="gold" />
        </div>
      </div>

      <div className="rounded-hero border border-white/70 bg-white/95 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1 dark:bg-slate-800">
          {(['buyer', 'supplier'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setLeadType(item)} className={`min-h-12 rounded-2xl font-black capitalize ${leadType === item ? 'bg-white text-blue-600 shadow dark:bg-slate-950 dark:text-sky-300' : 'text-slate-500'}`}>{item}</button>
          ))}
        </div>

        <label className="mt-4 flex min-h-[156px] cursor-pointer flex-col items-center justify-center rounded-hero border border-dashed border-blue-200 bg-blue-50/70 px-4 py-5 text-center dark:border-blue-900 dark:bg-blue-950/30">
          <span className="text-3xl">📇</span>
          <span className="mt-2 text-sm font-black text-slate-950 dark:text-white">{selectedFile ? 'Retake or replace card photo' : 'Take or upload business card photo'}</span>
          <span className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">Camera capture is enabled on mobile. Large phone photos are optimized before scan.</span>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={onFileChange} data-mobile-card-scan-input />
        </label>

        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-hero border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {previewKind === 'image' ? <img src={previewUrl} alt="Selected business card" className="max-h-72 w-full object-contain" /> : <iframe src={previewUrl} title="Selected business card PDF" className="h-72 w-full" />}
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Assist text optional</span>
          <textarea value={assistText} onChange={(event) => setAssistText(event.target.value)} placeholder="Add visible text only if the photo is blurry or incomplete." className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none ring-blue-500/20 focus:ring-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>

        {(!selectedFile || error) ? <button type="button" onClick={() => void runScan()} disabled={!canScan || isScanning} className="mt-4 min-h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#2563ff,#62a6ff_52%,#7c3aed)] text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-55">
          {isScanning ? 'Scanning business card…' : selectedFile ? 'Retry reading this photo' : 'Read entered text'}
        </button> : null}

        <p className={`mt-3 rounded-2xl px-4 py-3 text-xs font-semibold leading-5 ${error ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{status}</p>
      </div>

      <div className="rounded-hero border border-white/70 bg-white/95 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Prefilled lead</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Review before save</h2>
          </div>
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-black text-blue-700 dark:text-sky-300">{extraction?.sourceProfile?.replace('_', ' ') || 'card'}</span>
        </div>

        <div className="mt-4 grid gap-3">
          <input value={draft.contactName} onChange={(event) => updateField('contactName', event.target.value)} placeholder="Full name" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="contactName" />
          <input value={draft.companyName} onChange={(event) => updateField('companyName', event.target.value)} placeholder="Company" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="companyName" />
          <input value={draft.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} placeholder="Title / role" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <input value={draft.email} onChange={(event) => updateField('email', event.target.value)} placeholder="Email" type="email" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="email" />
          <input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Phone" inputMode="tel" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="phone" />
          <input value={draft.phoneSecondary} onChange={(event) => updateField('phoneSecondary', event.target.value)} placeholder="Secondary phone" inputMode="tel" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <input value={draft.website} onChange={(event) => updateField('website', event.target.value)} placeholder="Website" inputMode="url" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          {serviceFamilies.length > 0 ? <label className="grid gap-2 text-sm font-semibold text-slate-950 dark:text-white">
            Stark Packmate service family
            <select value={draft.familyId} onChange={(event) => updateField('familyId', event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">Select customer interest (optional)</option>
              {serviceFamilies.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
            </select>
          </label> : null}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/30">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="scan-customer-requirement" className="text-sm font-bold text-slate-950 dark:text-white">Customer requirements</label>
              <button type="button" onClick={toggleDictation} aria-pressed={dictating} className="min-h-11 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white">{dictating ? 'Stop dictation' : '🎙 Dictate'}</button>
            </div>
            <textarea id="scan-customer-requirement" value={draft.requirement} onChange={(event) => updateField('requirement', event.target.value)} placeholder="Describe pouch type, size, quantity, artwork, delivery or customer needs…" rows={4} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <p role="status" className="mt-2 text-xs text-slate-600 dark:text-slate-300">{dictationMessage || 'Speech is recorded only in customer requirements. If iOS does not support browser dictation, use the microphone on your keyboard.'}</p>
          </div>
          <textarea value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Additional private sales notes (optional)" rows={3} className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>

        <button type="button" onClick={saveLead} disabled={!canSave} className="mt-4 min-h-14 w-full rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/15 disabled:opacity-55 dark:bg-white dark:text-slate-950">
          {isSaving ? 'Saving lead…' : createdLeadId ? 'Lead saved' : `Save ${leadType} lead`}
        </button>
        {createdLeadId ? <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">Lead saved successfully. <a className="underline" href={`/leads/${encodeURIComponent(createdLeadId)}`}>Open saved lead</a></div> : null}
      </div>
    </section>
  );
}
