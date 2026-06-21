'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShareCatalogWizard } from '@/components/catalog/share-catalog-wizard';

type Share = { id: string; token: string; buyer_company: string | null; buyer_name: string | null; status: string; valid_until: string | null; use_count: number; selection_count: number; quote_id: string | null; created_at: string };
type Event = { id: string; catalog_share_id: string; event_type: string; product_id: string | null; meta: any; occurred_at: string };

const EVENT_LABEL: Record<string, string> = {
  share_created: 'Catalog share created',
  link_opened: 'Opened the catalog',
  product_viewed: 'Viewed a product',
  product_detail_opened: 'Opened product details',
  pdf_downloaded: 'Downloaded a document',
  product_selected: 'Selected products',
  product_removed: 'Removed a product',
  quote_requested: 'Requested a quote',
  question_submitted: 'Asked a question',
  quote_draft_created: 'Quote draft created',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}

export default function LeadCatalogActivity({ leadId, leadName }: { leadId: string; leadName?: string | null }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [prefill, setPrefill] = useState<any>(null);
  const [busyQuote, setBusyQuote] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, { summary: string; hottest: string[]; next_action: string; loading?: boolean }>>({});

  async function loadSummary(shareId: string) {
    setSummaries((m) => ({ ...m, [shareId]: { summary: '', hottest: [], next_action: '', loading: true } }));
    try {
      const r = await fetch(`/api/catalog-shares/${shareId}/guru-summary`, { method: 'POST' });
      const d = await r.json();
      setSummaries((m) => ({ ...m, [shareId]: { summary: d.summary ?? '', hottest: d.hottest ?? [], next_action: d.next_action ?? '', loading: false } }));
    } catch { setSummaries((m) => ({ ...m, [shareId]: { summary: 'Could not load summary.', hottest: [], next_action: '', loading: false } })); }
  }

  const NEXT_LABEL: Record<string, string> = { create_quote: 'Create quote', send_follow_up: 'Draft follow-up', resend_catalog: 'Resend catalog', switch_channel: 'Switch channel' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch(`/api/leads/${leadId}/catalog-activity`, { cache: 'no-store' }).then((r) => r.json());
      setShares(d.shares ?? []); setEvents(d.events ?? []); setProductNames(d.productNames ?? {});
    } finally { setLoading(false); }
  }, [leadId]);
  useEffect(() => { load(); }, [load]);

  async function openWizard() {
    // fetch full lead record for prefill
    try { const d = await fetch(`/api/leads-lite?id=${leadId}`, { cache: 'no-store' }).then((r) => r.json()); setPrefill(d.lead ?? { id: leadId, company_name: leadName ?? '' }); }
    catch { setPrefill({ id: leadId, company_name: leadName ?? '' }); }
    setWizardOpen(true);
  }

  async function createQuote(shareId: string) {
    setBusyQuote(shareId);
    const res = await fetch(`/api/catalog-shares/${shareId}/create-quote`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setBusyQuote(null);
    if (res.ok && d.quote_id) { window.location.href = `/quotes/${d.quote_id}`; }
    else if (d.quote_id) { window.location.href = `/quotes/${d.quote_id}`; }
    else { alert(d.error || 'Could not create quote.'); }
  }

  const tone: Record<string, { bg: string; fg: string }> = {
    active: { bg: '#ecfdf5', fg: '#059669' }, draft: { bg: '#f1f5f9', fg: '#475569' },
    expired: { bg: '#fef2f2', fg: '#dc2626' }, revoked: { bg: '#fef2f2', fg: '#dc2626' },
    archived: { bg: '#f8fafc', fg: '#94a3b8' },
  };

  return (
    <section className="rounded-3xl border border-slate-200 p-4 mt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Catalog activity</p>
          <p className="mt-1 text-sm text-slate-500">Shared catalogs and buyer engagement for this lead.</p>
        </div>
        <button onClick={openWizard} style={{ border: 'none', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Send Catalog</button>
      </div>

      <div className="mt-4">
        {loading ? <p className="text-sm text-slate-400">Loading…</p> : shares.length === 0 ? (
          <p className="text-sm text-slate-400">No catalog shared yet. Use “Send Catalog” to share a curated catalog with this buyer.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {shares.map((s) => {
              const st = tone[s.status] ?? tone.draft;
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/share/${s.token}`;
              return (
                <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13 }}>{s.buyer_company || 'Catalog share'}</strong>
                    <span style={{ background: st.bg, color: st.fg, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{s.status}</span>
                    {s.quote_id && <span style={{ background: '#eef2ff', color: '#1f487c', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>Quote created</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>{s.use_count} opens · {s.selection_count} selected</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <a href={url} target="_blank" rel="noreferrer" style={{ border: '1px solid #dbe6ef', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#475569', textDecoration: 'none' }}>View share</a>
                    {!s.quote_id && s.status !== 'archived' && s.selection_count > 0 && (
                      <button onClick={() => createQuote(s.id)} disabled={busyQuote === s.id} style={{ border: 'none', background: '#1f487c', color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: busyQuote === s.id ? 0.6 : 1 }}>{busyQuote === s.id ? 'Creating…' : 'Create quote'}</button>
                    )}
                    {s.quote_id && <a href={`/quotes/${s.quote_id}`} style={{ border: '1px solid #c7d2fe', background: '#eef2ff', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#1f487c', textDecoration: 'none' }}>Open quote</a>}
                    <button onClick={() => loadSummary(s.id)} style={{ border: '1px solid #d6e4ee', background: 'linear-gradient(135deg,rgba(31,72,124,.08),rgba(39,148,145,.08))', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#1f487c', cursor: 'pointer' }}>✨ AI summary</button>
                  </div>
                  {summaries[s.id] && (
                    <div style={{ marginTop: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                      {summaries[s.id].loading ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Setu Guru is analyzing engagement…</span> : (
                        <>
                          <div style={{ fontSize: 12.5, color: '#334155' }}>{summaries[s.id].summary}</div>
                          {summaries[s.id].hottest.length > 0 && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Hottest: {summaries[s.id].hottest.join(', ')}</div>}
                          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {summaries[s.id].next_action === 'create_quote' && !s.quote_id && s.status !== 'archived' && s.selection_count > 0 && <button onClick={() => createQuote(s.id)} style={{ border: 'none', background: '#1f487c', color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Recommended: Create quote</button>}
                            {(summaries[s.id].next_action === 'send_follow_up' || summaries[s.id].next_action === 'switch_channel') && <button onClick={openWizard} style={{ border: '1px solid #1f487c', background: '#fff', color: '#1f487c', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Recommended: {NEXT_LABEL[summaries[s.id].next_action]}</button>}
                            {summaries[s.id].next_action === 'resend_catalog' && <button onClick={openWizard} style={{ border: '1px solid #1f487c', background: '#fff', color: '#1f487c', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Recommended: Resend catalog</button>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {events.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, margin: '4px 0 6px' }}>Engagement</p>
                <div style={{ display: 'grid', gap: 5 }}>
                  {events.slice(0, 12).map((e) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#279491', flexShrink: 0 }} />
                      <span>{EVENT_LABEL[e.event_type] ?? e.event_type}{e.product_id && productNames[e.product_id] ? ` — ${productNames[e.product_id]}` : ''}{e.event_type === 'question_submitted' && e.meta?.question ? `: “${e.meta.question}”` : ''}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#94a3b8' }}>{timeAgo(e.occurred_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ShareCatalogWizard open={wizardOpen} onClose={() => { setWizardOpen(false); load(); }} leadPrefill={prefill} />
    </section>
  );
}
