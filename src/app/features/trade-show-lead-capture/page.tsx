export const metadata = {
  title: 'Trade Show Lead Capture CRM for Exporters | SETU Flow CRM',
  description: 'Capture trade show leads, scan business cards, organize event contacts, and move export opportunities into follow-up workflows with SETU Flow CRM.',
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Trade Show Lead Capture</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Trade Show Lead Capture CRM for Exporters</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Capture trade show leads, scan business cards, organize event contacts, and move export opportunities into follow-up workflows with SETU Flow CRM.</p>
        <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2"><li>Capture business cards, QR contacts, and event leads quickly.</li><li>Tag leads by trade show, country, product interest, and follow-up stage.</li><li>Move captured contacts into buyer, supplier, quote, and task workflows.</li><li>Reduce post-event lead leakage after exhibitions and trade fairs.</li></ul>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">What is trade show lead capture for exporters?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Trade show lead capture for exporters is the process of collecting buyer, supplier, distributor, and partner contacts during exhibitions and moving them into structured CRM follow-up.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">Why use a CRM after a trade show?</h2><p className="mt-2 text-sm leading-6 text-slate-600">A CRM helps exporters avoid losing event leads by assigning follow-ups, tracking product interest, organizing contacts, and moving qualified opportunities toward quotes and orders.</p></article>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\"What is trade show lead capture for exporters?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Trade show lead capture for exporters is the process of collecting buyer, supplier, distributor, and partner contacts during exhibitions and moving them into structured CRM follow-up.\"}},{\"@type\":\"Question\",\"name\":\"Why use a CRM after a trade show?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"A CRM helps exporters avoid losing event leads by assigning follow-ups, tracking product interest, organizing contacts, and moving qualified opportunities toward quotes and orders.\"}}]}" }} />
    </main>
  );
}
