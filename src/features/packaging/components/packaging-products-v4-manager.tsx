'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  savePackagingProductFamilyV4,
  savePackagingProductQuoteOptionsV4,
  savePackagingProductVariationUxV4,
  uploadPackagingKldV4,
} from '@/features/packaging/server/pricing-v4-admin-ux-actions';

const YELLOW = 'rounded-lg border border-yellow-300 bg-yellow-50 px-2.5 py-2 text-sm text-slate-900 outline-none ring-yellow-200 focus:ring-2';
const GRAY = 'rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-600';
const PRIMARY = 'rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50';
const SECONDARY = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';

type PendingKld = { file: File; variationId: string; detected: string | null; exact: boolean };

function engineLabel(value: string | null | undefined) {
  if (value === 'sup_formula') return 'Formula pricing';
  if (value === 'matrix_per_frame') return 'Matrix pricing';
  return 'Not priced yet';
}
function setupLabel(value: string | null | undefined) {
  if (value === 'approved_sizes') return 'Approved sizes';
  if (value === 'custom_dimensions') return 'Custom dimensions';
  if (value === 'both') return 'Sizes + custom';
  return 'Setup needed';
}
function detectDimensions(fileName: string) {
  const normalized = fileName.toLowerCase().replace(/\s+/g, '').replace(/millimetres?|millimeters?/g, 'mm');
  const match = normalized.match(/w?(\d+(?:\.\d+)?)mm?[x×]h?(\d+(?:\.\d+)?)mm?/i)
    ?? normalized.match(/w?(\d+(?:\.\d+)?)[x×]h?(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}
function fmtNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '—';
}

export default function PackagingProductsV4Manager({ data }: { data: any }) {
  const router = useRouter();
  const families = data.families ?? [];
  const variations = data.variations ?? [];
  const templates = data.templates ?? [];
  const klds = data.klds ?? [];
  const [selectedId, setSelectedId] = useState<string>(families[0]?.id ?? 'new');
  const [tab, setTab] = useState<'overview' | 'sizes' | 'quote' | 'pricing'>('overview');
  const [pendingKlds, setPendingKlds] = useState<PendingKld[]>([]);
  const [uploading, startUpload] = useTransition();
  const [uploadMessage, setUploadMessage] = useState('');

  const family = families.find((item: any) => item.id === selectedId) ?? null;
  const familyVariations = useMemo(() => variations.filter((item: any) => item.family_id === selectedId), [variations, selectedId]);
  const familyTemplates = useMemo(() => templates.filter((item: any) => item.family_id === selectedId), [templates, selectedId]);
  const activeKlds = useMemo(() => klds.filter((item: any) => item.family_id === selectedId && item.is_active), [klds, selectedId]);
  const kldVariationIds = new Set(activeKlds.map((item: any) => String(item.product_variation_id ?? '')));
  const approvedSizes = familyVariations.filter((item: any) => item.approval_state === 'approved' && item.is_active);
  const kldCoverage = approvedSizes.filter((item: any) => kldVariationIds.has(String(item.id))).length;
  const pricingReady = familyTemplates.some((item: any) => item.status === 'published' && item.is_active);

  const selectFamily = (id: string) => {
    setSelectedId(id);
    setTab('overview');
    setPendingKlds([]);
    setUploadMessage('');
  };

  const chooseFiles = (files: FileList | null) => {
    if (!files || !family) return;
    const next: PendingKld[] = Array.from(files).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')).map((file) => {
      const dims = detectDimensions(file.name);
      const matches = dims ? familyVariations.filter((item: any) => Number(item.width_mm) === dims.width && Number(item.height_mm) === dims.height) : [];
      return {
        file,
        variationId: matches.length === 1 ? String(matches[0].id) : '',
        detected: dims ? `${dims.width} × ${dims.height} mm` : null,
        exact: matches.length === 1,
      };
    });
    setPendingKlds(next);
    setUploadMessage(next.length ? '' : 'No PDF files were selected.');
  };

  const uploadAssignedKlds = () => {
    if (!family) return;
    const assigned = pendingKlds.filter((item) => item.variationId);
    if (!assigned.length) { setUploadMessage('Match at least one PDF to a product size first.'); return; }
    startUpload(async () => {
      let saved = 0;
      const errors: string[] = [];
      for (const item of assigned) {
        const form = new FormData();
        form.set('family_id', family.id);
        form.set('product_variation_id', item.variationId);
        form.set('file', item.file);
        const response = await uploadPackagingKldV4(form);
        if (response.ok) saved += 1;
        else errors.push(`${item.file.name}: ${response.error ?? 'Upload failed'}`);
      }
      setUploadMessage(errors.length ? `${saved} uploaded. ${errors.join(' ')}` : `${saved} KLD${saved === 1 ? '' : 's'} uploaded and versioned.`);
      if (!errors.length) setPendingKlds([]);
      router.refresh();
    });
  };

  return <div className="space-y-4 pb-16">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Packaging Products</p><h2 className="mt-1 text-xl font-bold text-slate-950">What your sales team can quote</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Products own physical setup, approved sizes, quote questions and KLD drawings. Pricing recipes are built separately in Pricing Builder.</p></div>
        <Link href="/admin/packaging-templates" className={SECONDARY}>Open Pricing Builder →</Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {families.map((item: any) => {
          const itemVars = variations.filter((variation: any) => variation.family_id === item.id && variation.approval_state === 'approved' && variation.is_active);
          const itemKlds = klds.filter((file: any) => file.family_id === item.id && file.is_active && file.product_variation_id).length;
          const itemTemplates = templates.filter((template: any) => template.family_id === item.id);
          const ready = itemTemplates.some((template: any) => template.status === 'published' && template.is_active);
          return <button key={item.id} type="button" onClick={() => selectFamily(item.id)} className={`rounded-xl border p-4 text-left transition ${selectedId === item.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-slate-950">{item.name}</div><div className="mt-1 text-xs text-slate-500">{setupLabel(item.product_setup_mode)} · {engineLabel(item.pricing_engine_type)}</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ready ? 'Pricing ready' : 'Needs pricing'}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/80 p-2"><b className="block text-base text-slate-900">{itemVars.length}</b><span className="text-slate-500">approved sizes</span></div><div className="rounded-lg bg-white/80 p-2"><b className="block text-base text-slate-900">{itemKlds}</b><span className="text-slate-500">KLDs linked</span></div></div>
          </button>;
        })}
        <button type="button" onClick={() => selectFamily('new')} className={`rounded-xl border border-dashed p-4 text-left ${selectedId === 'new' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50'}`}><div className="font-bold text-slate-800">+ New Packaging Product</div><p className="mt-1 text-xs text-slate-500">Create the product first, then add sizes and pricing.</p></button>
      </div>
    </section>

    {selectedId === 'new' ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-bold text-slate-900">New Packaging Product</h3><ProductBasicsForm family={null} /></section> : family ? <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-4"><div className="mr-auto"><h3 className="text-lg font-bold text-slate-950">{family.name}</h3><p className="text-xs text-slate-500">{engineLabel(family.pricing_engine_type)} · {setupLabel(family.product_setup_mode)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pricingReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{pricingReady ? 'Pricing ready' : 'Pricing setup pending'}</span></div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pt-2">{([['overview','Overview'],['sizes','Sizes & KLDs'],['quote','Quote Options'],['pricing','Pricing']] as const).map(([key,label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${tab === key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}{key === 'sizes' ? ` (${approvedSizes.length})` : ''}</button>)}</div>
        <div className="p-5">
          {tab === 'overview' ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><ProductBasicsForm family={family} /><aside className="space-y-3"><Metric label="Approved sizes" value={approvedSizes.length} detail={family.product_setup_mode === 'custom_dimensions' ? 'Custom dimension product' : 'Available physical variations'} /><Metric label="KLD coverage" value={`${kldCoverage}/${approvedSizes.length || 0}`} detail="Current drawing linked to an approved size" /><Metric label="Pricing" value={pricingReady ? 'Ready' : 'Pending'} detail={familyTemplates.map((item:any) => item.name).join(', ') || 'No v4 recipe yet'} /></aside></div> : null}
          {tab === 'sizes' ? <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-slate-900">Approved sizes & KLD drawings</h4><p className="mt-1 text-sm text-slate-500">A KLD belongs to the physical product size. Replacing a KLD creates a new version; old quote snapshots keep the historical version.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{kldCoverage}/{approvedSizes.length} current KLDs</span></div>
            <div className="overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[minmax(100px,1fr)_110px_110px_120px_minmax(160px,1fr)_90px] gap-2 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase text-slate-500"><span>Size</span><span>Width</span><span>Height</span><span>Gusset</span><span>KLD</span><span>Status</span></div>{familyVariations.map((variation:any) => {const file=activeKlds.find((item:any)=>String(item.product_variation_id)===String(variation.id));return <details key={variation.id} className="border-t border-slate-200 first:border-t-0"><summary className="grid cursor-pointer grid-cols-[minmax(100px,1fr)_110px_110px_120px_minmax(160px,1fr)_90px] gap-2 px-3 py-3 text-sm hover:bg-slate-50"><span className="font-semibold text-slate-900">{variation.capacity_label || variation.name}</span><span>{fmtNumber(variation.width_mm)} mm</span><span>{fmtNumber(variation.height_mm)} mm</span><span>{Number(variation.bottom_gusset_each_mm || 0) ? `${fmtNumber(variation.bottom_gusset_each_mm)}+${fmtNumber(variation.bottom_gusset_each_mm)}` : '—'}</span><span>{file ? <span className="font-semibold text-emerald-700">PDF v{file.version} ✓</span> : <span className="text-amber-700">Needs KLD</span>}</span><span>{variation.approval_state}</span></summary><div className="grid gap-4 border-t border-slate-100 bg-slate-50/60 p-4 xl:grid-cols-[minmax(0,1fr)_320px]"><VariationForm variation={variation} familyId={family.id} /><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-bold uppercase text-slate-500">KLD drawing</div>{file ? <><div className="mt-2 font-semibold text-slate-900">{file.file_name}</div><div className="mt-1 text-xs text-slate-500">Version {file.version} · {file.file_size ? `${Math.round(Number(file.file_size)/1024)} KB` : 'PDF'}</div>{file.signed_url ? <a href={file.signed_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:underline">Open KLD ↗</a> : null}</> : <p className="mt-2 text-sm text-slate-500">No drawing linked yet.</p>}<form action={async (formData) => { const result = await uploadPackagingKldV4(formData); if (result.ok) router.refresh(); }} className="mt-4 space-y-2"><input type="hidden" name="family_id" value={family.id}/><input type="hidden" name="product_variation_id" value={variation.id}/><input type="file" name="file" accept="application/pdf,.pdf" required className="block w-full text-xs text-slate-600"/><button className={SECONDARY}>{file ? 'Upload new version' : 'Upload KLD'}</button></form></div></div></details>})}</div>
            <details className="rounded-xl border border-dashed border-yellow-300 bg-yellow-50/40 p-4"><summary className="cursor-pointer font-bold text-slate-800">+ Add Product Size</summary><div className="mt-4"><VariationForm variation={null} familyId={family.id}/></div></details>
            <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-slate-900">Bulk KLD upload</h4><p className="mt-1 text-sm text-slate-600">Choose multiple PDFs. SETU Flow proposes a size only when width × height in the filename is an exact match. Anything else stays unassigned for your review.</p></div><input type="file" accept="application/pdf,.pdf" multiple onChange={(event)=>chooseFiles(event.target.files)} className="max-w-xs text-xs text-slate-600"/></div>{pendingKlds.length ? <div className="mt-4 space-y-2">{pendingKlds.map((item,index)=><div key={`${item.file.name}-${index}`} className="grid gap-2 rounded-lg border border-blue-100 bg-white p-3 md:grid-cols-[minmax(220px,1fr)_140px_minmax(220px,1fr)] md:items-center"><div><div className="truncate text-sm font-semibold text-slate-900">{item.file.name}</div><div className="text-xs text-slate-500">{item.detected ? `Detected ${item.detected}` : 'No dimensions detected'}</div></div><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ${item.exact ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.exact ? 'Exact match' : 'Needs matching'}</span><select value={item.variationId} onChange={(event)=>setPendingKlds((current)=>current.map((row,i)=>i===index?{...row,variationId:event.target.value,exact:false}:row))} className={YELLOW}><option value="">Choose product size…</option>{familyVariations.map((variation:any)=><option key={variation.id} value={variation.id}>{variation.capacity_label || variation.name} · {variation.dimension_label}</option>)}</select></div>)}<div className="flex items-center gap-3 pt-2"><button type="button" onClick={uploadAssignedKlds} disabled={uploading} className={PRIMARY}>{uploading ? 'Uploading…' : 'Upload assigned KLDs'}</button><span className="text-xs text-slate-500">Unmatched PDFs are not uploaded or guessed.</span></div></div> : null}{uploadMessage ? <p className="mt-3 text-sm font-medium text-slate-700">{uploadMessage}</p> : null}</section>
          </div> : null}
          {tab === 'quote' ? <QuoteOptionsForm family={family} /> : null}
          {tab === 'pricing' ? <div className="space-y-3"><div><h4 className="font-bold text-slate-900">Pricing recipe</h4><p className="mt-1 text-sm text-slate-500">Packaging Products defines what is sold. Pricing Builder defines how this product is costed and sold.</p></div>{familyTemplates.length ? familyTemplates.map((template:any)=><div key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><div><div className="font-semibold text-slate-900">{template.name}</div><div className="text-xs text-slate-500">{engineLabel(template.calculation_engine_key)} · {template.status || 'draft'}</div></div><Link href="/admin/packaging-templates" className={SECONDARY}>Open recipe →</Link></div>) : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No Pricing Builder recipe is linked yet.</div>}</div> : null}
        </div>
      </section>
    </> : null}
  </div>;
}

function Metric({label,value,detail}:{label:string;value:string|number;detail:string}) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">{label}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>; }

function ProductBasicsForm({ family }: { family: any | null }) {
  return <form action={savePackagingProductFamilyV4} className="space-y-4"><input type="hidden" name="id" value={family?.id ?? ''}/><div><h4 className="font-bold text-slate-900">Product basics</h4><p className="mt-1 text-sm text-slate-500">Yellow fields are product setup values. Pricing rates do not belong here.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Product name<input name="name" defaultValue={family?.name ?? ''} required className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Slug<input name="slug" defaultValue={family?.slug ?? ''} placeholder="Auto from name" className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Product setup<select name="product_setup_mode" defaultValue={family?.product_setup_mode ?? 'both'} className={`${YELLOW} mt-1 w-full`}><option value="approved_sizes">Approved sizes</option><option value="custom_dimensions">Custom dimensions</option><option value="both">Approved sizes + custom</option></select></label><label className="text-xs font-semibold text-slate-600">Pricing method<select name="pricing_engine_type" defaultValue={family?.pricing_engine_type ?? 'service_formula'} className={`${YELLOW} mt-1 w-full`}><option value="sup_formula">Formula recipe</option><option value="matrix_per_frame">Matrix per frame</option><option value="service_formula">Service formula</option></select></label><label className="text-xs font-semibold text-slate-600">Default unit<input name="default_uom" defaultValue={family?.default_uom ?? family?.default_unit ?? 'pcs'} className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Sort order<input name="sort_order" type="number" min="0" defaultValue={family?.sort_order ?? 100} className={`${YELLOW} mt-1 w-full`}/></label></div><label className="block text-xs font-semibold text-slate-600">Description<textarea name="description" rows={3} defaultValue={family?.description ?? ''} className={`${YELLOW} mt-1 w-full`}/></label><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_active" defaultChecked={family?.is_active ?? true}/> Active product</label><button className={PRIMARY}>{family ? 'Save product' : 'Create product'}</button></form>;
}

function VariationForm({ variation, familyId }: { variation: any | null; familyId: string }) {
  return <form action={savePackagingProductVariationUxV4} className="space-y-3"><input type="hidden" name="id" value={variation?.id ?? ''}/><input type="hidden" name="family_id" value={familyId}/><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-600">Size / weight<input name="capacity_label" defaultValue={variation?.capacity_label ?? variation?.name ?? ''} placeholder="250gm" className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Variation name<input name="name" required defaultValue={variation?.name ?? ''} placeholder="250gm" className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Key<input name="variation_key" required defaultValue={variation?.variation_key ?? ''} placeholder="250g" className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Approval<select name="approval_state" defaultValue={variation?.approval_state ?? 'approved'} className={`${YELLOW} mt-1 w-full`}><option value="draft">Draft</option><option value="approved">Approved</option><option value="archived">Archived</option></select></label><label className="text-xs font-semibold text-slate-600">Width (mm)<input name="width_mm" type="number" min="0.001" step="0.001" required defaultValue={variation?.width_mm ?? ''} className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Height (mm)<input name="height_mm" type="number" min="0.001" step="0.001" required defaultValue={variation?.height_mm ?? ''} className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Bottom gusset each (mm)<input name="bottom_gusset_each_mm" type="number" min="0" step="0.001" defaultValue={variation?.bottom_gusset_each_mm ?? 0} className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">Display dimensions<div className={`${GRAY} mt-1`}>{variation?.dimension_label ?? 'Calculated on save'}</div></label></div><div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="is_active" defaultChecked={variation?.is_active ?? true}/> Active</label><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="is_quoteable" defaultChecked={variation?.is_quoteable ?? false}/> Available to Sales when recipe is published</label><label className="ml-auto text-xs font-semibold text-slate-600">Sort <input name="sort_order" type="number" min="0" defaultValue={variation?.sort_order ?? 100} className={`${YELLOW} ml-1 w-20`}/></label></div><button className={PRIMARY}>{variation ? 'Save size' : 'Add size'}</button></form>;
}

function QuoteOptionsForm({ family }: { family: any }) {
  const labels = Array.isArray(family.quote_time_inputs) ? family.quote_time_inputs.map((item:any)=>item.label).filter(Boolean).join('\n') : '';
  return <form action={savePackagingProductQuoteOptionsV4} className="max-w-3xl space-y-4"><input type="hidden" name="id" value={family.id}/><div><h4 className="font-bold text-slate-900">What Sales captures for this product</h4><p className="mt-1 text-sm text-slate-500">Keep product questions here. Pricing Builder uses the answers; it does not redefine them.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Product setup<select name="product_setup_mode" defaultValue={family.product_setup_mode ?? 'both'} className={`${YELLOW} mt-1 w-full`}><option value="approved_sizes">Approved sizes only</option><option value="custom_dimensions">Custom dimensions</option><option value="both">Approved sizes + custom</option></select></label><label className="text-xs font-semibold text-slate-600">Default unit<input name="default_uom" defaultValue={family.default_uom ?? family.default_unit ?? 'pcs'} className={`${YELLOW} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Default lead time<input name="default_lead_time" defaultValue={family.default_lead_time ?? ''} placeholder="e.g. 12–14 days" className={`${YELLOW} mt-1 w-full`}/></label></div><label className="block text-xs font-semibold text-slate-600">Quote questions <span className="font-normal text-slate-400">(one per line)</span><textarea name="quote_time_labels" rows={7} defaultValue={labels} placeholder={'Size\nQuantity\nConstruction\nPrinting\nExtras / zipper'} className={`${YELLOW} mt-1 w-full`}/></label><button className={PRIMARY}>Save quote options</button></form>;
}
