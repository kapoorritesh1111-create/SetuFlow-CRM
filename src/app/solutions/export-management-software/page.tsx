export const metadata = {
  title: 'Export Management Software for Growing Trade Teams | SETU Flow CRM',
  description: 'SETU Flow helps exporters manage leads, buyers, quotes, documents, tasks, approvals, and order handoff from one export management workspace.',
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Export Management Software</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Export Management Software for Growing Trade Teams</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">SETU Flow helps exporters manage leads, buyers, quotes, documents, tasks, approvals, and order handoff from one export management workspace.</p>
        <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2"><li>Manage export sales follow-up and buyer communication.</li><li>Connect quotes, documents, tasks, and approvals in one workflow.</li><li>Support growing export teams that are moving beyond spreadsheets.</li><li>Keep sales and execution teams aligned from inquiry to order handoff.</li></ul>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">What is export management software?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Export management software helps trade teams organize export sales, buyer follow-up, quotations, documentation, approvals, tasks, and order handoff in a controlled workflow.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">Who should use SETU Flow for export management?</h2><p className="mt-2 text-sm leading-6 text-slate-600">SETU Flow is useful for exporters and import-export teams that need CRM, quote control, trade show lead capture, and execution visibility in one workspace.</p></article>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\"What is export management software?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Export management software helps trade teams organize export sales, buyer follow-up, quotations, documentation, approvals, tasks, and order handoff in a controlled workflow.\"}},{\"@type\":\"Question\",\"name\":\"Who should use SETU Flow for export management?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"SETU Flow is useful for exporters and import-export teams that need CRM, quote control, trade show lead capture, and execution visibility in one workspace.\"}}]}" }} />
    </main>
  );
}
