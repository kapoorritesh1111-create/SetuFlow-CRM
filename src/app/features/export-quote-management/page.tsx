export const metadata = {
  title: 'Export Quote Management Software | SETU Flow CRM',
  description: 'Create, review, and manage export quotations with product pricing, incoterms, approvals, and quote-to-order handoff built for trade teams.',
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-hero border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Export Quote Workflow</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Export Quote Management Software</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Create, review, and manage export quotations with product pricing, incoterms, approvals, and quote-to-order handoff built for trade teams.</p>
        <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2"><li>Support quote workflows for FOB, CIF, EXW, and DDP terms.</li><li>Keep pricing, approvals, and buyer follow-up connected.</li><li>Reduce rework from scattered spreadsheets and manual quote versions.</li><li>Move approved quotes toward order execution and shipment readiness.</li></ul>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">What is export quote management software?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Export quote management software helps trade teams create and control quotations with pricing, incoterms, approval steps, and order handoff.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">Why do exporters need quote workflow controls?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Export quotes often depend on freight, insurance, duties, payment terms, and approvals. A controlled workflow reduces mistakes before the quote reaches the buyer.</p></article>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\"What is export quote management software?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Export quote management software helps trade teams create and control quotations with pricing, incoterms, approval steps, and order handoff.\"}},{\"@type\":\"Question\",\"name\":\"Why do exporters need quote workflow controls?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Export quotes often depend on freight, insurance, duties, payment terms, and approvals. A controlled workflow reduces mistakes before the quote reaches the buyer.\"}}]}" }} />
    </main>
  );
}
