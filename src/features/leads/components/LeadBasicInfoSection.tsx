"use client";

import React from 'react';
import NewCountryForm from './NewCountryForm';
import { ContactScanTrigger } from '@/components/contact-exchange/contact-scan-trigger';
import type { ContactPostApplyAssistResult } from '@/lib/contact-exchange/contact-post-apply-assist';

type TradeEvent = { id: string; name: string; booth_number?: string | null };
type Country = { id: string; name: string; phone_code: string | null };
type Market = { id: string; name: string };

interface LeadBasicInfoSectionProps {
  currentLeadId?: string;
  guidedTrialCoach?: boolean;
  trialLeadSaved?: boolean;
  leadType: 'buyer' | 'supplier';
  setLeadType: (value: 'buyer' | 'supplier') => void;
  tradeEvents: TradeEvent[];
  companyName: string;
  setCompanyName: (value: string) => void;
  contactName: string;
  setContactName: (value: string) => void;
  jobTitle: string;
  setJobTitle: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  phoneSecondary: string;
  setPhoneSecondary: (value: string) => void;
  website: string;
  setWebsite: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  setSourceType: (value: string) => void;
  setSourceLabel: (value: string) => void;
  tradeEventId: string;
  setTradeEventId: (value: string) => void;
  companyInputRef: React.RefObject<HTMLInputElement>;
  inputClassName: () => string;
  countries: Country[];
  countryId: string;
  setCountryId: (value: string) => void;
  showNewCountryForm: boolean;
  setShowNewCountryForm: React.Dispatch<React.SetStateAction<boolean>>;
  markets: Market[];
  newCountryName: string;
  setNewCountryName: (value: string) => void;
  newCountryIso2: string;
  setNewCountryIso2: (value: string) => void;
  newCountryIso3: string;
  setNewCountryIso3: (value: string) => void;
  newCountryPhone: string;
  setNewCountryPhone: (value: string) => void;
  newCountryMarketId: string;
  setNewCountryMarketId: (value: string) => void;
  onAddCountry: () => void;
  postApplyAssist: ContactPostApplyAssistResult | null;
  setPostApplyAssist: React.Dispatch<React.SetStateAction<ContactPostApplyAssistResult | null>>;
  clearAfterSaveGuidance: () => void;
}

