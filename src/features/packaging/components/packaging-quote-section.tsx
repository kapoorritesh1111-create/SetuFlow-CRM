'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  PackagingCalculationInput,
  PackagingPricingTemplate,
  PackagingSavedSpec,
  PackagingServiceFamily,
  QuoteOptionalCharge,
  QuoteOptionalChargeType,
} from '@/lib/packaging/types';
import { OPTIONAL_CHARGE_TYPES } from '@/lib/packaging/types';
import {
  addQuoteOptionalCharge,
  deletePackagingQuoteLine,
  deletePackagingSavedSpec,
  removeQuoteOptionalCharge,
  savePackagingSpec,
} from '@/features/packaging/server/actions';
import PackagingLineConfigurator from './packaging-line-configurator';
import PackagingProofPanel from './packaging-proof-panel';

/**
 * S24-SPEN-203 / S24-SPEN-208 — Packaging section inside the canonical Quote
 * Builder product step. Renders only for packaging-enabled organizations;
 * product quoting for every other organization is untouched.
 */

export type PackagingQuoteLineView = {
  id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  notes: string | null;
  packaging_family_id: string | null;
  packaging_template_id: string | null;
  input_snapshot_json: { input?: PackagingCalculationInput; spec_summary?: string; family_name?: string } | null;
  pricing_breakdown_json: { lead_time?: string | null; warnings?: string[] } | null;
};

type Props = {
  quoteId: string;
  leadId: string;
  families: PackagingServiceFamily[];
  templates: PackagingPricingTemplate[];
  packagingLines: PackagingQuoteLineView[];
  charges: QuoteOptionalCharge[];
  currency: string;
  locked?: boolean;
  savedSpecs?: PackagingSavedSpec[];
};

