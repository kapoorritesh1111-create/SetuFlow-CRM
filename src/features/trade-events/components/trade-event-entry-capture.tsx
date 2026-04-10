'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { saveTradeEventEntry } from '@/features/trade-events/server/actions';

type TradeEventOption = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
};

type CaptureMode = 'manual' | 'ocr';

type SuggestedFields = {
  company: string;
  contact: string;
  title: string;
  email: string;
  phone: string;
  country: string;
};

type FieldConfidence = 'high' | 'review';

type SuggestedFieldMeta = Record<keyof SuggestedFields, FieldConfidence>;

const EMPTY_SUGGESTIONS: SuggestedFields = {
  company: '',
  contact: '',
  title: '',
  email: '',
  phone: '',
  country: '',
};

const EMPTY_FIELD_META: SuggestedFieldMeta = {
  company: 'review',
  contact: 'review',
  title: 'review',
  email: 'review',
  phone: 'review',
  country: 'review',
};

function normalizeLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBusinessCardText(value: string): SuggestedFields {
  const lines = normalizeLines(value);
  if (!lines.length) return EMPTY_SUGGESTIONS;

  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = value.match(/(?:\+?\d[\d()\-\s]{7,}\d)/)?.[0]?.trim() ?? '';
  const companyKeywords = /(inc|llc|ltd|limited|pvt|private|corp|company|foods|international|exports|trading|group)/i;
  const countryKeywords = /(india|uae|united arab emirates|usa|united states|uk|united kingdom|germany|france|italy|spain|netherlands|singapore|australia|canada|japan|china)/i;

  const company = lines.find((line) => companyKeywords.test(line)) ?? lines.at(-1) ?? '';
  const contact = lines.find((line) => /^[A-Za-z][A-Za-z .'-]{3,}$/.test(line) && !companyKeywords.test(line) && !countryKeywords.test(line) && !/@/.test(line)) ?? lines[0] ?? '';
  const title = lines.find((line) => /(manager|director|sales|procurement|founder|owner|partner|head|lead|executive|buyer)/i.test(line)) ?? '';
  const country = lines.find((line) => countryKeywords.test(line)) ?? '';

  return {
    company: company === contact ? '' : company,
    contact,
    title,
    email,
    phone,
    country,
  };
}


function buildFieldMeta(suggested: SuggestedFields): SuggestedFieldMeta {
  return {
    company: suggested.company.length >= 3 ? 'high' : 'review',
    contact: suggested.contact.length >= 3 ? 'high' : 'review',
    title: suggested.title ? 'high' : 'review',
    email: suggested.email.includes('@') ? 'high' : 'review',
    phone: suggested.phone.replace(/\D/g, '').length >= 8 ? 'high' : 'review',
    country: suggested.country.length >= 3 ? 'high' : 'review',
  };
}

function confidenceLabel(value: FieldConfidence) {
  return value === 'high' ? 'Higher confidence' : 'Review needed';
}

export function TradeEventEntryCapture({ events }: { events: TradeEventOption[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<CaptureMode>('manual');
  const [ocrText, setOcrText] = useState('');
  const [ocrFileLabel, setOcrFileLabel] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [sourceImageRetained, setSourceImageRetained] = useState(true);
  const [duplicateDisposition, setDuplicateDisposition] = useState<'new_contact' | 'possible_duplicate_review' | 'merge_later'>('new_contact');
  const [duplicateNotes, setDuplicateNotes] = useState('');
  const [qualificationDisposition, setQualificationDisposition] = useState<'needs_followup_review' | 'qualification_ready' | 'hold_for_manual_research'>('needs_followup_review');
  const [leadConversionBoundary, setLeadConversionBoundary] = useState<'intake_only' | 'prepare_for_qualification_queue' | 'do_not_convert_yet'>('intake_only');
  const [handoffPreparationReady, setHandoffPreparationReady] = useState(false);
  const [handoffPreparationNotes, setHandoffPreparationNotes] = useState('');
  const [handoffTrigger, setHandoffTrigger] = useState<'hold_for_review' | 'mark_export_ready'>('hold_for_review');
  const [handoffDistributionScope, setHandoffDistributionScope] = useState<'review_only' | 'single_contact_export_review'>('review_only');
  const [handoffPackageProfile, setHandoffPackageProfile] = useState<'basic_contact' | 'contact_plus_company' | 'contact_company_country'>('contact_plus_company');
  const [handoffAuditState, setHandoffAuditState] = useState<'hold_for_review' | 'export_ready_review' | 'exported_single_contact' | 'export_rolled_back_review'>('hold_for_review');
  const [handoffIssuanceControl, setHandoffIssuanceControl] = useState<'export_ready_not_issued' | 'issue_single_contact_export' | 'rollback_after_export'>('export_ready_not_issued');
  const [handoffRollbackReason, setHandoffRollbackReason] = useState('');
  const [handoffReconciliationNotes, setHandoffReconciliationNotes] = useState('');
  const [handoffExportEvidence, setHandoffExportEvidence] = useState('');
  const [handoffExportConfirmed, setHandoffExportConfirmed] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedFields>(EMPTY_SUGGESTIONS);
  const [fieldMeta, setFieldMeta] = useState<SuggestedFieldMeta>(EMPTY_FIELD_META);
  const [confirmed, setConfirmed] = useState<SuggestedFields>(EMPTY_SUGGESTIONS);
  const [isPending, startTransition] = useTransition();

  const hasSuggestions = useMemo(() => Object.values(suggestions).some(Boolean), [suggestions]);

  const handoffCompletenessReady = useMemo(() => Boolean(confirmed.contact.trim() && (confirmed.email.trim() || confirmed.phone.trim()) && handoffPreparationReady), [confirmed.contact, confirmed.email, confirmed.phone, handoffPreparationReady]);

  useEffect(() => {
    if (handoffTrigger !== 'mark_export_ready') {
      if (handoffAuditState !== 'hold_for_review') setHandoffAuditState('hold_for_review');
      if (handoffDistributionScope !== 'review_only') setHandoffDistributionScope('review_only');
      if (handoffIssuanceControl !== 'export_ready_not_issued') setHandoffIssuanceControl('export_ready_not_issued');
      if (handoffExportConfirmed) setHandoffExportConfirmed(false);
      if (handoffRollbackReason) setHandoffRollbackReason('');
      return;
    }

    if (!handoffCompletenessReady) {
      setHandoffAuditState('hold_for_review');
      setHandoffDistributionScope('review_only');
      setHandoffIssuanceControl('export_ready_not_issued');
      if (handoffExportConfirmed) setHandoffExportConfirmed(false);
      if (handoffRollbackReason) setHandoffRollbackReason('');
      setMessage('Export-ready handoff fell back to review-only because contact completeness or handoff preparation is no longer satisfied.');
      return;
    }

    if (handoffIssuanceControl === 'rollback_after_export') {
      if (handoffAuditState !== 'export_rolled_back_review') setHandoffAuditState('export_rolled_back_review');
      if (handoffDistributionScope !== 'review_only') setHandoffDistributionScope('review_only');
      return;
    }

    if (handoffDistributionScope !== 'single_contact_export_review') setHandoffDistributionScope('single_contact_export_review');

    if (handoffIssuanceControl === 'issue_single_contact_export') {
      if (handoffAuditState !== 'exported_single_contact') setHandoffAuditState('exported_single_contact');
      return;
    }

    if (handoffAuditState !== 'export_ready_review') setHandoffAuditState('export_ready_review');
  }, [handoffAuditState, handoffCompletenessReady, handoffDistributionScope, handoffExportConfirmed, handoffIssuanceControl, handoffPreparationReady, handoffRollbackReason, handoffTrigger]);

  const resetOcrState = () => {
    setOcrText('');
    setOcrFileLabel('');
    setReviewConfirmed(false);
    setOperatorNotes('');
    setSourceImageRetained(true);
    setDuplicateDisposition('new_contact');
    setDuplicateNotes('');
    setQualificationDisposition('needs_followup_review');
    setLeadConversionBoundary('intake_only');
    setHandoffPreparationReady(false);
    setHandoffPreparationNotes('');
    setHandoffTrigger('hold_for_review');
    setHandoffDistributionScope('review_only');
    setHandoffPackageProfile('contact_plus_company');
    setHandoffAuditState('hold_for_review');
    setHandoffIssuanceControl('export_ready_not_issued');
    setHandoffRollbackReason('');
    setHandoffReconciliationNotes('');
    setHandoffExportEvidence('');
    setHandoffExportConfirmed(false);
    setSuggestions(EMPTY_SUGGESTIONS);
    setFieldMeta(EMPTY_FIELD_META);
    setConfirmed(EMPTY_SUGGESTIONS);
  };

  const openDrawer = (nextMode: CaptureMode) => {
    setMode(nextMode);
    setMessage('');
    if (nextMode === 'ocr') resetOcrState();
    setOpen(true);
  };

  const applySuggestions = () => {
    const nextSuggestions = parseBusinessCardText(ocrText);
    setSuggestions(nextSuggestions);
    setFieldMeta(buildFieldMeta(nextSuggestions));
    setConfirmed(nextSuggestions);
    setReviewConfirmed(false);
    setHandoffExportConfirmed(false);
    setMessage(Object.values(nextSuggestions).some(Boolean) ? 'Suggested fields generated. Review and confirm before saving.' : 'No suggested fields found yet. Continue reviewing manually.');
  };

  const submit = (formData: FormData) => {
    if (mode === 'ocr') {
      if (!reviewConfirmed) {
        setMessage('Review confirmation is required before saving OCR suggestions.');
        return;
      }
      formData.set('captured_company_name', confirmed.company.trim());
      formData.set('captured_contact_name', confirmed.contact.trim());
      formData.set('captured_job_title', confirmed.title.trim());
      formData.set('captured_email', confirmed.email.trim());
      formData.set('captured_phone', confirmed.phone.trim());
      formData.set('captured_country', confirmed.country.trim());
      formData.set('source_label', 'ocr_business_card_review');
      formData.set('review_confirmed', 'yes');
      formData.set('duplicate_disposition', duplicateDisposition);
      formData.set('source_image_retained', sourceImageRetained ? 'yes' : 'no');
      formData.set('handoff_trigger', handoffTrigger);
      formData.set('handoff_distribution_scope', handoffDistributionScope);
      formData.set('handoff_package_profile', handoffPackageProfile);
      formData.set('handoff_audit_state', handoffAuditState);
      formData.set('handoff_issuance_control', handoffIssuanceControl);
      formData.set('handoff_rollback_reason', handoffRollbackReason.trim());
      formData.set('handoff_reconciliation_notes', handoffReconciliationNotes.trim());
      formData.set('handoff_export_evidence', handoffExportEvidence.trim());
      formData.set('handoff_export_confirmed', handoffExportConfirmed ? 'yes' : 'no');
      const reviewNotes = [
        operatorNotes.trim(),
        ocrFileLabel.trim() ? `OCR source: ${ocrFileLabel.trim()}` : 'OCR source: business card review',
        ocrText.trim() ? `OCR excerpt:\n${ocrText.trim().slice(0, 500)}` : null,
      ].filter(Boolean).join('\n\n');
      formData.set('captured_notes', reviewNotes);
    }

    startTransition(() => {
      void saveTradeEventEntry(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Entry captured.');
        if (!result?.error) {
          setOpen(false);
          if (mode === 'ocr') resetOcrState();
        }
      });
    });
  };

  const footer = mode === 'ocr'
    ? <DrawerActionBar title="Confirm reviewed OCR handoff entry" description="Nothing is saved silently. Confirm the reviewed fields first, then explicitly confirm any export-ready handoff trigger before creating the intake entry."><button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="trade-entry-form" disabled={isPending || !reviewConfirmed || !confirmed.company.trim() || (handoffTrigger === 'mark_export_ready' && !handoffExportConfirmed)} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Confirm and save OCR entry'}</button></DrawerActionBar>
    : <DrawerActionBar title="Create intake entry" description="The entry will land in the trade-show intake queue for qualification and conversion."><button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="trade-entry-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Save entry'}</button></DrawerActionBar>;

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft" id="capture">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Trade-show intake queue</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Capture raw booth entries before converting them to leads</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Use the manual path for fast raw booth capture, or the OCR review path when a business card needs suggested field mapping before any final save.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => openDrawer('manual')} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              Capture raw entry
            </button>
            <button type="button" onClick={() => openDrawer('ocr')} className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800">
              Review OCR card
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">1. One entry surface</p>
            <p className="mt-1">Start from one contained trade-event intake drawer rather than a silent auto-create path.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">2. Review-first mapping</p>
            <p className="mt-1">Suggested OCR fields remain editable until an operator confirms the reviewed values.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">3. Duplicate-safe review</p>
            <p className="mt-1">Operators mark OCR entries as net-new, possible duplicates, or merge-later before any downstream handoff.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">4. Audit-safe save</p>
            <p className="mt-1">The third build slice adds qualification-ready staging and still saves only after explicit confirmation.</p>
          </div>
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
      </section>

      <RightDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'ocr' ? 'Review OCR business card entry' : 'Capture trade event entry'}
        description={mode === 'ocr' ? 'Generate suggested fields from card text, review them, and confirm before the intake entry is saved.' : 'Store the raw contact first when you are not ready to create a qualified lead.'}
        footer={footer}
      >
        <form id="trade-entry-form" action={submit} className="space-y-5">
          <DrawerSection title="Trade event routing" description="Every intake entry lands in one event queue for later qualification and conversion.">
            <select name="trade_event_id" defaultValue="" required>
              <option value="">Select trade event</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </DrawerSection>

          {mode === 'manual' ? (
            <DrawerSection title="Raw capture" description="Capture just enough context for qualification and conversion.">
              <div className="grid gap-3 md:grid-cols-2">
                <input name="captured_company_name" placeholder="Company name" required />
                <input name="captured_contact_name" placeholder="Contact name" />
                <input name="captured_job_title" placeholder="Job title" />
                <input name="captured_email" placeholder="Email" type="email" />
                <input name="captured_phone" placeholder="Phone" />
                <input name="captured_country" placeholder="Country" />
                <input name="source_label" placeholder="Booth / hall / source note" />
                <textarea name="captured_notes" className="md:col-span-2" rows={4} placeholder="Products discussed, follow-up needs, urgency, or qualification notes" />
              </div>
            </DrawerSection>
          ) : (
            <>
              <DrawerSection title="OCR intake entry surface" description="Use one contained OCR entry path. Paste OCR card text, then generate suggested fields for review.">
                <div className="space-y-3">
                  <input value={ocrFileLabel} onChange={(event) => setOcrFileLabel(event.target.value)} placeholder="Card image or scan label (optional)" />
                  <textarea value={ocrText} onChange={(event) => setOcrText(event.target.value)} rows={6} placeholder="Paste OCR text from the business card here before mapping suggested fields" />
                  <button type="button" onClick={applySuggestions} className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800">
                    Generate suggested fields
                  </button>
                </div>
              </DrawerSection>

              <DrawerSection title="Review-state field mapping" description="Suggested OCR values stay editable. Low-confidence fields are highlighted until an operator confirms the reviewed mapping.">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Suggested fields</p>
                    <dl className="mt-3 space-y-2">
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Company</dt><dd>{suggestions.company || '—'}<span className="ml-2 text-[11px] text-slate-400">{confidenceLabel(fieldMeta.company)}</span></dd></div>
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Contact</dt><dd>{suggestions.contact || '—'}<span className="ml-2 text-[11px] text-slate-400">{confidenceLabel(fieldMeta.contact)}</span></dd></div>
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Title</dt><dd>{suggestions.title || '—'}<span className="ml-2 text-[11px] text-slate-400">{confidenceLabel(fieldMeta.title)}</span></dd></div>
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Email</dt><dd>{suggestions.email || '—'}<span className="ml-2 text-[11px] text-slate-400">{confidenceLabel(fieldMeta.email)}</span></dd></div>
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Phone</dt><dd>{suggestions.phone || '—'}<span className="ml-2 text-[11px] text-slate-400">{confidenceLabel(fieldMeta.phone)}</span></dd></div>
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Country</dt><dd>{suggestions.country || '—'}<span className="ml-2 text-[11px] text-slate-400">{confidenceLabel(fieldMeta.country)}</span></dd></div>
                    </dl>
                    {!hasSuggestions ? <p className="mt-3 text-xs text-slate-500">No suggestions yet. Generate suggestions or continue with manual review.</p> : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input value={confirmed.company} onChange={(event) => setConfirmed((current) => ({ ...current, company: event.target.value }))} placeholder="Confirmed company" required />
                    <input value={confirmed.contact} onChange={(event) => setConfirmed((current) => ({ ...current, contact: event.target.value }))} placeholder="Confirmed contact" />
                    <input value={confirmed.title} onChange={(event) => setConfirmed((current) => ({ ...current, title: event.target.value }))} placeholder="Confirmed job title" />
                    <input value={confirmed.email} onChange={(event) => setConfirmed((current) => ({ ...current, email: event.target.value }))} placeholder="Confirmed email" type="email" />
                    <input value={confirmed.phone} onChange={(event) => setConfirmed((current) => ({ ...current, phone: event.target.value }))} placeholder="Confirmed phone" />
                    <input value={confirmed.country} onChange={(event) => setConfirmed((current) => ({ ...current, country: event.target.value }))} placeholder="Confirmed country" />
                    <textarea value={operatorNotes} onChange={(event) => setOperatorNotes(event.target.value)} className="md:col-span-2" rows={4} placeholder="Operator notes about low-confidence fields, duplicates, or follow-up context" />
                  </div>
                </div>
              </DrawerSection>

              <DrawerSection title="Duplicate review and reference retention" description="Mark possible duplicates and preserve source metadata so downstream handoff stays merge-safe.">
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={duplicateDisposition} onChange={(event) => setDuplicateDisposition(event.target.value as 'new_contact' | 'possible_duplicate_review' | 'merge_later')}>
                    <option value="new_contact">Treat as net-new intake entry</option>
                    <option value="possible_duplicate_review">Flag as possible duplicate for review</option>
                    <option value="merge_later">Keep separate now, merge later</option>
                  </select>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={sourceImageRetained} onChange={(event) => setSourceImageRetained(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" />
                    <span>Retain source image/reference metadata for downstream review</span>
                  </label>
                  <textarea value={duplicateNotes} onChange={(event) => setDuplicateNotes(event.target.value)} className="md:col-span-2" rows={3} placeholder="Duplicate review notes, merge-safe instructions, or source-image reference context" />
                </div>
              </DrawerSection>

              <DrawerSection title="Qualification-ready staging and downstream prep" description="Decide whether this OCR entry is only intake, ready for qualification review, or held for more research before any lead conversion is allowed.">
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={qualificationDisposition} onChange={(event) => setQualificationDisposition(event.target.value as 'needs_followup_review' | 'qualification_ready' | 'hold_for_manual_research')}>
                    <option value="needs_followup_review">Needs follow-up review before qualification</option>
                    <option value="qualification_ready">Qualification-ready after review</option>
                    <option value="hold_for_manual_research">Hold for manual research</option>
                  </select>
                  <select value={leadConversionBoundary} onChange={(event) => setLeadConversionBoundary(event.target.value as 'intake_only' | 'prepare_for_qualification_queue' | 'do_not_convert_yet')}>
                    <option value="intake_only">Keep as intake only for now</option>
                    <option value="prepare_for_qualification_queue">Prepare for qualification queue review</option>
                    <option value="do_not_convert_yet">Do not convert to lead yet</option>
                  </select>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                    <input type="checkbox" checked={handoffPreparationReady} onChange={(event) => setHandoffPreparationReady(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" />
                    <span>Mark this entry as prepared for later downstream vCard/contact handoff review without automating that handoff now</span>
                  </label>
                  <textarea value={handoffPreparationNotes} onChange={(event) => setHandoffPreparationNotes(event.target.value)} className="md:col-span-2" rows={3} placeholder="Qualification-ready notes, lead-conversion boundary instructions, or downstream handoff preparation details" />
                </div>
              </DrawerSection>


              <DrawerSection title="Export issuance controls, rollback-safe visibility, and reconciliation" description="The third vCard/contact handoff build slice keeps single-contact issuance explicit, adds rollback-safe state changes after export visibility is recorded, and captures reconciliation notes without automating broader distribution.">
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={handoffTrigger} onChange={(event) => setHandoffTrigger(event.target.value as 'hold_for_review' | 'mark_export_ready')}>
                    <option value="hold_for_review">Hold for downstream vCard/contact handoff review</option>
                    <option value="mark_export_ready">Mark as export-ready for downstream handoff</option>
                  </select>
                  <select value={handoffDistributionScope} onChange={(event) => setHandoffDistributionScope(event.target.value as 'review_only' | 'single_contact_export_review')}>
                    <option value="review_only">Keep contact in review-only scope</option>
                    <option value="single_contact_export_review">Single-contact export review only</option>
                  </select>
                  <select value={handoffPackageProfile} onChange={(event) => setHandoffPackageProfile(event.target.value as 'basic_contact' | 'contact_plus_company' | 'contact_company_country')}>

                    <option value="basic_contact">Package: contact basics only</option>
                    <option value="contact_plus_company">Package: contact + company context</option>
                    <option value="contact_company_country">Package: contact + company + country</option>
                  </select>
                  <select value={handoffIssuanceControl} onChange={(event) => setHandoffIssuanceControl(event.target.value as 'export_ready_not_issued' | 'issue_single_contact_export' | 'rollback_after_export')} disabled={handoffTrigger !== 'mark_export_ready'}>
                    <option value="export_ready_not_issued">Issuance control: export-ready, not yet issued</option>
                    <option value="issue_single_contact_export">Issuance control: issue reviewed single-contact export</option>
                    <option value="rollback_after_export">Issuance control: roll back exported visibility to review</option>
                  </select>
                  <select value={handoffAuditState} onChange={(event) => setHandoffAuditState(event.target.value as 'hold_for_review' | 'export_ready_review' | 'exported_single_contact' | 'export_rolled_back_review')} disabled={handoffTrigger !== 'mark_export_ready'}>
                    <option value="hold_for_review">Audit state: hold for review</option>
                    <option value="export_ready_review">Audit state: export-ready review</option>
                    <option value="exported_single_contact">Audit state: exported single-contact handoff</option>
                    <option value="export_rolled_back_review">Audit state: export rolled back to review</option>
                  </select>
                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Completeness gate, issuance control, and rollback safety</p>
                    <p className="mt-1">Export-ready handoff requires a confirmed contact name plus either a confirmed email or phone, and the entry must already be marked as prepared for downstream handoff review. If that completeness falls back out, the handoff state automatically returns to review-only. Export issuance stays single-contact only, and any rollback after exported visibility must return distribution scope to review-only.</p>
                  </div>
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Reviewed contact package preview</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Always include confirmed contact name plus one confirmed email or phone.</li>
                      {handoffPackageProfile !== 'basic_contact' ? <li>Include confirmed company context for downstream handoff review.</li> : null}
                      {handoffPackageProfile === 'contact_company_country' ? <li>Include confirmed country to preserve trade-event routing context.</li> : null}
                      {handoffIssuanceControl === 'rollback_after_export' ? <li>Rollback resets the contact to review-only scope while preserving the audit trail.</li> : null}
                    </ul>
                  </div>
                  <textarea value={handoffExportEvidence} onChange={(event) => setHandoffExportEvidence(event.target.value)} className="md:col-span-2" rows={3} placeholder="Export evidence or exception note (review link, operator reference, or why the entry fell back to review-only)" />
                  <textarea value={handoffRollbackReason} onChange={(event) => setHandoffRollbackReason(event.target.value)} className="md:col-span-2" rows={3} placeholder="Rollback reason if exported visibility is being returned to review-only" />
                  <textarea value={handoffReconciliationNotes} onChange={(event) => setHandoffReconciliationNotes(event.target.value)} className="md:col-span-2" rows={3} placeholder="Downstream reconciliation notes that prepare later follow-up without automating broader distribution" />
                </div>
              </DrawerSection>

              <DrawerSection title="Audit-safe confirmation before save" description="This third handoff build slice keeps export issuance, rollback-safe state changes, and reconciliation explicit. Confirm OCR review first, then confirm any export-ready, exported, or rolled-back audit state separately before the intake entry is saved.">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={reviewConfirmed} onChange={(event) => { setReviewConfirmed(event.target.checked); if (!event.target.checked) setHandoffExportConfirmed(false); }} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" />
                  <span>I reviewed the suggested OCR fields, confirmed the final values, and want to save this as a trade-event intake entry.</span>
                </label>
                <label className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={handoffExportConfirmed} onChange={(event) => setHandoffExportConfirmed(event.target.checked)} disabled={handoffTrigger !== 'mark_export_ready'} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:opacity-50" />
                  <span>I explicitly confirm this entry is limited to single-contact downstream handoff review, that the reviewed package details are accurate, and that any exported state is being recorded only for audit visibility.</span>
                </label>
              </DrawerSection>
            </>
          )}
        </form>
      </RightDrawer>
    </>
  );
}
