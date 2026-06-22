'use client';

import { useState } from 'react';
import type { ProductsSpreadsheetRow } from '@/types/products';
import { workspaceFieldSurfaceClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

function fileNameFromUrl(value: string | null | undefined) {
  if (!value) return 'No image URL saved';
  try {
    const parsed = new URL(value);
    return decodeURIComponent(parsed.pathname.split('/').filter(Boolean).at(-1) ?? value);
  } catch {
    return value.split('/').filter(Boolean).at(-1) ?? value;
  }
}

type Props = {
  row: ProductsSpreadsheetRow;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onActionBlocked?: (message: string) => void;
};

export function ProductImageEditor({ row, onClose, onSaved, onActionBlocked }: Props) {
  const [url, setUrl] = useState(row.image_url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveUrl(nextUrl: string | null) {
    const response = await fetch(`/api/products/${encodeURIComponent(row.product_id)}/image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: nextUrl }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Image update failed.');
  }

  async function uploadFile() {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`/api/products/${encodeURIComponent(row.product_id)}/image`, {
      method: 'PATCH',
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Image upload failed.');
  }

  async function commit(mode: 'url' | 'upload' | 'remove') {
    setSaving(true);
    try {
      if (mode === 'upload') await uploadFile();
      if (mode === 'url') await saveUrl(url.trim() || null);
      if (mode === 'remove') await saveUrl(null);
      await onSaved();
      onClose();
    } catch (error) {
      onActionBlocked?.(error instanceof Error ? error.message : 'Image update failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-600">Product image</div>
            <h3 className="mt-1 text-lg font-black text-slate-950">{row.product_name ?? 'Product'}</h3>
            <p className="mt-1 text-xs text-slate-500">Upload a product image or paste an external URL.</p>
          </div>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" onClick={onClose}>Close</button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[150px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <img src={`/api/products/${encodeURIComponent(row.product_id)}/image`} alt="" className="h-36 w-full object-cover" />
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-bold text-slate-900">Current file / URL</div>
              <div className="mt-1 break-all font-mono text-[11px]">{fileNameFromUrl(row.image_url)}</div>
              {row.image_url ? <div className="mt-1 break-all text-[11px] text-slate-400">{row.image_url}</div> : null}
            </div>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Paste image URL
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className={`mt-2 w-full rounded-xl px-3 py-2 text-sm ${workspaceFieldSurfaceClass}`} />
            </label>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Upload image file
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            {file ? <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Selected: {file.name}</div> : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button disabled={saving} className={`rounded-xl px-3 py-2 text-xs font-bold ${workspaceSecondaryButtonClass}`} onClick={() => void commit('remove')}>Remove image</button>
          <button disabled={saving} className={`rounded-xl px-3 py-2 text-xs font-bold ${workspaceSecondaryButtonClass}`} onClick={() => void commit('url')}>Save URL</button>
          <button disabled={saving || !file} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={() => void commit('upload')}>{saving ? 'Saving...' : 'Upload image'}</button>
        </div>
      </div>
    </div>
  );
}