function money(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PackagingQuoteSection({ quoteId, leadId, families, templates, packagingLines, charges, currency, locked, savedSpecs = [] }: Props) {
  const router = useRouter();
  const [configuratorOpen, setConfiguratorOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<PackagingQuoteLineView | null>(null);
  const [reorderPrefill, setReorderPrefill] = useState<{ familyId: string | null; templateId: string | null; input: PackagingCalculationInput | null } | null>(null);
  const [chargeFormOpen, setChargeFormOpen] = useState(false);
  const [chargeType, setChargeType] = useState<QuoteOptionalChargeType>('freight');
  const [chargeLabel, setChargeLabel] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [savingSpecForLine, setSavingSpecForLine] = useState<string | null>(null);
  const [specNameDraft, setSpecNameDraft] = useState('');
  const [specError, setSpecError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const linesTotal = useMemo(
    () => packagingLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0),
    [packagingLines],
  );
  const chargesTotal = useMemo(() => charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0), [charges]);

  const openAdd = () => { setEditingLine(null); setReorderPrefill(null); setConfiguratorOpen(true); };
  const openEdit = (line: PackagingQuoteLineView) => { setEditingLine(line); setReorderPrefill(null); setConfiguratorOpen(true); };
  const openReorder = (spec: PackagingSavedSpec) => {
    setEditingLine(null);
    setReorderPrefill({ familyId: spec.family_id, templateId: spec.template_id, input: spec.input_snapshot_json?.input ?? null });
    setConfiguratorOpen(true);
  };

  const handleDeleteLine = (lineId: string) => {
    startTransition(async () => {
      await deletePackagingQuoteLine({ quoteId, leadId, lineId });
      router.refresh();
    });
  };

  const handleSaveSpec = (line: PackagingQuoteLineView) => {
    setSpecError(null);
    const name = specNameDraft.trim();
    if (!name) { setSpecError('Give this spec a name.'); return; }
    if (!line.packaging_family_id || !line.packaging_template_id || !line.input_snapshot_json?.input) {
      setSpecError('This line is missing spec details and cannot be saved.');
      return;
    }
    startTransition(async () => {
      const response = await savePackagingSpec({
        leadId,
        familyId: line.packaging_family_id!,
        templateId: line.packaging_template_id!,
        name,
        input: line.input_snapshot_json!.input!,
      });
      if (!response.ok) { setSpecError(response.error ?? 'Could not save this spec.'); return; }
      setSavingSpecForLine(null);
      setSpecNameDraft('');
      router.refresh();
    });
  };

  const handleDeleteSpec = (specId: string) => {
    startTransition(async () => {
      await deletePackagingSavedSpec(specId, leadId);
      router.refresh();
    });
  };

  const handleAddCharge = () => {
    setChargeError(null);
    const amount = Number(chargeAmount);
    const fallbackLabel = OPTIONAL_CHARGE_TYPES.find((option) => option.key === chargeType)?.label ?? 'Charge';
    startTransition(async () => {
      const response = await addQuoteOptionalCharge({
        quoteId,
        leadId,
        chargeType,
        label: chargeLabel.trim() || fallbackLabel,
        amount,
        currency,
      });
      if (!response.ok) { setChargeError(response.error ?? 'Could not add the charge.'); return; }
      setChargeFormOpen(false);
      setChargeLabel('');
      setChargeAmount('');
      router.refresh();
    });
  };

  const handleRemoveCharge = (chargeId: string) => {
    startTransition(async () => {
      await removeQuoteOptionalCharge({ chargeId, leadId });
      router.refresh();
    });
  };

  return (
    <section className="rounded-card border border-line bg-surface-1 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-content-primary">Custom Packaging Lines</h3>
          <p className="text-sm text-content-secondary">Configured from service families with live template pricing. Saved lines keep their calculation snapshot.</p>
          <Link href={`/leads/${leadId}/packaging-history`} className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline">View full order history for this client →</Link>
        </div>
        {!locked ? (
          <button onClick={openAdd} className="rounded-ctl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">+ Add packaging line</button>
        ) : null}
      </div>

      {packagingLines.length ? (
        <ul className="mt-3 divide-y divide-line rounded-ctl border border-line">
          {packagingLines.map((line) => {
            const summary = line.input_snapshot_json?.spec_summary ?? line.notes ?? 'Packaging line';
            const leadTime = line.pricing_breakdown_json?.lead_time ?? null;
            return (
              <li key={line.id} className="flex flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content-primary">{summary}</p>
                    <p className="text-xs text-content-muted">
                      {Number(line.quantity).toLocaleString()} pcs · {money(line.unit_price, line.currency)} / pc
                      {leadTime ? ` · ${leadTime}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-content-primary">{money(Number(line.quantity) * Number(line.unit_price), line.currency)}</p>
                    {!locked ? (
                      <>
                        <button onClick={() => { setSavingSpecForLine(savingSpecForLine === line.id ? null : line.id); setSpecNameDraft(summary === 'Packaging line' ? '' : summary); setSpecError(null); }} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-xs font-semibold text-content-primary">Save as spec</button>
                        <button onClick={() => openEdit(line)} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-xs font-semibold text-content-primary">Edit</button>
                        <button onClick={() => handleDeleteLine(line.id)} disabled={pending} className="rounded-ctl border border-danger-border bg-danger-bg px-3 py-1.5 text-xs font-semibold text-danger-fg disabled:opacity-50">Remove</button>
                      </>
                    ) : null}
                  </div>
                </div>
                {savingSpecForLine === line.id ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-ctl border border-line bg-surface-app p-2">
                    <input
                      value={specNameDraft}
                      onChange={(event) => setSpecNameDraft(event.target.value)}
                      placeholder="Spec name (e.g. client SKU or product name)"
                      className="min-w-[220px] flex-1 rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm"
                    />
                    <button onClick={() => handleSaveSpec(line)} disabled={pending} className="rounded-ctl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                    <button onClick={() => { setSavingSpecForLine(null); setSpecError(null); }} className="rounded-ctl border border-line bg-surface-1 px-3 py-1.5 text-xs font-semibold text-content-secondary">Cancel</button>
                    {specError ? <p className="w-full text-xs font-medium text-danger-fg">{specError}</p> : null}
                  </div>
                ) : null}
                <PackagingProofPanel quoteLineItemId={line.id} leadId={leadId} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-ctl bg-surface-2 px-3 py-2 text-sm text-content-secondary">No packaging lines yet. Add one to price custom sizes from your templates.</p>
      )}

      {packagingLines.length ? (
        <p className="mt-2 text-right text-sm font-semibold text-content-primary">Packaging lines subtotal: {money(linesTotal, currency)}</p>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-content-primary">Optional charges</h4>
            <p className="text-sm text-content-secondary">Shown separately from calculated line pricing. Suggested charges are never added automatically.</p>
          </div>
          {!locked ? (
            <button onClick={() => setChargeFormOpen((open) => !open)} className="rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm font-semibold text-content-primary">
              {chargeFormOpen ? 'Cancel' : '+ Add charge'}
            </button>
          ) : null}
        </div>

        {chargeFormOpen ? (
          <div className="mt-3 grid gap-3 rounded-ctl border border-line bg-surface-app p-3 sm:grid-cols-[180px_minmax(0,1fr)_140px_auto]">
            <label className="text-xs font-semibold text-content-primary">
              Type
              <select value={chargeType} onChange={(event) => setChargeType(event.target.value as QuoteOptionalChargeType)} className="mt-1 w-full rounded-ctl border border-line bg-surface-1 px-2 py-2 text-sm font-medium">
                {OPTIONAL_CHARGE_TYPES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-content-primary">
              Label
              <input value={chargeLabel} onChange={(event) => setChargeLabel(event.target.value)} placeholder={OPTIONAL_CHARGE_TYPES.find((option) => option.key === chargeType)?.label} className="mt-1 w-full rounded-ctl border border-line bg-surface-1 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-content-primary">
              Amount ({currency})
              <input type="number" inputMode="decimal" value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} className="mt-1 w-full rounded-ctl border border-line bg-surface-1 px-2 py-2 text-sm" />
            </label>
            <button onClick={handleAddCharge} disabled={pending} className="self-end rounded-ctl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
            {chargeError ? <p className="sm:col-span-4 rounded-ctl bg-danger-bg px-3 py-2 text-sm font-medium text-danger-fg">{chargeError}</p> : null}
          </div>
        ) : null}

        {charges.length ? (
          <ul className="mt-3 divide-y divide-line rounded-ctl border border-line">
            {charges.map((charge) => (
              <li key={charge.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-semibold text-content-primary">{charge.label}</p>
                  <p className="text-xs text-content-muted">{OPTIONAL_CHARGE_TYPES.find((option) => option.key === charge.charge_type)?.label ?? charge.charge_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-content-primary">{money(charge.amount, charge.currency)}</p>
                  {!locked ? (
                    <button onClick={() => handleRemoveCharge(charge.id)} disabled={pending} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-xs font-semibold text-content-secondary disabled:opacity-50">Remove</button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {charges.length ? (
          <p className="mt-2 text-right text-sm font-semibold text-content-primary">Optional charges subtotal: {money(chargesTotal, currency)}</p>
        ) : null}
      </div>

      {savedSpecs.length ? (
        <div className="mt-4 border-t border-line pt-4">
          <h4 className="text-sm font-bold text-content-primary">Saved specs for this client</h4>
          <p className="text-sm text-content-secondary">Reorder in one click — the exact spec is replayed into the configurator with current template rules.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {savedSpecs.map((spec) => (
              <li key={spec.id} className="flex items-center justify-between gap-2 rounded-ctl border border-line bg-surface-app p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content-primary">{spec.name}</p>
                  <p className="text-xs text-content-muted">
                    {spec.last_unit_price != null ? `Last: ${money(spec.last_unit_price, spec.last_currency ?? currency)} / pc` : 'Not yet priced'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!locked ? <button onClick={() => openReorder(spec)} className="rounded-ctl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">Reorder</button> : null}
                  <button onClick={() => handleDeleteSpec(spec.id)} disabled={pending} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-xs font-semibold text-content-muted disabled:opacity-50">✕</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <PackagingLineConfigurator
        open={configuratorOpen}
        onClose={() => { setConfiguratorOpen(false); router.refresh(); }}
        onSaved={() => { router.refresh(); }}
        families={families}
        templates={templates}
        quoteId={quoteId}
        leadId={leadId}
        initialFamilyId={editingLine?.packaging_family_id ?? reorderPrefill?.familyId ?? null}
        initialTemplateId={editingLine?.packaging_template_id ?? reorderPrefill?.templateId ?? null}
        initialInput={editingLine?.input_snapshot_json?.input ?? reorderPrefill?.input ?? null}
        lineId={editingLine?.id ?? null}
      />
    </section>
  );
}
