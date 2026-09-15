'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useSearchParams } from 'next/navigation';

type Signature = {
  fullName: string;
  phoneNumber: string;
  emailAddress: string;
  organizationName: string;
};

type ReasonOption = { value: string; label: string };
type AssigneeOption = { value: string; label: string; email?: string | null };

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function signatureText(signature: Signature | null) {
  if (!signature) return '';
  return [
    signature.fullName,
    signature.phoneNumber ? `Phone: ${signature.phoneNumber}` : '',
    signature.emailAddress ? `Email: ${signature.emailAddress}` : '',
    signature.organizationName,
  ].filter(Boolean).join('\n');
}

export function StarkInboundUxEnhancer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enabled = pathname === '/leads/inbound';
  const [signature, setSignature] = useState<Signature | null>(null);
  const [canFilterOwners, setCanFilterOwners] = useState(false);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [signatureHost, setSignatureHost] = useState<HTMLElement | null>(null);
  const [ownerHost, setOwnerHost] = useState<HTMLElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reasonOptions, setReasonOptions] = useState<ReasonOption[]>([]);
  const [reason, setReason] = useState('');
  const [missingInfo, setMissingInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const preview = useMemo(() => signatureText(signature), [signature]);
  const selectedOwner = clean(searchParams.get('owner'));

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void Promise.all([
      fetch('/api/profile/signature', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/interakt/assignees', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
    ]).then(([signaturePayload, assigneePayload]) => {
      if (!active) return;
      const next = signaturePayload?.signature;
      if (next?.fullName && next?.organizationName) setSignature(next as Signature);
      setCanFilterOwners(Boolean(assigneePayload?.canFilterOwners));
      setAssignees(Array.isArray(assigneePayload?.assignees) ? assigneePayload.assignees : []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const mountHosts = () => {
      const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea[name="message"]'));
      const textarea = textareas.find((item) => item.closest('form')?.querySelector('input[name="rowId"]')) ?? textareas[0];
      if (textarea) {
        let host = document.getElementById('setu-required-message-signature-host');
        if (!host || !document.body.contains(host)) {
          host = document.createElement('div');
          host.id = 'setu-required-message-signature-host';
          textarea.insertAdjacentElement('afterend', host);
        }
        if (signatureHost !== host) setSignatureHost(host);
      }

      const ownerInput = document.querySelector<HTMLInputElement>('input[name="owner"]');
      if (ownerInput) {
        const label = ownerInput.closest('label');
        if (label) {
          label.style.display = 'none';
          let host = document.getElementById('setu-owner-filter-host');
          if (!host || !document.body.contains(host)) {
            host = document.createElement('div');
            host.id = 'setu-owner-filter-host';
            label.insertAdjacentElement('afterend', host);
          }
          if (ownerHost !== host) setOwnerHost(host);
        }
      }
    };

    mountHosts();
    const observer = new MutationObserver(mountHosts);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled, ownerHost, signatureHost]);

  useEffect(() => {
    if (!enabled) return;

    const openCreateLeadModal = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const trigger = target?.closest<HTMLAnchorElement>('a[href="#create-lead"]');
      if (!trigger || trigger.closest('#create-lead')) return;

      const form = document.querySelector<HTMLFormElement>('#create-lead form');
      if (!form) return;
      event.preventDefault();
      event.stopPropagation();

      const overrideSelect = form.querySelector<HTMLSelectElement>('select[name="overrideReason"]');
      const options = overrideSelect
        ? Array.from(overrideSelect.options)
            .map((option) => ({ value: clean(option.value), label: clean(option.textContent) }))
            .filter((option) => option.value)
        : [];

      setReasonOptions(options);
      setReason('');
      setMissingInfo(Boolean(overrideSelect));
      setSubmitting(false);
      setModalOpen(true);
    };

    document.addEventListener('click', openCreateLeadModal, true);
    return () => document.removeEventListener('click', openCreateLeadModal, true);
  }, [enabled]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) setModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, submitting]);

  if (!enabled) return null;

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function confirmCreateLead() {
    const form = document.querySelector<HTMLFormElement>('#create-lead form');
    if (!form) return;
    const overrideSelect = form.querySelector<HTMLSelectElement>('select[name="overrideReason"]');
    if (overrideSelect) {
      if (!reason) return;
      overrideSelect.value = reason;
      overrideSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setSubmitting(true);
    setModalOpen(false);
    form.requestSubmit();
  }

  return (
    <>
      {signatureHost && preview ? createPortal(
        <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs text-slate-700">
          <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">Signature included when sent</div>
          <div className="whitespace-pre-line leading-5 text-slate-700">{preview}</div>
        </div>,
        signatureHost,
      ) : null}

      {ownerHost && canFilterOwners ? createPortal(
        <label className="text-[9px] font-bold uppercase text-slate-500">
          Owner
          <select key={selectedOwner || 'all'} name="owner" defaultValue={selectedOwner} className="mt-1 block min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs normal-case text-slate-900">
            <option value="">All assigned users</option>
            {assignees.map((assignee) => (
              <option key={clean(assignee.value || assignee.label)} value={clean(assignee.value || assignee.label)}>
                {assignee.email ? `${assignee.label} · ${assignee.email}` : assignee.label}
              </option>
            ))}
          </select>
        </label>,
        ownerHost,
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-lead-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Create Lead</p>
                <h2 id="create-lead-modal-title" className="mt-1 text-xl font-black text-slate-950">{missingInfo ? 'Why are we creating this Lead now?' : 'Create this Lead?'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {missingInfo
                    ? 'Required qualification information is still missing. Choose the business reason for moving this inquiry into the Lead pipeline now.'
                    : 'The required lead information is available. Setu Flow will run duplicate checking before creating the Lead.'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-500 hover:bg-slate-50" aria-label="Close">×</button>
            </div>

            {missingInfo ? (
              <label className="mt-5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                Reason required
                <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500">
                  <option value="">Select why this Lead should be created now</option>
                  {reasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={submitting || (missingInfo && !reason)} onClick={confirmCreateLead} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Creating…' : 'Create Lead'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
