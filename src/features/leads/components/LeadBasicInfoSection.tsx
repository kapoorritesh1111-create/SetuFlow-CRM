"use client";

import React from 'react';
import NewCountryForm from './NewCountryForm';
import { ContactScanTrigger } from '@/components/contact-exchange/contact-scan-trigger';
import Link from 'next/link';
import type { ContactPostApplyAssistResult } from '@/lib/contact-exchange/contact-post-apply-assist';

type TradeEvent = { id: string; name: string };
type Country = { id: string; name: string; phone_code: string | null };
type Market = { id: string; name: string };

interface LeadBasicInfoSectionProps {
  currentLeadId?: string;
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

function AssistCard({ assist }: { assist: ContactPostApplyAssistResult }) {
  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Post-apply assist</p>
          <h4 className="mt-2 text-base font-semibold text-slate-900">Guarded duplicate/contact-match suggestions</h4>
        </div>
        <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">{assist.lookupMode === 'live' ? 'Live CRM lookup' : 'Heuristic only'}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{assist.summary}</p>
      <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{assist.saveReadyReview}</div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[1.25rem] border border-white/80 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ranked possible matches</p>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">No auto-merge</span>
          </div>
          {assist.duplicateMatches.length ? (
            <div className="mt-3 space-y-3">
              {assist.duplicateMatches.map((match) => (
                <article key={match.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{match.companyName || 'Existing lead'}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{match.rankingLabel}</span>
                      </div>
                      <p className="mt-1 text-slate-600">{match.contactName || 'No contact name'}{match.email ? ` · ${match.email}` : ''}</p>
                      {match.phone ? <p className="mt-1 text-slate-500">{match.phone}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Match confidence</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{match.normalizedScore}/100</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${match.strength === 'strong' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{match.strength === 'strong' ? 'Review first' : 'Review manually'}</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Why it ranked here</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{match.primaryReason}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{match.recommendedAction}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.reasons.map((reason) => <span key={`${match.id}-${reason}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{reason}</span>)}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {match.actionItems.map((item) => <li key={`${match.id}-${item}`}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No close duplicate signal surfaced from the current scan. Final save still stays manual.</p>
          )}
        </div>

        <div className="space-y-4 rounded-[1.25rem] border border-white/80 bg-white/80 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Operator checklist</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {assist.operatorChecklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workflow handoff suggestions</p>
            <div className="mt-3 space-y-3">
              {assist.workflowHandoffSuggestions.map((suggestion) => (
                <article key={suggestion.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{suggestion.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${suggestion.readiness === 'ready_now' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{suggestion.readiness === 'ready_now' ? 'Ready after save' : 'Needs confirmation'}</span>
                  </div>
                  <p className="mt-2 leading-6">{suggestion.detail}</p>
                  <div className="mt-2 grid gap-2 text-[12px] text-slate-500 sm:grid-cols-2">
                    <p><strong className="text-slate-700">Timing:</strong> {suggestion.timing}</p>
                    <p><strong className="text-slate-700">Owner:</strong> {suggestion.recommendedOwner}</p>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500"><strong className="text-slate-700">Why:</strong> {suggestion.reason}</p>
                </article>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Suggested follow-up prompts</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {assist.followUpPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Guardrails</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {assist.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadBasicInfoSection({
  currentLeadId,
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
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(248,250,252,0.96))] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Global contact exchange</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Capture their contact without leaving Quick Add Lead</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Use the small scan trigger for upload or camera capture, then apply the one-screen review block back into this lead form.</p>
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
        <>
          <AssistCard assist={postApplyAssist} />
          <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Outbound handoff after save</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">Close the capture-to-share loop after the manual save</h4>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">The scan stays small and guarded here. After the lead is manually saved, reopen your premium vCard surface so the first outreach feels reciprocal, polished, and easy to continue.</p>
              </div>
              <Link href="/contact-exchange/vcard" className="inline-flex items-center rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                Open My Digital vCard
              </Link>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lead type</span>
          <select
            name="lead_type"
            value={leadType}
            onChange={(event) => setLeadType(event.target.value as 'buyer' | 'supplier')}
            className={inputClassName()}
          >
            <option value="buyer">Buyer</option>
            <option value="supplier">Supplier</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trade event</span>
          <select name="trade_event_id" value={tradeEventId} onChange={(event) => setTradeEventId(event.target.value)} className={inputClassName()}>
            <option value="">None</option>
            {tradeEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
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
            <button
              type="button"
              className="ml-2 text-[11px] font-medium text-brand-700 underline-offset-4 hover:underline"
              onClick={() => setShowNewCountryForm((v) => !v)}
            >
              {showNewCountryForm ? 'Cancel' : 'Add new'}
            </button>
          </span>
          <select value={countryId} onChange={(event) => setCountryId(event.target.value)} className={inputClassName()}>
            <option value="">None</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}{country.phone_code ? ` (${country.phone_code})` : ''}
              </option>
            ))}
          </select>
          {showNewCountryForm && (
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
              onCancel={() => {
                setNewCountryName('');
                setNewCountryIso2('');
                setNewCountryIso3('');
                setNewCountryPhone('');
                setNewCountryMarketId('');
                setShowNewCountryForm(false);
              }}
              onSave={onAddCountry}
            />
          )}
        </label>
      </div>

      <details className="group rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
          <span className="flex items-center justify-between gap-3">
            More contact fields
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 group-open:hidden">Show</span>
            <span className="hidden text-xs font-medium uppercase tracking-[0.14em] text-slate-500 group-open:inline">Hide</span>
          </span>
        </summary>
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
