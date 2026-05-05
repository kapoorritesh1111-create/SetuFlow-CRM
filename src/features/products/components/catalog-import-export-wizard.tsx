'use client';

import { useMemo, useState, useTransition } from 'react';

import RightDrawer from '@/components/RightDrawer';
import { buildCsvFromRecords, buildCsvTemplate, IMPORT_HEADERS, validateCsvImport, type ImportEntity } from '@/lib/import-export-templates';
import { calculatePricingHierarchy, PRICING_LEVEL_LABELS, type MarginMode, type PricingLevel } from '@/lib/pricing-hierarchy';
import { importCsvRows, savePricingCalculatorSnapshot } from '@/features/products/server/actions';
import type { ProductCategoryViewModel, ProductViewModel } from '@/features/products/view-model';

type Props = { products: ProductViewModel[]; categories: ProductCategoryViewModel[]; canManageCatalog?: boolean };

const entityLabels: Record<ImportEntity, string> = { products: 'Catalog / Products', categories: 'Categories', leads: 'Leads' };

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function numberValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildProductExportRows(products: ProductViewModel[]) {
  return products.map((product) => ({
    product_name: product.name,
    sku: product.skuCode ?? product.sku ?? '',
    category: product.rootCategoryName ?? product.categoryName ?? '',
    subcategory: product.categoryPath ?? '',
    description: product.description ?? '',
    unit: product.variants[0]?.unitOfMeasure ?? 'unit',
    currency: product.latestPriceCurrency ?? 'USD',
    base_cost: '',
    exw_price: '',
    fob_price: product.latestPrice ?? '',
    cif_price: '',
    ddp_price: '',
    distributor_price: '',
    retail_price: '',
    inland_transport_cost: '',
    export_customs_cost: '',
    port_handling_cost: '',
    freight_cost: '',
    insurance_cost: '',
    import_duty_percent: '',
    destination_charges: '',
    local_delivery_cost: '',
    distributor_margin_percent: '',
    retail_margin_percent: '',
    active_status: product.isActive ? 'active' : 'inactive',
  }));
}

function buildCategoryExportRows(categories: ProductCategoryViewModel[]) {
  return categories.map((category) => ({
    category_name: category.name,
    parent_category: category.parentId ? categories.find((item) => item.id === category.parentId)?.name ?? '' : '',
    description: category.pathLabel,
    active_status: category.isActive ? 'active' : 'inactive',
  }));
}

