export const metadata = {
  title: 'Export Document Checklist for Import Export Teams | SETU Flow CRM',
  description: 'Use this export document checklist to organize invoice, packing, certificate, compliance, shipping, and payment documents before handoff.',
  alternates: { canonical: 'https://www.setuflowcrm.com/resources/export-document-checklist' },
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-hero border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Export Documents</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Export Document Checklist for Import Export Teams</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Use this export document checklist to organize invoice, packing, certificate, compliance, shipping, and payment documents before handoff.</p>
        <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2"><li>Track commercial invoice and packing list readiness.</li><li>Review certificates, compliance notes, and buyer requirements.</li><li>Connect missing documents to owners and next actions.</li><li>Use the checklist as an internal link target from compliance and order pages.</li></ul>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">What documents are usually needed for export shipments?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Common export documents include a commercial invoice, packing list, certificates, buyer or consignee details, shipping instructions, and payment or compliance records. Requirements vary by country, product, and buyer.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">Why add document checklists to an export CRM?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Document checklists help sales and operations teams keep missing documents visible before orders move to shipment handoff.</p></article>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\"What documents are usually needed for export shipments?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Common export documents include a commercial invoice, packing list, certificates, buyer or consignee details, shipping instructions, and payment or compliance records. Requirements vary by country, product, and buyer.\"}},{\"@type\":\"Question\",\"name\":\"Why add document checklists to an export CRM?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Document checklists help sales and operations teams keep missing documents visible before orders move to shipment handoff.\"}}]}" }} />
    </main>
  );
}
