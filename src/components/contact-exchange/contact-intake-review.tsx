'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StateMessage } from '@/components/ui/state-message';
import { useMemo, useState, type ChangeEvent } from 'react';
import { createLeadFromContactScanReview, extractContactScan } from '@/features/leads/server/contact-scan-actions';
import { parseWorkspaceMode, workspaceModeToLeadJourney } from '@/features/workspace/mode';
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

function workspaceModeForLeadType(leadType: 'buyer' | 'supplier') {
  return leadType === 'supplier' ? 'suppliers' : 'buyers';
}

export function ContactIntakeReview({ initialEventId = null }: { initialEventId?: string | null }) {
  const searchParams = useSearchParams();
  const routeLeadType = workspaceModeToLeadJourney(parseWorkspaceMode(searchParams.get('mode')));
  const initialLeadType = routeLeadType === '' ? 'buyer' : routeLeadType;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicCardUrl, setPreviewUrl] = useState('');
  const [assistText, setAssistText] = useState('');
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>(initialLeadType);
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
    setLeadType(initialLeadType);
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
      formData.set('notes', draft.notes);
      formData.set('source_label', draft.sourceLabel || selectedFile?.name || 'Contact scan review');
      formData.set('source_profile', extraction?.sourceProfile || 'generic');
      formData.set('extraction_boundary', extraction?.boundary || 'server_manual_text');
      if (initialEventId) formData.set('trade_event_id', initialEventId);

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
              : 'Run review extraction, confirm the buyer/supplier type, then create the CRM lead with the correct journey.'}
            tone="info"
          />
        </section>
      </div>
    </div>
  );
}
