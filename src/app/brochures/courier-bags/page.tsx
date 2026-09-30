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
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Tamper-evident closure', 'Self-seal courier bag format for dispatch and e-commerce.'],
            ['Custom sizing', 'Width, height and flap are captured manually per customer requirement.'],
            ['Document / POD options', 'Reference requirements and artwork can be shared directly in the sales conversation.'],
          ].map(([title, description], index) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-200">
                <div className="relative h-20 w-28 rounded border-2 border-slate-400 bg-white shadow-sm">
                  <div className="absolute inset-x-0 top-0 h-3 bg-slate-700" />
                  {index === 2 ? <div className="absolute bottom-3 left-3 h-8 w-14 rounded border border-slate-300 bg-slate-50" /> : null}
                </div>
              </div>
              <h2 className="mt-4 text-base font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
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
      </section>
    </main>
  );
}
