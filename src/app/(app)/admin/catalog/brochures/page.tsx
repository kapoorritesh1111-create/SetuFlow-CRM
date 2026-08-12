import Link from 'next/link';

import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { listCatalogBrochures, updateCatalogBrochure, uploadCatalogBrochure } from '@/features/catalog-brochures/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

function bytes(value: number | null) {
  if (!value) return '—';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default async function CatalogBrochuresPage() {
  const { membership, organization } = await requireAdminWorkspace();
  if (!membership || !organization) return null;
  const db: any = await createClient();
  const [brochures, familiesResult, categoriesResult] = await Promise.all([
    listCatalogBrochures({ includeInactive: true }),
    db.from('packaging_service_families').select('id,name,slug,is_active').eq('organization_id', organization.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    db.from('product_categories').select('id,name,is_active').eq('organization_id', organization.id).order('name', { ascending: true }),
  ]);
  const families = (familiesResult.data ?? []) as Array<{ id: string; name: string; slug: string; is_active: boolean }>;
  const categories = (categoriesResult.data ?? []) as Array<{ id: string; name: string; is_active: boolean }>;
  const activeCount = brochures.filter((item) => item.is_active).length;
  const mappedCount = brochures.filter((item) => item.family_ids.length > 0 || item.category_ids.length > 0).length;

  return (
    <AdminSettingsShell active="categories" organizationName={organization.name}>
      <div className="border-b border-slate-200 bg-white px-5 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Catalog · Sales enablement</p>
            <h1 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">Brochures & catalogs</h1>
            <p className="mt-1 text-[11px] text-slate-500">Upload PDF brochures, map them to product categories or packaging families, and let sales share secure buyer links from inquiries and leads.</p>
          </div>
          <Link href="/admin/catalog" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Back to Catalog</Link>
        </div>
      </div>

      <div className="space-y-5 px-5 py-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="Brochures" value={String(brochures.length)} helper="uploaded" />
          <Metric label="Active" value={String(activeCount)} helper="available to sales" />
          <Metric label="Product mapped" value={String(mappedCount)} helper="recommended by context" />
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">How sales uses this</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Map a brochure to normal product categories, packaging service families, or both. Setu Flow can then recommend it while a salesperson replies to an inbound inquiry or works a converted lead. The customer receives an opaque Setu Flow link and does not need a CRM login.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Add brochure</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">Upload a PDF catalog</h2>
          </div>
          <form action={uploadCatalogBrochure} className="grid gap-4 lg:grid-cols-2" encType="multipart/form-data">
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">Brochure name<input name="name" required placeholder="e.g. Stand-Up Pouches" className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900" /></label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">PDF file<input name="file" type="file" accept="application/pdf,.pdf" required className="h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" /></label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-600 lg:col-span-2">Description<textarea name="description" rows={2} placeholder="Short buyer-facing description" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900" /></label>

            {categories.length ? <fieldset className="lg:col-span-2">
              <legend className="text-xs font-bold text-slate-600">Standard product categories</legend>
              <p className="mt-1 text-[11px] text-slate-400">Use this for any organization. A matching lead category can recommend the brochure.</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => <label key={category.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="category_ids" value={category.id} />{category.name}{!category.is_active ? <span className="ml-auto text-[9px] text-slate-400">Inactive</span> : null}</label>)}
              </div>
            </fieldset> : null}

            {families.length ? <fieldset className="lg:col-span-2">
              <legend className="text-xs font-bold text-slate-600">Packaging service families</legend>
              <p className="mt-1 text-[11px] text-slate-400">For packaging workspaces, map the brochure directly to pouch/service families.</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {families.map((family) => <label key={family.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="family_ids" value={family.id} />{family.name}{!family.is_active ? <span className="ml-auto text-[9px] text-slate-400">Inactive</span> : null}</label>)}
              </div>
            </fieldset> : null}

            {!categories.length && !families.length ? <p className="text-xs text-slate-400 lg:col-span-2">No product categories are configured yet. You can still upload a general brochure and map it later.</p> : null}
            <input type="hidden" name="is_active" value="true" />
            <div className="lg:col-span-2 flex justify-end"><button className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white">Upload brochure</button></div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-bold text-slate-950">Brochure library</h2><p className="mt-1 text-xs text-slate-500">Edit the title, mapping, or availability without replacing the PDF.</p></div>
          <div className="divide-y divide-slate-100">
            {brochures.map((brochure) => {
              const mappingNames = [...brochure.category_names, ...brochure.family_names];
              return <details key={brochure.id} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[10px] font-black text-rose-700">PDF</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-950">{brochure.name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{brochure.file_name} · {bytes(brochure.file_size)}</span></span>
                  <span className="flex flex-wrap justify-end gap-1">{mappingNames.map((name) => <span key={name} className="rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">{name}</span>)}{!mappingNames.length ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">General</span> : null}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${brochure.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{brochure.is_active ? 'Active' : 'Inactive'}</span>
                  <span className="text-xs font-bold text-slate-400 group-open:rotate-180">⌄</span>
                </summary>
                <form action={updateCatalogBrochure} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 lg:grid-cols-2">
                  <input type="hidden" name="id" value={brochure.id} />
                  <label className="grid gap-1 text-xs font-bold text-slate-600">Name<input name="name" required defaultValue={brochure.name} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" /></label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600">Status<span className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><input type="checkbox" name="is_active" defaultChecked={brochure.is_active} /> Available to sales</span></label>
                  <label className="grid gap-1 text-xs font-bold text-slate-600 lg:col-span-2">Description<textarea name="description" rows={2} defaultValue={brochure.description ?? ''} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                  {categories.length ? <fieldset className="lg:col-span-2"><legend className="text-xs font-bold text-slate-600">Mapped product categories</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <label key={category.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="category_ids" value={category.id} defaultChecked={brochure.category_ids.includes(category.id)} />{category.name}</label>)}</div></fieldset> : null}
                  {families.length ? <fieldset className="lg:col-span-2"><legend className="text-xs font-bold text-slate-600">Mapped packaging families</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{families.map((family) => <label key={family.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="family_ids" value={family.id} defaultChecked={brochure.family_ids.includes(family.id)} />{family.name}</label>)}</div></fieldset> : null}
                  <div className="lg:col-span-2 flex justify-end"><button className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-black text-white">Save brochure</button></div>
                </form>
              </details>;
            })}
            {!brochures.length ? <div className="px-5 py-10 text-center text-sm text-slate-500">No brochures uploaded yet. Add the first PDF above.</div> : null}
          </div>
        </section>
      </div>
    </AdminSettingsShell>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>;
}
