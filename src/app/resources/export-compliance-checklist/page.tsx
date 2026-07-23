export const metadata = {
  title: 'Export Compliance Checklist for Trade Teams | SETU Flow CRM',
  description: 'Use this export compliance checklist to organize buyer details, product requirements, trade documents, approvals, and shipment readiness before orders move forward.',
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-hero border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Export Compliance Resource</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Export Compliance Checklist for Trade Teams</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Use this export compliance checklist to organize buyer details, product requirements, trade documents, approvals, and shipment readiness before orders move forward.</p>
        <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2"><li>Capture buyer, consignee, and destination-country requirements.</li><li>Track product, HS code, certification, and documentation readiness.</li><li>Connect compliance checks to quotes, orders, and shipment handoff.</li><li>Reduce missed steps before export execution begins.</li></ul>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">What should an export compliance checklist include?</h2><p className="mt-2 text-sm leading-6 text-slate-600">An export compliance checklist should include buyer and consignee details, destination-country requirements, product information, HS codes, certifications, trade documents, payment terms, and shipment readiness checks.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">How does SETU Flow support export compliance workflows?</h2><p className="mt-2 text-sm leading-6 text-slate-600">SETU Flow helps teams keep compliance-related tasks connected to leads, quotes, documents, approvals, and order handoff so steps are not lost in spreadsheets or email threads.</p></article>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\"What should an export compliance checklist include?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"An export compliance checklist should include buyer and consignee details, destination-country requirements, product information, HS codes, certifications, trade documents, payment terms, and shipment readiness checks.\"}},{\"@type\":\"Question\",\"name\":\"How does SETU Flow support export compliance workflows?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"SETU Flow helps teams keep compliance-related tasks connected to leads, quotes, documents, approvals, and order handoff so steps are not lost in spreadsheets or email threads.\"}}]}" }} />
    </main>
  );
}
