export const metadata = {
  title: 'Import Export CRM for Global Trade Teams | SETU Flow CRM',
  description: 'SETU Flow CRM helps importers, exporters, and global trade teams manage leads, quotes, documents, approvals, and shipment handoff in one operating workflow.',
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-hero border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Import Export CRM</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Import Export CRM for Global Trade Teams</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">SETU Flow CRM helps importers, exporters, and global trade teams manage leads, quotes, documents, approvals, and shipment handoff in one operating workflow.</p>
        <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2"><li>Track buyers, suppliers, and trade-show leads in one CRM.</li><li>Manage FOB, CIF, EXW, and DDP quote workflows.</li><li>Keep document readiness and order handoff connected to the sales pipeline.</li><li>Replace scattered spreadsheets with reviewable trade execution steps.</li></ul>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">What is an import export CRM?</h2><p className="mt-2 text-sm leading-6 text-slate-600">An import export CRM is a customer relationship system designed around global trade workflows such as buyer follow-up, supplier coordination, quote approvals, trade documents, and order handoff.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">How is SETU Flow different from a generic CRM?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Generic CRMs mainly track contacts and deals. SETU Flow focuses on trade execution after the lead is captured, including export quotes, approvals, documents, and operational readiness.</p></article>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\"What is an import export CRM?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"An import export CRM is a customer relationship system designed around global trade workflows such as buyer follow-up, supplier coordination, quote approvals, trade documents, and order handoff.\"}},{\"@type\":\"Question\",\"name\":\"How is SETU Flow different from a generic CRM?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Generic CRMs mainly track contacts and deals. SETU Flow focuses on trade execution after the lead is captured, including export quotes, approvals, documents, and operational readiness.\"}}]}" }} />
    </main>
  );
}
