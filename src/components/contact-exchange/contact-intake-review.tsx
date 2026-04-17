'use client';

import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { useMemo, useState, type ChangeEvent } from 'react';
import { createLeadFromContactScanReview, extractContactScan } from '@/features/leads/server/contact-scan-actions';
import type { ContactServerExtractionResult } from '@/lib/contact-exchange/contact-extraction';

type ReviewDraft = {
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

type CreatedLeadState = {
  id: string;
  companyName: string;
  sourceLabel: string;
};

function buildDraftFromExtraction(extraction: ContactServerExtractionResult | null): ReviewDraft {
  return {
    contactName: extraction?.draft.contactName || '',
    companyName: extraction?.draft.companyName || '',
    jobTitle: extraction?.draft.jobTitle || '',
    email: extraction?.draft.email || '',
    phone: extraction?.draft.phone || '',
    phoneSecondary: extraction?.draft.phoneSecondary || '',
    website: extraction?.draft.website || '',
    notes: extraction?.draft.notes || '',
    sourceLabel: extraction?.sourceLabel || 'Contact scan review',
  };
}

function hasMeaningfulDraft(draft: ReviewDraft) {
  return Boolean(
    draft.companyName.trim() ||
      draft.contactName.trim() ||
      draft.email.trim() ||
      draft.phone.trim() ||
      draft.phoneSecondary.trim() ||
      draft.website.trim() ||
      draft.notes.trim(),
  );
}

function humanizeProfile(profile: ContactServerExtractionResult['sourceProfile']) {
  return profile === 'business_card' ? 'business card' : profile === 'screenshot' ? 'screenshot' : profile === 'scan_pdf' ? 'scan-PDF' : 'generic source';
}

export function ContactIntakeReview() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicCardUrl, setPreviewUrl] = useState('');
  const [assistText, setAssistText] = useState('');
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>('buyer');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('Upload a source or paste visible text, then run review extraction.');
  const [reviewError, setReviewError] = useState('');
  const [extraction, setExtraction] = useState<ContactServerExtractionResult | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>(buildDraftFromExtraction(null));
  const [createdLead, setCreatedLead] = useState<CreatedLeadState | null>(null);

  const previewKind = useMemo(() => {
    if (!selectedFile?.type) return 'empty';
    if (selectedFile.type.startsWith('image/')) return 'image';
    if (selectedFile.type === 'application/pdf') return 'pdf';
    return 'file';
  }, [selectedFile]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setExtraction(null);
    setDraft(buildDraftFromExtraction(null));
    setReviewConfirmed(false);
    setCreatedLead(null);
    setReviewError('');

    if (!nextFile) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    setPreviewUrl(objectUrl);

    if (nextFile.type.startsWith('text/')) {
      const text = await nextFile.text();
      setAssistText((current: string) => current || text);
    }
  }

  async function runReview() {
    setIsReviewing(true);
    setReviewError('');
    setCreatedLead(null);
    setReviewMessage('Running live review extraction…');
    try {
      const formData = new FormData();
      if (selectedFile) formData.set('source', selectedFile);
      if (assistText.trim()) formData.set('assist_text', assistText.trim());
      formData.set('source_mode', selectedFile ? 'upload' : 'manual');

      const result = await extractContactScan(undefined, formData);
      if (result.error) throw new Error(result.error);
      if (!result.extraction) throw new Error('No extraction payload was returned.');

      setExtraction(result.extraction);
      setDraft(buildDraftFromExtraction(result.extraction));
      setReviewMessage('Review extracted fields, edit what looks wrong, confirm, then create the lead.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to run review extraction.';
      setExtraction(null);
      setDraft(buildDraftFromExtraction(null));
      setReviewError(message);
      setReviewMessage(message);
    } finally {
      setIsReviewing(false);
    }
  }

  function resetReview() {
    setAssistText('');
    setSelectedFile(null);
    setPreviewUrl('');
    setExtraction(null);
    setDraft(buildDraftFromExtraction(null));
    setReviewConfirmed(false);
    setReviewError('');
    setCreatedLead(null);
    setLeadType('buyer');
    setReviewMessage('Upload a source or paste visible text, then run review extraction.');
  }

  function updateField(field: keyof ReviewDraft, value: string) {
    setReviewConfirmed(false);
    setDraft((current: ReviewDraft) => ({ ...current, [field]: value }));
  }

  async function handleCreateLead() {
    setIsCreating(true);
    setReviewError('');
    setCreatedLead(null);
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
      formData.set('source_label', draft.sourceLabel || selectedFile?.name || 'Contact scan review');
      formData.set('source_profile', extraction?.sourceProfile || 'generic');
      formData.set('extraction_boundary', extraction?.boundary || 'server_manual_text');

      const result = await createLeadFromContactScanReview(formData);
      if (result.error) throw new Error(result.error);
      if (!result.lead?.id) throw new Error('Lead create completed without a CRM record.');

      setCreatedLead({
        id: result.lead.id,
        companyName: result.lead.company_name,
        sourceLabel: result.lead.source_label || 'Contact Scan Review',
      });
      setReviewMessage(result.success || 'Reviewed scan confirmed and created as a lead.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create lead from reviewed scan.';
      setReviewError(message);
      setReviewMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  const canRunReview = Boolean(selectedFile || assistText.trim());
  const canCreateLead = reviewConfirmed && hasMeaningfulDraft(draft) && !isCreating;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Live intake</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Upload source and review</h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Review first
            </span>
          </div>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
            <span className="text-sm font-semibold text-slate-900">Choose image, PDF, or text file</span>
            <span className="mt-2 text-sm text-slate-600">
              Upload the source, then add any visible text to improve extraction quality before lead creation.
            </span>
            <input
              type="file"
              accept="image/*,application/pdf,text/plain"
              className="sr-only"
              onChange={onFileChange}
            />
          </label>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <strong className="text-slate-900">Selected source:</strong>{' '}
              {selectedFile
                ? `${selectedFile.name} (${selectedFile.type || 'unknown type'})`
                : 'No file chosen yet'}
            </p>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-900">Assist text</span>
            <textarea
              value={assistText}
              onChange={(event: any) => setAssistText(event.target.value)}
              placeholder="Paste any visible text from the card, PDF, image, or shared document to improve the review result."
              className="mt-2 min-h-[160px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <StateMessage
            className="mt-4"
            title="What happens next"
            description={createdLead
              ? 'The reviewed scan is now a live CRM lead. Open it and continue qualification or move straight into Quote when the opportunity is ready.'
              : 'Run review extraction, correct anything that looks wrong, confirm the reviewed fields, then create the lead.'}
            tone={createdLead ? 'success' : 'neutral'}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runReview()}
              disabled={!canRunReview || isReviewing}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReviewing ? 'Running review…' : 'Run review extraction'}
            </button>
            <button
              type="button"
              onClick={resetReview}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Source review</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Keep the source beside the extracted fields
          </h3>
          <div className="mt-5 min-h-[360px] rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4">
            {!selectedFile ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-slate-500">
                Upload a file and run review extraction to open the review state.
              </div>
            ) : previewKind === 'image' ? (
              <img
                src={publicCardUrl}
                alt={selectedFile.name}
                className="max-h-[460px] w-full rounded-2xl border border-slate-200 object-contain bg-white"
              />
            ) : previewKind === 'pdf' ? (
              <iframe
                src={publicCardUrl}
                title={selectedFile.name}
                className="h-[420px] w-full rounded-2xl border border-slate-200 bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="mt-2">
                    A browser view is not available for this file type, but the review result remains visible.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
              Extraction result
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Review extracted fields before lead creation
            </h3>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Manual confirmation
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Prefill value</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {(extraction?.fields ?? []).map((field) => (
                <tr key={field.label} className="border-t border-slate-100 bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">{field.label}</td>
                  <td className="px-4 py-3 text-slate-600">{field.value || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        field.confidence === 'High'
                          ? 'bg-emerald-50 text-emerald-700'
                          : field.confidence === 'Medium'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {field.confidence}
                    </span>
                  </td>
                </tr>
              ))}
              {!extraction ? (
                <tr className="border-t border-slate-100 bg-white">
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={3}>
                    No review result yet. Run extraction to populate the table.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Reviewed CRM payload</p>
                <p className="mt-1 text-xs text-slate-500">Edit anything that looks wrong before the lead is created.</p>
              </div>
              <div className="flex gap-2">
                {(['buyer', 'supplier'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLeadType(value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${leadType === value ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Full name</span><input value={draft.contactName} onChange={(event: any) => updateField('contactName', event.target.value)} className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" /></label>
              <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company</span><input value={draft.companyName} onChange={(event: any) => updateField('companyName', event.target.value)} className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" /></label>
              <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</span><input value={draft.jobTitle} onChange={(event: any) => updateField('jobTitle', event.target.value)} className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" /></label>
              <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</span><input type="email" value={draft.email} onChange={(event: any) => updateField('email', event.target.value)} className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" /></label>
              <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone</span><input value={draft.phone} onChange={(event: any) => updateField('phone', event.target.value)} className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" /></label>
              <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone 2</span><input value={draft.phoneSecondary} onChange={(event: any) => updateField('phoneSecondary', event.target.value)} className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" /></label>
              <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Website</span><input value={draft.website} onChange={(event: any) => updateField('website', event.target.value)} className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" /></label>
              <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes</span><textarea value={draft.notes} onChange={(event: any) => updateField('notes', event.target.value)} className="min-h-[140px] w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" placeholder="Add any context that should follow the lead into the CRM." /></label>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Create gate</p>
            <ul className="mt-3 space-y-2">
              <li>Source profile: <span className="font-medium text-slate-900">{humanizeProfile(extraction?.sourceProfile || 'generic')}</span></li>
              <li>Extraction boundary: <span className="font-medium text-slate-900">{(extraction?.boundary || 'server_manual_text').replace(/_/g, ' ')}</span></li>
              <li>Internal source label: <span className="font-medium text-slate-900">{draft.sourceLabel || 'Contact scan review'}</span></li>
              <li>Lead type on create: <span className="font-medium text-slate-900">{leadType}</span></li>
            </ul>
            <label className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
              <input type="checkbox" checked={reviewConfirmed} onChange={(event: any) => setReviewConfirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" />
              <span>
                <strong className="text-slate-900">Review confirmed.</strong> I checked the extracted values against the source and want to create a real CRM lead from this reviewed scan.
              </span>
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleCreateLead()}
                disabled={!canCreateLead}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? 'Creating lead…' : 'Confirm & Create Lead'}
              </button>
            </div>
            <div className="mt-4 rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
              {reviewMessage}
            </div>
            {reviewError ? <p className="mt-3 text-sm font-medium text-rose-600">{reviewError}</p> : null}
            {createdLead ? (
              <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold text-emerald-900">Lead created: {createdLead.companyName}</p>
                <p className="mt-1">Internal source attribution: {createdLead.sourceLabel}</p>
                <Link href={`/leads/${createdLead.id}`} className="mt-3 inline-flex rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Open lead
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
