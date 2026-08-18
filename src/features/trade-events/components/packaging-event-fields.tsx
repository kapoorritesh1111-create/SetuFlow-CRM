'use client';

export function PackagingEventFields() {
  return <details className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
    <summary className="cursor-pointer text-sm font-black text-blue-900">Add packaging requirements · optional</summary>
    <p className="mt-2 text-xs font-semibold text-blue-800/70">Skip anything the visitor does not know yet.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <input name="packaging_product_type" className="min-h-11 rounded-xl border border-blue-100 bg-white px-3" placeholder="Pouch / roll stock / label" />
      <input name="packaging_application" className="min-h-11 rounded-xl border border-blue-100 bg-white px-3" placeholder="Application — spices, snacks…" />
      <input name="approximate_quantity" className="min-h-11 rounded-xl border border-blue-100 bg-white px-3" placeholder="Approx. quantity / month" />
      <select name="dimensions_status" defaultValue="unknown" className="min-h-11 rounded-xl border border-blue-100 bg-white px-3"><option value="unknown">Dimensions not known yet</option><option value="known">Dimensions known</option></select>
      <input name="dimensions" className="min-h-11 rounded-xl border border-blue-100 bg-white px-3" placeholder="Dimensions — if known" />
      <select name="artwork_status" defaultValue="unknown" className="min-h-11 rounded-xl border border-blue-100 bg-white px-3"><option value="unknown">Artwork unknown</option><option value="ready">Ready — can share</option><option value="preparing">Being prepared</option><option value="needs_help">Needs design help</option></select>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold"><input type="checkbox" name="sample_needed" value="1" />Sample needed</label>
    </div>
  </details>;
}
