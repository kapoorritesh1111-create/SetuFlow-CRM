const referenceImages = [
  "/brochures/courier-bags/reference-1",
];

export const metadata = {
  title: 'Courier Bags | Stark Packmate',
  description: 'Custom-dimension courier bags from Stark Packmate.',
};

export default function CourierBagsBrochurePage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <section className="bg-[#0B2440] px-5 py-12 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Stark Packmate</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Courier Bags</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            Custom dimensions for e-commerce, logistics and shipping requirements.
          </p>
          <div className="mt-7 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            Custom dimensions · Manual pricing
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-[minmax(0,520px)_1fr]">
          {referenceImages.map((src, index) => (
            <div key={src} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex aspect-square items-center justify-center bg-white p-4">
                <img src={src} alt={`Courier bag reference style ${index + 1}`} className="h-full w-full object-contain" />
              </div>
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-bold text-slate-800">Reference style {index + 1}</p>
                <p className="mt-1 text-[11px] text-slate-500">Final dimensions and construction are confirmed per requirement.</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">How to request</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Made to your required dimensions</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Share the dimensions and quantity you need. Stark Packmate will review the requirement and prepare pricing manually.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {['Width / height', 'Flap or closure requirement', 'Required quantity', 'Printing / artwork requirement'].map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{item}</div>
              ))}
            </div>
          </article>

          <aside className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.15em] text-cyan-300">Commercial process</p>
            <h2 className="mt-2 text-xl font-black">Manual pricing</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Courier Bags are currently handled as a custom product. There is no automated quotation matrix for this family yet.
            </p>
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-xs font-black uppercase tracking-[.15em] text-cyan-300">Artwork</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Send your logo or artwork in the chat. The Stark Packmate team can manage files and revisions through the artwork workflow.
              </p>
            </div>
          </aside>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">Stark Packmate · Courier Bags · Custom specification product</p>
      </section>
    </main>
  );
}