export function CatalogImportExportWizard({ products, categories, canManageCatalog = true }: Props) {
  const [drawer, setDrawer] = useState<'import' | 'pricing' | null>(null);
  const [entity, setEntity] = useState<ImportEntity>('products');
  const [csvText, setCsvText] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? '');
  const [startLevel, setStartLevel] = useState<PricingLevel>('exw');
  const [marginMode, setMarginMode] = useState<MarginMode>('markup');
  const [pricingDraft, setPricingDraft] = useState({
    startPrice: '20', currency: 'USD', inlandTransportCost: '1', exportCustomsCost: '0.5', portHandlingCost: '0.5', freightCost: '4', insuranceCost: '1', importDutyPercent: '8', destinationCharges: '1.5', localDeliveryCost: '1', distributorMarginPercent: '18', retailMarginPercent: '25',
  });

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId) ?? products[0] ?? null, [products, selectedProductId]);
  const validation = useMemo(() => (csvText.trim() ? validateCsvImport(entity, csvText) : null), [csvText, entity]);
  const blockingImportIssues = validation?.issues.filter((issue) => issue.severity === 'error') ?? [];
  const calculatorResult = useMemo(() => calculatePricingHierarchy({
    startLevel,
    startPrice: numberValue(pricingDraft.startPrice),
    currency: pricingDraft.currency,
    inlandTransportCost: numberValue(pricingDraft.inlandTransportCost),
    exportCustomsCost: numberValue(pricingDraft.exportCustomsCost),
    portHandlingCost: numberValue(pricingDraft.portHandlingCost),
    freightCost: numberValue(pricingDraft.freightCost),
    insuranceCost: numberValue(pricingDraft.insuranceCost),
    importDutyPercent: numberValue(pricingDraft.importDutyPercent),
    destinationCharges: numberValue(pricingDraft.destinationCharges),
    localDeliveryCost: numberValue(pricingDraft.localDeliveryCost),
    distributorMarginPercent: numberValue(pricingDraft.distributorMarginPercent),
    retailMarginPercent: numberValue(pricingDraft.retailMarginPercent),
    marginMode,
  }), [marginMode, pricingDraft, startLevel]);

  const handleTemplateDownload = (targetEntity: ImportEntity = entity) => downloadTextFile(`${targetEntity}-import-template.csv`, buildCsvTemplate(targetEntity));
  const handleExport = (targetEntity: ImportEntity) => {
    if (targetEntity === 'leads') { downloadTextFile('leads-import-template.csv', buildCsvTemplate('leads')); setMessage('Lead export needs the leads workspace dataset; downloaded the lead import template instead.'); return; }
    const rows = targetEntity === 'products' ? buildProductExportRows(products) : buildCategoryExportRows(categories);
    downloadTextFile(`${targetEntity}-export.csv`, buildCsvFromRecords(IMPORT_HEADERS[targetEntity], rows));
    setMessage(`${entityLabels[targetEntity]} export downloaded.`);
  };
  const handleApplyImport = () => {
    if (!validation || blockingImportIssues.length) return;
    const formData = new FormData();
    formData.set('entity', entity);
    formData.set('rows_json', JSON.stringify(validation.rows));
    startTransition(async () => {
      const result = await importCsvRows(undefined, formData);
      setMessage(result.error ?? `${result.success ?? 'Import completed.'} Inserted ${result.inserted ?? 0}, updated ${result.updated ?? 0}, skipped ${result.skipped ?? 0}.`);
      if (!result.error) setDrawer(null);
    });
  };
  const handleSaveCalculator = () => {
    if (!selectedProduct || !calculatorResult.ok) return;
    const formData = new FormData();
    formData.set('product_id', selectedProduct.id);
    formData.set('product_variant_id', selectedProduct.variants[0]?.id ?? '');
    formData.set('pricing_snapshot', JSON.stringify(calculatorResult));
    startTransition(async () => {
      const result = await savePricingCalculatorSnapshot(undefined, formData);
      setMessage(result.error ?? result.success ?? 'Pricing calculator results saved.');
      if (!result.error) setDrawer(null);
    });
  };
  const updatePricingDraft = (key: keyof typeof pricingDraft, value: string) => setPricingDraft((current) => ({ ...current, [key]: value }));

  return (
    <>
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Import / export + pricing engine</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Catalog upgrade command center</h2>
            <p className="mt-1 text-sm text-slate-600">Download CSV templates, validate imports before saving, and calculate EXW to Retail from any starting price.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDrawer('import')} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300" disabled={!canManageCatalog}>Import wizard</button>
            <button type="button" onClick={() => setDrawer('pricing')} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">Pricing calculator</button>
            <button type="button" onClick={() => handleExport('products')} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">Export products</button>
            <button type="button" onClick={() => handleExport('categories')} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">Export categories</button>
            <button type="button" onClick={() => handleTemplateDownload('leads')} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">Lead template</button>
          </div>
        </div>
        {message ? <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p> : null}
      </section>

      <RightDrawer open={drawer === 'import'} onClose={() => setDrawer(null)} title="CSV import/export wizard" widthClassName="sm:max-w-3xl lg:max-w-5xl">
        <div className="space-y-4 p-1">
          <div className="grid gap-3 md:grid-cols-3">{(['products', 'categories', 'leads'] as ImportEntity[]).map((item) => <button key={item} type="button" onClick={() => { setEntity(item); setCsvText(''); }} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${entity === item ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{entityLabels[item]}</button>)}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handleTemplateDownload(entity)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Download template</button>
            <button type="button" onClick={() => setCsvText(buildCsvTemplate(entity))} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Load sample</button>
            <button type="button" onClick={() => validation && downloadTextFile(`${entity}-import-errors.csv`, buildCsvFromRecords(['row','field','severity','message'], validation.issues))} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700" disabled={!validation?.issues.length}>Download error report</button>
          </div>
          <label className="block text-sm font-semibold text-slate-700">Paste CSV data or load a CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; file.text().then(setCsvText); }} className="block w-full rounded-2xl border border-slate-200 p-3 text-sm" />
          <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} className="min-h-[220px] w-full rounded-2xl border border-slate-200 p-4 font-mono text-xs" placeholder="Paste CSV here..." />
          {validation ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">Preview: {validation.rows.length} row(s), {blockingImportIssues.length} blocking issue(s)</p><div className="mt-3 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-full text-left text-xs"><thead className="bg-slate-100"><tr>{validation.headers.slice(0, 8).map((header) => <th key={header} className="px-3 py-2 font-semibold text-slate-600">{header}</th>)}</tr></thead><tbody>{validation.rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100">{validation.headers.slice(0, 8).map((header) => <td key={header} className="px-3 py-2 text-slate-700">{row[header]}</td>)}</tr>)}</tbody></table></div>{validation.issues.length ? <ul className="mt-3 space-y-1 text-xs text-rose-700">{validation.issues.slice(0, 8).map((issue, index) => <li key={index}>Row {issue.row} - {issue.field}: {issue.message}</li>)}</ul> : <p className="mt-3 text-xs text-emerald-700">Validation passed. Ready to import.</p>}</div> : null}
          <button type="button" onClick={handleApplyImport} disabled={!validation || Boolean(blockingImportIssues.length) || isPending || !canManageCatalog} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{isPending ? 'Importing...' : 'Apply validated import'}</button>
        </div>
      </RightDrawer>

      <RightDrawer open={drawer === 'pricing'} onClose={() => setDrawer(null)} title="Pricing calculator" widthClassName="sm:max-w-3xl lg:max-w-5xl">
        <div className="space-y-4 p-1"><div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Product<select value={selectedProduct?.id ?? ''} onChange={(event) => setSelectedProductId(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Starting level<select value={startLevel} onChange={(event) => setStartLevel(event.target.value as PricingLevel)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm">{Object.entries(PRICING_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Starting price<input value={pricingDraft.startPrice} onChange={(event) => updatePricingDraft('startPrice', event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-sm font-semibold text-slate-700">Currency<input value={pricingDraft.currency} onChange={(event) => updatePricingDraft('currency', event.target.value.toUpperCase())} maxLength={3} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-sm font-semibold text-slate-700">Margin mode<select value={marginMode} onChange={(event) => setMarginMode(event.target.value as MarginMode)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"><option value="markup">Markup: base x (1 + %)</option><option value="margin">Margin: base / (1 - %)</option></select></label>
        </div><div className="grid gap-3 md:grid-cols-3">{Object.keys(pricingDraft).filter((key) => !['startPrice','currency'].includes(key)).map((key) => <label key={key} className="text-xs font-semibold capitalize text-slate-600">{key.replace(/([A-Z])/g, ' $1')}<input value={pricingDraft[key as keyof typeof pricingDraft]} onChange={(event) => updatePricingDraft(key as keyof typeof pricingDraft, event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>)}</div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">Calculated hierarchy</p><div className="mt-3 grid gap-2 md:grid-cols-2">{Object.entries(calculatorResult.prices).map(([level, value]) => <div key={level} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"><span className="font-semibold text-slate-600">{PRICING_LEVEL_LABELS[level as PricingLevel]}</span><span className="font-bold text-slate-950">{value == null ? '-' : `${calculatorResult.currency} ${value.toFixed(2)}`}</span></div>)}</div>{calculatorResult.errors.length ? <ul className="mt-3 text-xs text-rose-700">{calculatorResult.errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}{calculatorResult.warnings.length ? <ul className="mt-3 text-xs text-amber-700">{calculatorResult.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}</div>
          <button type="button" onClick={handleSaveCalculator} disabled={!selectedProduct || !calculatorResult.ok || isPending || !canManageCatalog} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{isPending ? 'Saving...' : 'Save calculated prices to product record'}</button></div>
      </RightDrawer>
    </>
  );
}
