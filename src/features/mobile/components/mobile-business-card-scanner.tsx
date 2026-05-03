'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
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
    notes: extraction?.draft.notes || '',
    sourceLabel: extraction?.sourceLabel || 'Mobile business card scan',
  };
}

function hasDraftSignal(draft: Draft) {
  return Boolean(draft.contactName || draft.companyName || draft.email || draft.phone || draft.website || draft.notes);
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

export function MobileBusinessCardScanner({ initialLeadType = 'buyer', eventId }: { initialLeadType?: 'buyer' | 'supplier'; eventId?: string | null }) {
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

  const previewKind = useMemo(() => selectedFile?.type?.startsWith('image/') ? 'image' : selectedFile?.type === 'application/pdf' ? 'pdf' : 'none', [selectedFile]);
  const canScan = Boolean(scanFile || assistText.trim());
  const canSave = hasDraftSignal(draft) && !isSaving;

  function updateField(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setCreatedLeadId('');
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
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
    setStatus(`Card ready: ${file.name} (${Math.round(file.size / 1024)} KB). Tap Scan business card to extract details.`);
  }

  async function runScan() {
    setIsScanning(true);
    setError('');
    setCreatedLeadId('');
    setStatus('Scanning card and reading contact details…');
    try {
      const formData = new FormData();
      let uploadFile = scanFile;
      if (selectedFile) {
        setStatus('Preparing photo for secure mobile scan…');
        const prepared = await prepareMobileScanFile(selectedFile);
        uploadFile = prepared.file;
        setScanFile(prepared.file);
        if (prepared.compressed) setStatus(prepared.note);
      }
      const browserText = selectedFile ? await tryBrowserTextDetection(selectedFile) : '';
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
      setDraft(nextDraft);
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
    setIsSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('lead_type', leadType);
      formData.set('contact_name', draft.contactName);
      formData.set('company_name', draft.companyName || draft.contactName || 'Scanned contact');
      formData.set('job_title', draft.jobTitle);
      formData.set('email', draft.email);
      formData.set('phone', draft.phone);
      formData.set('phone_secondary', draft.phoneSecondary);
      formData.set('website', draft.website);
      formData.set('notes', draft.notes);
      formData.set('source_label', draft.sourceLabel || selectedFile?.name || 'Mobile business card scan');
      formData.set('source_profile', extraction?.sourceProfile || 'business_card');
      formData.set('extraction_boundary', extraction?.boundary || 'server_manual_text');
      if (eventId) formData.set('trade_event_id', eventId);
      const result = await createLeadFromContactScanReview(formData);
      if (result.error) throw new Error(result.error);
      setCreatedLeadId(result.lead?.id ?? 'created');
      setStatus('Lead created from business card scan.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to create lead from business card scan.';
      setError(message);
      setStatus(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-[2rem] bg-[linear-gradient(145deg,#0c172d_0%,#122241_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Business card scan</p>
            <h1 className="mt-2 text-3xl font-black leading-none tracking-tight">Scan card. Prefill lead. Save fast.</h1>
            <p className="mt-3 text-sm text-white/68">Use camera capture on mobile, review the extracted contact fields, then save as buyer or supplier.</p>
          </div>
          <ThreeDIconOrb icon="📷" tone="gold" />
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/95 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1 dark:bg-slate-800">
          {(['buyer', 'supplier'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setLeadType(item)} className={`min-h-12 rounded-2xl font-black capitalize ${leadType === item ? 'bg-white text-blue-600 shadow dark:bg-slate-950 dark:text-sky-300' : 'text-slate-500'}`}>{item}</button>
          ))}
        </div>

        <label className="mt-4 flex min-h-[156px] cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-blue-200 bg-blue-50/70 px-4 py-5 text-center dark:border-blue-900 dark:bg-blue-950/30">
          <span className="text-3xl">📇</span>
          <span className="mt-2 text-sm font-black text-slate-950 dark:text-white">Take or upload business card photo</span>
          <span className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">Camera capture is enabled on mobile. Large phone photos are optimized before scan.</span>
          <input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={onFileChange} data-mobile-card-scan-input />
        </label>

        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {previewKind === 'image' ? <img src={previewUrl} alt="Selected business card" className="max-h-72 w-full object-contain" /> : <iframe src={previewUrl} title="Selected business card PDF" className="h-72 w-full" />}
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Assist text optional</span>
          <textarea value={assistText} onChange={(event) => setAssistText(event.target.value)} placeholder="Add visible text only if the photo is blurry or incomplete." className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none ring-blue-500/20 focus:ring-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>

        <button type="button" onClick={runScan} disabled={!canScan || isScanning} className="mt-4 min-h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#2563ff,#62a6ff_52%,#7c3aed)] text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-55">
          {isScanning ? 'Scanning business card…' : 'Scan business card'}
        </button>

        <p className={`mt-3 rounded-2xl px-4 py-3 text-xs font-semibold leading-5 ${error ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{status}</p>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/95 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
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
          <input value={draft.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} placeholder="Role / title" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="jobTitle" />
          <input value={draft.email} onChange={(event) => updateField('email', event.target.value)} placeholder="Email" type="email" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="email" />
          <input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Phone" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="phone" />
          <input value={draft.website} onChange={(event) => updateField('website', event.target.value)} placeholder="Website" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="website" />
          <textarea value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Notes" className="min-h-24 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" data-mobile-scan-field="notes" />
        </div>

        <button type="button" onClick={saveLead} disabled={!canSave} className="mt-4 min-h-14 w-full rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg dark:bg-white dark:text-slate-950 disabled:opacity-55">
          {isSaving ? 'Saving lead…' : createdLeadId ? 'Lead saved' : `Save ${leadType} lead`}
        </button>
        {createdLeadId ? <a href={`/leads/${createdLeadId}`} className="mt-3 block text-center text-sm font-black text-blue-600 dark:text-sky-300">Open saved lead →</a> : null}
      </div>
    </section>
  );
}
