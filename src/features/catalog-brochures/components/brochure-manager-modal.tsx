'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ChevronDown, FileText, FolderOpen, Plus, Upload, X } from 'lucide-react';

import { updateCatalogBrochure, uploadCatalogBrochure } from '@/features/catalog-brochures/server';
import type { CatalogBrochure } from '@/features/catalog-brochures/server';

type CategoryOption = {
  id: string;
  name: string;
  is_active: boolean | null;
};

type FamilyOption = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
};

type Notice = {
  tone: 'success' | 'error';
  message: string;
} | null;

type Props = {
  brochures: CatalogBrochure[];
  categories: CategoryOption[];
  families: FamilyOption[];
  initialOpen?: boolean;
};

function bytes(value: number | null) {
  if (!value) return '—';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function BrochureManagerModal({ brochures, categories, families, initialOpen = false }: Props) {
  const router = useRouter();
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState<'library' | 'upload'>(brochures.length ? 'library' : 'upload');
  const [notice, setNotice] = useState<Notice>(null);
  const [savingBrochureId, setSavingBrochureId] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const [updatePending, startUpdate] = useTransition();

  const activeCount = useMemo(() => brochures.filter((item) => item.is_active).length, [brochures]);
  const mappedCount = useMemo(() => brochures.filter((item) => item.family_ids.length > 0 || item.category_ids.length > 0).length, [brochures]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploadPending && !updatePending) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, uploadPending, updatePending]);

  function showManager(nextTab?: 'library' | 'upload') {
    setNotice(null);
    if (nextTab) setTab(nextTab);
    setOpen(true);
  }

  function closeManager() {
    if (uploadPending || updatePending) return;
    setNotice(null);
    setOpen(false);
  }

  function submitUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setNotice(null);
    startUpload(() => {
      void (async () => {
        try {
          await uploadCatalogBrochure(formData);
          uploadFormRef.current?.reset();
          setNotice({ tone: 'success', message: 'Brochure uploaded and available to your sales team.' });
          setTab('library');
          router.refresh();
        } catch (error) {
          setNotice({ tone: 'error', message: messageFromError(error, 'The brochure could not be uploaded. Please try again.') });
        }
      })();
    });
  }

  function submitUpdate(event: React.FormEvent<HTMLFormElement>, brochureId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setNotice(null);
    setSavingBrochureId(brochureId);
    startUpdate(() => {
      void (async () => {
        try {
          await updateCatalogBrochure(formData);
          setNotice({ tone: 'success', message: 'Brochure details updated.' });
          router.refresh();
        } catch (error) {
          setNotice({ tone: 'error', message: messageFromError(error, 'The brochure could not be updated. Please try again.') });
        } finally {
          setSavingBrochureId(null);
        }
      })();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => showManager()}
        className="group flex w-full flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-950">Brochures & catalogs</span>
          <span className="mt-1 block text-xs text-slate-500">Manage the PDFs your sales team can share with prospects and leads.</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            {brochures.length} {brochures.length === 1 ? 'brochure' : 'brochures'}
          </span>
          <span className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-slate-800">Manage library</span>
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="brochure-manager-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeManager();
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-hero border border-white/70 bg-white shadow-2xl">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Sales assets</p>
                <h2 id="brochure-manager-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Brochures & catalogs</h2>
                <p className="mt-1 text-sm text-slate-500">Keep your buyer-facing PDFs organized and ready for your sales team to share.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">{activeCount} active</span>
                <span className="hidden rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 sm:inline-flex">{mappedCount} matched</span>
                <button type="button" onClick={closeManager} disabled={uploadPending || updatePending} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50" aria-label="Close brochure manager">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button type="button" onClick={() => { setNotice(null); setTab('library'); }} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${tab === 'library' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <FolderOpen className="h-4 w-4" /> Library <span className={tab === 'library' ? 'text-white/70' : 'text-slate-400'}>{brochures.length}</span>
                </button>
                <button type="button" onClick={() => { setNotice(null); setTab('upload'); }} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${tab === 'upload' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <Plus className="h-4 w-4" /> Add brochure
                </button>
              </div>
            </div>

            {notice ? (
              <div className={`mx-6 mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                {notice.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span className="font-medium">{notice.message}</span>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {tab === 'library' ? (
                <section>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">Your brochure library</h3>
                      <p className="mt-1 text-xs text-slate-500">Open any brochure to update its name, availability, or product matches.</p>
                    </div>
                    <button type="button" onClick={() => { setNotice(null); setTab('upload'); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700">
                      <Upload className="h-4 w-4" /> Add brochure
                    </button>
                  </div>

                  {brochures.length ? (
                    <div className="space-y-3">
                      {brochures.map((brochure) => {
                        const mappingNames = [...brochure.category_names, ...brochure.family_names];
                        const saving = updatePending && savingBrochureId === brochure.id;
                        return (
                          <details key={brochure.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-slate-50">
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><FileText className="h-4 w-4" /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-slate-950">{brochure.name}</span>
                                <span className="mt-0.5 block text-[11px] text-slate-500">{brochure.file_name} · {bytes(brochure.file_size)}</span>
                              </span>
                              <span className="flex max-w-md flex-wrap justify-end gap-1">
                                {mappingNames.slice(0, 3).map((name) => <span key={name} className="rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[9px] font-semibold text-violet-700">{name}</span>)}
                                {mappingNames.length > 3 ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-500">+{mappingNames.length - 3}</span> : null}
                                {!mappingNames.length ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-500">General</span> : null}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${brochure.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{brochure.is_active ? 'Active' : 'Inactive'}</span>
                              <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                            </summary>

                            <form onSubmit={(event) => submitUpdate(event, brochure.id)} className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-4 lg:grid-cols-2">
                              <input type="hidden" name="id" value={brochure.id} />
                              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Brochure name
                                <input name="name" required defaultValue={brochure.name} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
                              </label>
                              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Availability
                                <span className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><input type="checkbox" name="is_active" defaultChecked={brochure.is_active} /> Available to sales</span>
                              </label>
                              <label className="grid gap-1.5 text-xs font-semibold text-slate-600 lg:col-span-2">Description
                                <textarea name="description" rows={2} defaultValue={brochure.description ?? ''} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
                              </label>

                              {categories.length ? (
                                <fieldset className="lg:col-span-2">
                                  <legend className="text-xs font-semibold text-slate-700">Product categories</legend>
                                  <p className="mt-1 text-[11px] text-slate-500">Choose the product matches where sales should see this brochure first.</p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {categories.map((category) => <label key={category.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"><input type="checkbox" name="category_ids" value={category.id} defaultChecked={brochure.category_ids.includes(category.id)} />{category.name}</label>)}
                                  </div>
                                </fieldset>
                              ) : null}

                              {families.length ? (
                                <fieldset className="lg:col-span-2">
                                  <legend className="text-xs font-semibold text-slate-700">Packaging families</legend>
                                  <p className="mt-1 text-[11px] text-slate-500">Choose the pouch or service families that best match this brochure.</p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {families.map((family) => <label key={family.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"><input type="checkbox" name="family_ids" value={family.id} defaultChecked={brochure.family_ids.includes(family.id)} />{family.name}</label>)}
                                  </div>
                                </fieldset>
                              ) : null}

                              <div className="flex justify-end lg:col-span-2">
                                <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
                              </div>
                            </form>
                          </details>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm"><FileText className="h-5 w-5" /></span>
                      <h4 className="mt-4 text-sm font-bold text-slate-950">No brochures yet</h4>
                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Add your first buyer-facing PDF and make it available to your sales team.</p>
                      <button type="button" onClick={() => setTab('upload')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" /> Add brochure</button>
                    </div>
                  )}
                </section>
              ) : (
                <section className="mx-auto max-w-4xl">
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-slate-950">Add brochure</h3>
                    <p className="mt-1 text-xs text-slate-500">Upload a PDF and choose where it should be recommended to your sales team.</p>
                  </div>

                  <form ref={uploadFormRef} onSubmit={submitUpload} encType="multipart/form-data" className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 lg:grid-cols-2">
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Brochure name
                      <input name="name" required placeholder="e.g. Stand-Up Pouches" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">PDF file
                      <span className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3"><input name="file" type="file" accept="application/pdf,.pdf" required className="w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700" /></span>
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600 lg:col-span-2">Description
                      <textarea name="description" rows={3} placeholder="A short description for your team" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
                    </label>

                    {categories.length ? (
                      <fieldset className="lg:col-span-2">
                        <legend className="text-xs font-semibold text-slate-700">Product categories</legend>
                        <p className="mt-1 text-[11px] text-slate-500">Choose the products this brochure is most relevant to.</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {categories.map((category) => <label key={category.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700"><input type="checkbox" name="category_ids" value={category.id} />{category.name}{category.is_active === false ? <span className="ml-auto text-[9px] text-slate-400">Inactive</span> : null}</label>)}
                        </div>
                      </fieldset>
                    ) : null}

                    {families.length ? (
                      <fieldset className="lg:col-span-2">
                        <legend className="text-xs font-semibold text-slate-700">Packaging families</legend>
                        <p className="mt-1 text-[11px] text-slate-500">Choose the pouch or service families this brochure covers.</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {families.map((family) => <label key={family.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700"><input type="checkbox" name="family_ids" value={family.id} />{family.name}{family.is_active === false ? <span className="ml-auto text-[9px] text-slate-400">Inactive</span> : null}</label>)}
                        </div>
                      </fieldset>
                    ) : null}

                    {!categories.length && !families.length ? <p className="text-xs text-slate-500 lg:col-span-2">You can upload this as a general brochure now and add product matches later.</p> : null}

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 lg:col-span-2"><input type="checkbox" name="is_active" value="true" defaultChecked /> Available to sales immediately</label>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 lg:col-span-2">
                      <p className="text-[11px] text-slate-500">PDF files up to 12 MB.</p>
                      <button type="submit" disabled={uploadPending} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
                        <Upload className="h-4 w-4" /> {uploadPending ? 'Uploading…' : 'Upload brochure'}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
