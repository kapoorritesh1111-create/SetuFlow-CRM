export type OrdersCommercialSourceItem8U = {
  quoteId: string;
  companyName: string;
  state: 'clean' | 'pdf_fallback' | 'needs_reconciliation' | 'missing';
  label: string;
  detail: string;
  pdfCount: number;
  quoteLineCount: number;
  expectedLineCount: number | null;
  approvedAt?: string | null;
};

function tone(state: OrdersCommercialSourceItem8U['state']) {
  if (state === 'clean') return 'green';
  if (state === 'pdf_fallback') return 'blue';
  if (state === 'needs_reconciliation') return 'amber';
  return 'red';
}

export function OrdersCommercialSourceSummary8U({ items }: { items: OrdersCommercialSourceItem8U[] }) {
  const attention = items.filter((item) => item.state !== 'clean');
  const cleanCount = items.length - attention.length;
  const visible = attention.length ? attention.slice(0, 4) : items.slice(0, 3);

  return (
    <section className="sf8u-wrap">
      <div className="sf8u-head">
        <div>
          <small>SPRINT 8U COMMERCIAL SOURCE CHECK</small>
          <h2>Approved PDF / quote snapshot reconciliation</h2>
          <p>Orders now shows whether the buyer-approved PDF/source is clean, missing, or needs historical quote-version reconciliation before buyer-facing order documents are generated.</p>
        </div>
        <div className="sf8u-stats">
          <span><b>{items.length}</b><small>orders checked</small></span>
          <span><b>{cleanCount}</b><small>clean</small></span>
          <span><b>{attention.length}</b><small>review</small></span>
        </div>
      </div>
      <div className="sf8u-grid">
        {visible.map((item) => (
          <article key={item.quoteId} className={`sf8u-card sf8u-${tone(item.state)}`}>
            <div>
              <small>{item.companyName}</small>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </div>
            <dl>
              <div><dt>PDF/source</dt><dd>{item.pdfCount}</dd></div>
              <div><dt>Loaded lines</dt><dd>{item.quoteLineCount}</dd></div>
              <div><dt>Expected</dt><dd>{item.expectedLineCount ?? '—'}</dd></div>
              <div><dt>Approved</dt><dd>{item.approvedAt ? 'Yes' : 'Review'}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <style jsx>{`
        .sf8u-wrap{margin:0 0 14px;background:white;border:1px solid #dbe7f3;border-radius:24px;padding:18px 20px;box-shadow:0 14px 34px #0f172a12;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}
        .sf8u-head{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start}.sf8u-head small,.sf8u-card small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.sf8u-head h2{margin:4px 0 0;color:#082f49}.sf8u-head p,.sf8u-card p{margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.5}.sf8u-stats{display:flex;gap:8px}.sf8u-stats span{min-width:92px;border:1px solid #dbe7f3;background:#f8fafc;border-radius:16px;padding:10px;text-align:center}.sf8u-stats b{display:block;font-size:20px;color:#082f49}.sf8u-stats small{display:block;color:#64748b;font-size:9px;letter-spacing:.1em}.sf8u-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.sf8u-card{border:1px solid #e2e8f0;border-left:4px solid #64748b;border-radius:18px;padding:14px;display:grid;grid-template-columns:1fr auto;gap:12px;background:#fff}.sf8u-green{border-left-color:#059669}.sf8u-blue{border-left-color:#2563eb}.sf8u-amber{border-left-color:#d97706}.sf8u-red{border-left-color:#dc2626}.sf8u-card h3{margin:3px 0 0;color:#082f49;font-size:15px}.sf8u-card dl{display:grid;grid-template-columns:repeat(2,80px);gap:6px;margin:0}.sf8u-card div div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:7px;text-align:center}.sf8u-card dt{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#64748b}.sf8u-card dd{margin:2px 0 0;font-size:13px;font-weight:900;color:#082f49}@media(max-width:1100px){.sf8u-head,.sf8u-grid,.sf8u-card{grid-template-columns:1fr}.sf8u-stats{flex-wrap:wrap}}
      `}</style>
    </section>
  );
}