export default function LeadBasicInfoSection({
  currentLeadId,
  guidedTrialCoach = false,
  trialLeadSaved = false,
  leadType,
  setLeadType,
  tradeEvents,
  companyName,
  setCompanyName,
  contactName,
  setContactName,
  jobTitle,
  setJobTitle,
  email,
  setEmail,
  phone,
  setPhone,
  phoneSecondary,
  setPhoneSecondary,
  website,
  setWebsite,
  notes,
  setNotes,
  setSourceType,
  setSourceLabel,
  tradeEventId,
  setTradeEventId,
  companyInputRef,
  inputClassName,
  countries,
  countryId,
  setCountryId,
  showNewCountryForm,
  setShowNewCountryForm,
  markets,
  newCountryName,
  setNewCountryName,
  newCountryIso2,
  setNewCountryIso2,
  newCountryIso3,
  setNewCountryIso3,
  newCountryPhone,
  setNewCountryPhone,
  newCountryMarketId,
  setNewCountryMarketId,
  onAddCountry,
  postApplyAssist,
  setPostApplyAssist,
  clearAfterSaveGuidance,
}: LeadBasicInfoSectionProps) {
  const [sourceTypeState, setSourceTypeState] = React.useState(tradeEventId ? 'trade_show' : '');
  const isTradeShowSource = sourceTypeState === 'trade_show';
  const selectedEvent = tradeEvents.find((event) => event.id === tradeEventId) ?? null;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          {guidedTrialCoach ? (
            trialLeadSaved ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">Lead saved</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-emerald-900">Close this drawer to return to the queue, then open the lead from the Lead Command Center when ready.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Guided trial · Step 1</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-800">Create your first lead</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Scan a card, upload a file, or enter details manually. Choose Buyer or Supplier, add company and country, add one contact method, then save.</p>
              </div>
            )
          ) : null}
        </div>
        <ContactScanTrigger
          currentLeadId={currentLeadId}
          companyName={companyName}
          contactName={contactName}
          jobTitle={jobTitle}
          email={email}
          phone={phone}
          phoneSecondary={phoneSecondary}
          website={website}
          notes={notes}
          onApply={(draft, assist) => {
            setCompanyName(draft.companyName);
            setContactName(draft.contactName);
            setJobTitle(draft.jobTitle);
            setEmail(draft.email);
            setPhone(draft.phone);
            setPhoneSecondary(draft.phoneSecondary);
            setWebsite(draft.website);
            setNotes(draft.notes);
            setSourceType(draft.sourceType ?? 'contact_scan_upload');
            setSourceLabel(draft.sourceLabel ?? 'Quick entry contact scan');
            setPostApplyAssist(assist);
            clearAfterSaveGuidance();
          }}
        />
      </div>

      {postApplyAssist ? (
        <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Post-apply assist</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{postApplyAssist.summary}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lead type</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['buyer', 'supplier'] as const).map((type) => (
              <button key={type} type="button" onClick={() => setLeadType(type)} className={['rounded-2xl border px-4 py-3 text-left transition', leadType === type ? 'border-slate-900 bg-slate-900 text-white shadow-soft' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'].join(' ')}>
                <span className="block text-sm font-semibold">{type === 'buyer' ? 'Buyer' : 'Supplier'}</span>
                <span className={['mt-1 block text-xs', leadType === type ? 'text-slate-200' : 'text-slate-500'].join(' ')}>{type === 'buyer' ? 'Importing / purchasing' : 'Supplying / sourcing'}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="lead_type" value={leadType} />
        </div>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lead source</span>
          <select
            name="source_type"
            value={sourceTypeState}
            onChange={(event) => {
              const next = event.target.value;
              setSourceTypeState(next);
              setSourceType(next);
              if (next !== 'trade_show') setTradeEventId('');
            }}
            className={inputClassName()}
          >
            <option value="">Select source…</option>
            <option value="trade_show">Trade show</option>
            <option value="direct_inquiry">Direct inquiry</option>
            <option value="referral">Referral</option>
            <option value="linkedin">LinkedIn</option>
            <option value="website">Website</option>
            <option value="other">Other</option>
          </select>
        </label>

        {isTradeShowSource ? (
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event / source label</span>
            <select
              name="trade_event_id"
              value={tradeEventId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextEvent = tradeEvents.find((item) => item.id === nextId) ?? null;
                setTradeEventId(nextId);
                setSourceLabel(nextEvent?.name ?? '');
              }}
              className={inputClassName()}
            >
              <option value="">Select trade event…</option>
              {tradeEvents.map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
            {selectedEvent ? <p className="text-xs text-slate-500">Booth context comes from the selected event{selectedEvent.booth_number ? ` · Booth ${selectedEvent.booth_number}` : ''}.</p> : null}
          </label>
        ) : (
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event / source label</span>
            <input name="source_label" onChange={(event) => setSourceLabel(event.target.value)} className={inputClassName()} placeholder="e.g. referral, website, distributor intro" />
          </label>
        )}

        <label className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company name</span>
          <input ref={companyInputRef} name="company_name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} className={inputClassName()} required />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contact name</span>
          <input name="contact_name" value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClassName()} />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role / designation</span>
          <input name="job_title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className={inputClassName()} placeholder="e.g. Procurement Manager" />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</span>
          <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName()} />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone</span>
          <input name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClassName()} />
        </label>
        <label className="space-y-2">
          <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Country
            <button type="button" className="ml-2 text-[11px] font-medium text-brand-700 underline-offset-4 hover:underline" onClick={() => setShowNewCountryForm((v) => !v)}>{showNewCountryForm ? 'Cancel' : 'Add new'}</button>
          </span>
          <select name="country_id" value={countryId} onChange={(event) => setCountryId(event.target.value)} className={inputClassName()}>
            <option value="">None</option>
            {countries.map((country) => <option key={country.id} value={country.id}>{country.name}{country.phone_code ? ` (${country.phone_code})` : ''}</option>)}
          </select>
          {showNewCountryForm ? (
            <NewCountryForm
              markets={markets}
              newCountryName={newCountryName}
              setNewCountryName={setNewCountryName}
              newCountryIso2={newCountryIso2}
              setNewCountryIso2={setNewCountryIso2}
              newCountryIso3={newCountryIso3}
              setNewCountryIso3={setNewCountryIso3}
              newCountryPhone={newCountryPhone}
              setNewCountryPhone={setNewCountryPhone}
              newCountryMarketId={newCountryMarketId}
              setNewCountryMarketId={setNewCountryMarketId}
              inputClassName={inputClassName}
              onCancel={() => setShowNewCountryForm(false)}
              onSave={onAddCountry}
            />
          ) : null}
        </label>
      </div>

      <details className="group rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">More contact fields</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phone 2</span>
            <input name="phone_secondary" value={phoneSecondary} onChange={(event) => setPhoneSecondary(event.target.value)} className={inputClassName()} placeholder="Optional second number" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Website</span>
            <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} className={inputClassName()} placeholder="https://company.com" />
          </label>
        </div>
      </details>
    </section>
  );
}
