'use client';

import { useActionState, useState } from 'react';
import {
  updateAnnexureTermsAction,
  updateBankDetailsAction,
  updateExportDeclarationsAction,
  updatePageOneTermsAction,
  type TermsUpdateResult,
} from '@/features/admin/server/document-terms-actions';

const INIT: TermsUpdateResult = { ok: true };

/* ── tiny shared helpers ── */
function Field({ label, name, defaultValue, placeholder, type = 'text' }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; type?: string;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function SaveBtn({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}

function Result({ state }: { state: TermsUpdateResult }) {
  if (state.ok) return null;
  return (
    <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {state.error}
    </p>
  );
}

/* ── Compact / Annexure terms editor (textarea — one term per line) ── */
export function TermsEditor({
  profileId,
  kind,
  terms,
}: {
  profileId: string;
  kind: 'page_one' | 'annexure';
  terms: string[] | null;
}) {
  const action = kind === 'page_one' ? updatePageOneTermsAction : updateAnnexureTermsAction;
  const fieldName = kind === 'page_one' ? 'page_one_terms' : 'annexure_terms';
  const label = kind === 'page_one' ? 'Compact terms (page 1)' : 'Annexure terms';
  const [state, formAction, pending] = useActionState(action, INIT);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">
            {(terms ?? []).length} term{(terms ?? []).length !== 1 ? 's' : ''} — click to edit
          </p>
        </div>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form action={formAction} className="mt-2 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <input type="hidden" name="profile_id" value={profileId} />
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            One term per line
          </label>
          <textarea
            name={fieldName}
            rows={Math.max(6, (terms ?? []).length + 2)}
            defaultValue={(terms ?? []).join('\n')}
            placeholder={
              kind === 'page_one'
                ? 'Payment: 100% advance by TT\nIncoterms: FOB Mumbai\nValidity: 15 days from date of issue'
                : 'Force Majeure clause\nDispute resolution: Indian courts\nGoverning law: Laws of India'
            }
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-[10px] text-slate-400">Each non-empty line becomes one term bullet in the document.</p>
          <SaveBtn pending={pending} />
          {state.ok === false && <Result state={state} />}
          {state.ok === true && pending === false && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">✓ Saved</p>
          )}
        </form>
      )}
    </div>
  );
}

/* ── Bank details editor ── */
export function BankDetailsEditor({
  profileId,
  bankDetails,
  orgCountry,
}: {
  profileId: string;
  bankDetails: Record<string, unknown> | null;
  orgCountry: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateBankDetailsAction, INIT);
  const [open, setOpen] = useState(false);
  const bd = (bankDetails ?? {}) as Record<string, string>;
  const isIN = (orgCountry ?? '').toUpperCase() === 'IN';
  const filled = Object.values(bd).some((v) => String(v ?? '').trim().length > 0);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Bank details</p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">
            {filled ? 'Configured — click to edit' : 'Not configured — click to add bank details'}
          </p>
        </div>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form action={formAction} className="mt-2 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <input type="hidden" name="profile_id" value={profileId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bank name" name="bank_name" defaultValue={bd.bank_name} placeholder="State Bank of India" />
            <Field label="Account name" name="account_name" defaultValue={bd.account_name} placeholder="SETU Groups LLC" />
            <Field label="Account number" name="account_number" defaultValue={bd.account_number} />
            <Field label="Branch" name="branch" defaultValue={bd.branch} />
            <Field label="SWIFT / BIC code" name="swift_code" defaultValue={bd.swift_code} placeholder="SBINIUS..." />
            {isIN ? (
              <Field label="IFSC code" name="ifsc" defaultValue={bd.ifsc} placeholder="SBIN0001234" />
            ) : (
              <Field label="IBAN" name="iban" defaultValue={bd.iban} />
            )}
            <Field label="Currency" name="currency" defaultValue={bd.currency ?? 'USD'} placeholder="USD" />
            <Field label="Sort code (UK)" name="sort_code" defaultValue={bd.sort_code} placeholder="12-34-56" />
          </div>
          <SaveBtn pending={pending} />
          {state.ok === false && <Result state={state} />}
          {state.ok === true && pending === false && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">✓ Bank details saved</p>
          )}
        </form>
      )}
    </div>
  );
}

/* ── Export declarations editor ── */
export function ExportDeclarationsEditor({
  profileId,
  declarations,
  orgCountry,
}: {
  profileId: string;
  declarations: Record<string, unknown> | null;
  orgCountry: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateExportDeclarationsAction, INIT);
  const [open, setOpen] = useState(false);
  const dec = (declarations ?? {}) as Record<string, string>;
  const isIN = (orgCountry ?? '').toUpperCase() === 'IN';
  const isEU = ['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'PL'].includes((orgCountry ?? '').toUpperCase());
  const filled = Object.values(dec).some((v) => String(v ?? '').trim().length > 0);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Export declarations &amp; registrations</p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">
            {filled ? 'Configured — click to edit' : 'Not configured — click to add IEC/LUT/GSTIN etc.'}
          </p>
        </div>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form action={formAction} className="mt-2 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <input type="hidden" name="profile_id" value={profileId} />
          <div className="grid gap-3 sm:grid-cols-2">
            {isIN && (
              <>
                <Field label="IEC number" name="iec_number" defaultValue={dec.iec_number} placeholder="0123456789" />
                <Field label="LUT ARN" name="lut_arn" defaultValue={dec.lut_arn} placeholder="AD...-LUT-..." />
                <Field label="GSTIN" name="gstin" defaultValue={dec.gstin} placeholder="27AAAAA0000A1Z5" />
                <Field label="PAN" name="pan" defaultValue={dec.pan} placeholder="AAAAA0000A" />
                <Field label="AD Code" name="ad_code" defaultValue={dec.ad_code} />
                <Field label="RCMC number" name="rcmc_number" defaultValue={dec.rcmc_number} />
              </>
            )}
            {isEU && (
              <>
                <Field label="VAT number" name="vat_number" defaultValue={dec.vat_number} />
                <Field label="EORI number" name="eori_number" defaultValue={dec.eori_number} placeholder="DE12345678" />
              </>
            )}
            {!isIN && !isEU && (
              <>
                <Field label="VAT / Tax number" name="vat_number" defaultValue={dec.vat_number} />
                <Field label="EORI / Customs number" name="eori_number" defaultValue={dec.eori_number} />
                <Field label="IEC / Import-Export code" name="iec_number" defaultValue={dec.iec_number} />
              </>
            )}
          </div>
          <SaveBtn pending={pending} />
          {state.ok === false && <Result state={state} />}
          {state.ok === true && pending === false && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">✓ Export declarations saved</p>
          )}
        </form>
      )}
    </div>
  );
}
